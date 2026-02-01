/**
 * Hosted MCP server over HTTP/SSE with login page.
 * When users enable the MCP server via URL, they get a login page to add auth; then MCP runs over Streamable HTTP.
 */

import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
// Resolve SDK CJS files; package is ESM-first so we load by direct path from dist/server
const sdkServerPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'server');
const sdkTypesPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'types.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createMcpExpressApp } = require(path.join(sdkServerPath, 'express.js'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StreamableHTTPServerTransport } = require(path.join(sdkServerPath, 'streamableHttp.js'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isInitializeRequest } = require(sdkTypesPath);

import {
  getSessionMiddleware,
  requireAuth,
  createBearerToken,
  getAuthFromSession,
} from './auth';
import { getLoginPage, getSuccessPage } from './loginPage';
import { createPaymentsMcpServer } from './mcpServer';
import type { SessionAuth } from '../types';

const MCP_PATH = '/mcp';
const SUCCESS_PATH = '/success';

export interface HostServerOptions {
  port?: number;
  host?: string;
  basePath?: string;
}

const transports: Record<string, InstanceType<typeof StreamableHTTPServerTransport>> = {};

function getServer() {
  return createPaymentsMcpServer();
}

export async function startHostServer(options: HostServerOptions = {}): Promise<{ port: number; url: string }> {
  // Render, Heroku, etc. set PORT; use MCP_HOST_PORT or 3100 otherwise
  const port =
    options.port ??
    parseInt(process.env.PORT ?? process.env.MCP_HOST_PORT ?? '3100', 10);
  const host =
    options.host ?? process.env.MCP_HOST_HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
  const basePath = options.basePath ?? '';

  const allowedHosts = [host, 'localhost', '127.0.0.1'];
  if (host === '0.0.0.0') {
    // Cloud: allow requests from any host (Render provides the public hostname)
    allowedHosts.push(process.env.RENDER_EXTERNAL_HOSTNAME ?? '*');
  }
  const app = createMcpExpressApp({ host, allowedHosts });
  app.use(cookieParser());
  app.use(getSessionMiddleware());

  const loginHtml = getLoginPage(basePath);
  const loginPagePath = basePath ? `${basePath}/` : '/';
  const requireAuthMiddleware = (req: Request, res: Response, next: NextFunction) =>
    requireAuth(req, res, next, loginHtml, loginPagePath);

  // Login page: when user visits the server URL they see this
  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html').send(loginHtml);
  });

  app.get('/login', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html').send(loginHtml);
  });

  // Auth: accept Coinbase username/email and password
  app.post('/auth/login', (req: Request, res: Response) => {
    const email = (req.body?.email ?? req.body?.username ?? '').trim();
    const password = (req.body?.password ?? '').trim();
    if (!email || !password) {
      const errorHtml = getLoginPage(basePath).replace(
        '</form>',
        '<p class="error">Please enter your Coinbase email/username and password.</p></form>'
      );
      res.status(400).setHeader('Content-Type', 'text/html').send(errorHtml);
      return;
    }
    const auth: SessionAuth = {
      email: email || undefined,
      password: password || undefined,
      loggedAt: Date.now(),
    };
    req.session!.auth = auth;
    const bearerToken = createBearerToken(auth);
    const successUrl = basePath ? `${basePath}${SUCCESS_PATH}` : SUCCESS_PATH;
    const mcpUrl = `${req.protocol}://${req.get('host') ?? `localhost:${port}`}${basePath}${MCP_PATH}`;
    const successHtml = getSuccessPage(basePath, mcpUrl, bearerToken);
    res.setHeader('Content-Type', 'text/html').send(successHtml);
  });

  // Success page (after login)
  app.get(SUCCESS_PATH, (req: Request, res: Response) => {
    const auth = getAuthFromSession(req.session);
    if (!auth) {
      res.redirect(basePath || '/');
      return;
    }
    const mcpUrl = `${req.protocol}://${req.get('host') ?? `localhost:${port}`}${basePath}${MCP_PATH}`;
    res.setHeader('Content-Type', 'text/html').send(getSuccessPage(basePath, mcpUrl));
  });

  // MCP POST: require auth, then handle Streamable HTTP
  const mcpPostHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    try {
      if (sessionId && transports[sessionId]) {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }
      if (!sessionId && req.body && isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid: string) => {
            transports[sid] = transport;
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) delete transports[sid];
        };
        const server = getServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }
      if (!sessionId) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Bad Request: missing mcp-session-id or invalid initialize' },
          id: null,
        });
        return;
      }
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32601, message: 'Session not found' },
        id: null,
      });
    } catch (err) {
      console.error('MCP POST error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null,
        });
      }
    }
  };

  app.post(MCP_PATH, requireAuthMiddleware, mcpPostHandler);

  // MCP GET: SSE stream
  const mcpGetHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  };
  app.get(MCP_PATH, requireAuthMiddleware, mcpGetHandler);

  // MCP DELETE: session termination
  const mcpDeleteHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    try {
      await transports[sessionId].handleRequest(req, res);
    } finally {
      delete transports[sessionId];
    }
  };
  app.delete(MCP_PATH, requireAuthMiddleware, mcpDeleteHandler);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const url = `http://${host}:${port}${basePath}`;
      console.log(`Payments MCP host: ${url}`);
      console.log(`  Login: ${url}`);
      console.log(`  MCP endpoint: ${url}${MCP_PATH}`);
      resolve({ port, url });
    });
    server.on('error', reject);
  });
}
