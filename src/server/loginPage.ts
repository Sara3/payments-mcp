/**
 * HTML for the login and success pages shown when users connect to the hosted MCP server.
 */

export function getLoginPage(basePath: string): string {
  const action = basePath ? `${basePath}/auth/login` : '/auth/login';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payments MCP – Add your information</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
    }
    .card {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(71, 85, 105, 0.5);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.375rem;
      color: #cbd5e1;
    }
    input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      font-size: 1rem;
      border: 1px solid #475569;
      border-radius: 8px;
      background: #0f172a;
      color: #f1f5f9;
      margin-bottom: 1rem;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-weight: 500;
      color: #fff;
      background: #2563eb;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #1d4ed8; }
    button:active { background: #1e40af; }
    .error {
      font-size: 0.875rem;
      color: #f87171;
      margin-bottom: 1rem;
    }
    .hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Add your information</h1>
    <p class="subtitle">Add your API key and optional client credentials to use the Payments MCP server.</p>
    <form method="post" action="${action}">
      <label for="apiKey">API Key (or access token)</label>
      <input type="password" id="apiKey" name="apiKey" placeholder="Your API key or token" autocomplete="off" />
      <label for="clientId">Client ID (optional)</label>
      <input type="text" id="clientId" name="clientId" placeholder="Optional client ID" autocomplete="off" />
      <label for="clientSecret">Client Secret (optional)</label>
      <input type="password" id="clientSecret" name="clientSecret" placeholder="Optional client secret" autocomplete="off" />
      <button type="submit">Continue</button>
    </form>
    <p class="hint">Your information is stored in this browser session only and is used to authorize MCP requests.</p>
  </div>
</body>
</html>`;
}

export function getSuccessPage(
  basePath: string,
  mcpUrl: string,
  bearerToken?: string
): string {
  const tokenBlock =
    bearerToken &&
    `
    <p class="success">Paste this token in your MCP client when it asks for auth (e.g. Bearer token or API key field):</p>
    <code id="token">${bearerToken}</code>
    <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)">Copy token</button>
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payments MCP – Signed in</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
    }
    .card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(71, 85, 105, 0.5);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 600; }
    .subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .success { color: #4ade80; font-size: 0.875rem; margin-bottom: 1rem; }
    code {
      display: block;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 8px;
      font-size: 0.8125rem;
      word-break: break-all;
      margin-top: 0.5rem;
    }
    button {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover { background: #1d4ed8; }
    .hint { font-size: 0.75rem; color: #64748b; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You're signed in</h1>
    <p class="subtitle">Payments MCP is ready to use over HTTP/SSE.</p>
    <p class="success">Connect your MCP client to:</p>
    <code>${mcpUrl}</code>
    ${tokenBlock || ''}
    <p class="hint">Use the MCP URL above in your client.${bearerToken ? ' When the client asks for auth, paste the token above (Bearer token or API key).' : ' Your browser session is used for auth.'}</p>
  </div>
</body>
</html>`;
}
