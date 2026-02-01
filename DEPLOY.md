# Deploying the MCP host server to Render

This repo ([Sara3/payments-mcp](https://github.com/Sara3/payments-mcp)) runs the HTTP/SSE MCP host (login page + MCP endpoint) on [Render](https://render.com) so users connect to a public URL instead of localhost.

**Repo:** [https://github.com/Sara3/payments-mcp](https://github.com/Sara3/payments-mcp)  
**Clone:** `git clone https://github.com/Sara3/payments-mcp.git`

---

## Do it (checklist)

1. **Deploy the app to Render** (Option A below). Note your service URL, e.g. `https://payments-mcp.onrender.com`.
2. **Create a Coinbase OAuth app**  
   Go to [Coinbase API settings](https://www.coinbase.com/settings/api) → create an OAuth2 app (or use [CDP Portal](https://portal.cdp.coinbase.com/)). Copy the **Client ID** and **Client Secret**.
3. **Set the redirect URI** in the Coinbase app to:  
   `https://YOUR-SERVICE-NAME.onrender.com/auth/callback`  
   (use your real Render URL, e.g. `https://payments-mcp.onrender.com/auth/callback`).
4. **In Render** → your service → **Environment** → add:
   - `MCP_SESSION_SECRET` = run `openssl rand -hex 32` and paste the result (Secret).
   - `COINBASE_CLIENT_ID` = paste Client ID from step 2.
   - `COINBASE_CLIENT_SECRET` = paste Client Secret from step 2 (Secret).
5. **Save** and let Render **redeploy**. After deploy, open your service URL → "Sign in with Coinbase" will send users to Coinbase to log in with their username and password.

---

## Deploy to Render (this fork)

### Option A: Connect repo and create Web Service (recommended)

1. **Open Render**  
   Go to [dashboard.render.com](https://dashboard.render.com) and sign in.

2. **New Web Service**  
   Click **New** → **Web Service**.

3. **Connect this repo**  
   - If GitHub isn’t connected, click **Connect account** and authorize Render.  
   - Under **Build and deploy from a Git repository**, select **Connect a repository**.  
   - Find and select **Sara3/payments-mcp** (or your fork’s name).  
   - Click **Connect**.

4. **Configure the service**

   | Field | Value |
   |--------|--------|
   | **Name** | `payments-mcp-host` (or any name) |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Runtime** | Node |
   | **Build Command** | `npm ci && npm run build` |
   | **Start Command** | `npm run start` |
   | **Instance Type** | Free (or paid) |

5. **Environment variables**  
   In **Environment** (or **Environment Variables**):

   | Key | Value | Type |
   |-----|--------|------|
   | `MCP_SESSION_SECRET` | A long random string (see below) | **Secret** |

   **Where do I get `MCP_SESSION_SECRET`?** You don’t get it from anywhere — you **generate** it. It’s used to sign session cookies. Generate one with:

   ```bash
   openssl rand -hex 32
   ```

   Copy the output (e.g. `a61435beb32e9ac8...`) and paste it as the value for `MCP_SESSION_SECRET` in Render. Choose **Secret** so it’s hidden.

   **Sign in with Coinbase (OAuth):** To validate users with their Coinbase account, add:

   | Key | Value | Type |
   |-----|--------|------|
   | `COINBASE_CLIENT_ID` | Your Coinbase OAuth app Client ID | **Secret** or plain |
   | `COINBASE_CLIENT_SECRET` | Your Coinbase OAuth app Client Secret | **Secret** |

   Create an OAuth app at [Coinbase Developer Portal](https://www.coinbase.com/settings/api) (or [CDP](https://portal.cdp.coinbase.com/)) and set the **redirect URI** to your deployed URL + `/auth/callback`, e.g. `https://payments-mcp.onrender.com/auth/callback`. If you omit these, users can still use the email/password fallback (no Coinbase validation).

   - Render sets `PORT` automatically; no need to add it.  
   - Click **Add** then **Save**.

6. **Deploy**  
   Click **Create Web Service**. Render will clone the repo, run the build, and start the app.

7. **Your URLs**  
   When the deploy finishes you’ll see something like:

   - **Login page:** `https://payments-mcp-host-xxxx.onrender.com`  
   - **MCP endpoint:** `https://payments-mcp-host-xxxx.onrender.com/mcp`

   Users open the login URL in a browser, sign in, then use the MCP URL (and optional Bearer token) in their MCP client.

---

### Option B: Use the Blueprint (render.yaml)

This repo includes a `render.yaml` that defines the Web Service.

1. In Render: **New** → **Blueprint**.
2. Connect the **Sara3/payments-mcp** repository.
3. Render will create a Web Service from the blueprint.
4. In the new service, go to **Environment** and add **MCP_SESSION_SECRET** (Secret) – the blueprint doesn’t set it. Then **Save** and redeploy if needed.

---

## After deploy

- **Login page:** `https://<your-service-name>.onrender.com`  
- **MCP endpoint:** `https://<your-service-name>.onrender.com/mcp`

Use HTTPS (not HTTP) in your MCP client.

---

## "Connection failed: Unauthorized" or 401 / 500

The MCP endpoint (`/mcp`) requires authentication. When you **enable** the tool, sign in with your **Coinbase account** (username and password):

1. **Open the login URL in a browser**  
   e.g. `https://your-service.onrender.com` (not `/mcp`).

2. **Sign in to Coinbase** – enter your Coinbase email/username and password. Click "Sign in to Coinbase".

3. **Copy the Bearer token** from the success page (the long string shown after “Use this token…”).

4. **Configure your MCP client** to send that token when connecting to `/mcp`:
   - If your client has an “Auth” or “Headers” setting, add: **Authorization: Bearer \<paste-token\>**.
   - Or use the client’s “Bearer token” / “API key” field if it has one for this server.

5. **Connect to the MCP URL**  
   e.g. `https://your-service.onrender.com/mcp`. The client will send the token and the connection should succeed.

If you connect to `/mcp` without logging in or without the Bearer token, the server returns 401 Unauthorized (some clients show this as “500 Unauthorized”).

## Notes

- **Free tier:** The service may spin down after inactivity; the first request after idle can be slow.
- **HTTPS:** Render serves over HTTPS; always use `https://` for the MCP URL in clients.
- **Session secret:** Always set `MCP_SESSION_SECRET` in production so session cookies are signed.
- **Fork:** Based on [coinbase/payments-mcp](https://github.com/coinbase/payments-mcp); this fork adds HTTP/SSE hosting and Render deploy support.
