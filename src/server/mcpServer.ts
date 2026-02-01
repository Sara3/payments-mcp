/**
 * MCP server instance for the hosted HTTP/SSE mode.
 * Exposes tools that use the authenticated session (e.g. for payments-mcp flows).
 */

import type { SessionAuth } from '../types';

import path from 'path';
const sdkServerPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs', 'server');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { McpServer: McpServerClass } = require(path.join(sdkServerPath, 'mcp.js'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const z = require('zod');

export function createPaymentsMcpServer(): InstanceType<typeof McpServerClass> {
  const server = new McpServerClass(
    {
      name: 'payments-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    }
  );

  server.setToolRequestHandlers();

  server.registerTool(
    'get_auth_status',
    {
      description:
        'Check whether the current session is authenticated and what auth method is in use.',
      inputSchema: z.object({}),
    },
    async (_args: Record<string, unknown>, extra: { auth?: SessionAuth }) => {
      const auth = extra?.auth;
      if (!auth) {
        return {
          content: [
            {
              type: 'text',
              text: 'Not connected to Coinbase. Open the MCP server URL in a browser and sign in with your Coinbase username and password.',
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Connected to Coinbase. Session age: ${Math.round((Date.now() - auth.loggedAt) / 1000)}s.`,
          },
        ],
      };
    }
  );

  return server as InstanceType<typeof McpServerClass>;
}
