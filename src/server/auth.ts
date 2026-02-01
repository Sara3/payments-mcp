/**
 * Session-based auth for the hosted MCP server.
 * When a user enables the MCP server via HTTP URL, they see a login page and credentials are stored in session.
 * MCP clients can use a Bearer token (shown after login) for API requests.
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import type { SessionAuth } from '../types';

declare module 'express-session' {
  interface SessionData {
    auth?: SessionAuth;
  }
}

const SESSION_SECRET =
  process.env.MCP_SESSION_SECRET || 'payments-mcp-host-secret-change-in-production';
const SESSION_NAME = 'payments-mcp.sid';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const tokenStore = new Map<string, { auth: SessionAuth; expiresAt: number }>();

export function getSessionMiddleware() {
  return session({
    name: SESSION_NAME,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_TTL_MS,
    },
  });
}

/** Create a Bearer token for MCP clients; store auth and return token. */
export function createBearerToken(auth: SessionAuth): string {
  const token = crypto.randomBytes(32).toString('base64url');
  tokenStore.set(token, { auth, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

/** Validate Bearer token and return auth if valid. */
export function validateBearerToken(token: string): SessionAuth | undefined {
  const entry = tokenStore.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) tokenStore.delete(token);
    return undefined;
  }
  return entry.auth;
}

/**
 * Middleware: require auth for MCP except the first initialize (so "add tool" connection check passes).
 * Once they enable the tool and use it, we require auth and return loginUrl so they can add their information.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  loginHtml: string,
  loginPageUrl: string = '/'
): void {
  const go = () => next();
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const auth = validateBearerToken(token);
    if (auth) {
      (req as Request & { auth?: SessionAuth }).auth = auth;
      go();
      return;
    }
  }
  if (req.session?.auth) {
    (req as Request & { auth?: SessionAuth }).auth = req.session.auth;
    go();
    return;
  }
  // Allow unauthenticated MCP handshake + tools/list so "add tool" connection check passes (initialize → initialized → tools/list).
  // Auth required when they enable and actually use a tool (e.g. tools/call).
  const method = req.body?.method;
  const allowUnauth =
    req.method === 'POST' &&
    req.path === '/mcp' &&
    (method === 'initialize' ||
      method === 'notifications/initialized' ||
      method === 'tools/list');
  if (allowUnauth) {
    go();
    return;
  }
  const loginUrl = `${req.protocol}://${req.get('host') ?? req.hostname}${loginPageUrl}`;
  // When user enables the tool and hits /mcp (e.g. in browser or client opens URL), redirect to login page
  if (req.method === 'GET' && req.path === '/mcp') {
    res.redirect(302, loginPageUrl);
    return;
  }
  // MCP client POST (API): return 401 JSON with loginUrl so client can open "add your information" page
  const wantsJson =
    req.path === '/mcp' ||
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json');
  if (wantsJson) {
    res.status(401).json({
      error: 'Unauthorized',
      message:
        'Sign in to your Coinbase account: open the link below and enter your Coinbase username and password. After signing in, paste the Bearer token from the success page into your MCP client if it asks for auth.',
      loginUrl,
    });
    return;
  }
  res.status(401).setHeader('Content-Type', 'text/html').send(loginHtml);
}

export function getAuthFromSession(
  sess: { auth?: SessionAuth } | undefined
): SessionAuth | undefined {
  return sess?.auth;
}
