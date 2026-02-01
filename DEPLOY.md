# Deploying the MCP host server to Render

This repo ([Sara3/payments-mcp](https://github.com/Sara3/payments-mcp)) runs the HTTP/SSE MCP host (login page + MCP endpoint) on [Render](https://render.com) so users connect to a public URL instead of localhost.

**Repo:** [https://github.com/Sara3/payments-mcp](https://github.com/Sara3/payments-mcp)  
**Clone:** `git clone https://github.com/Sara3/payments-mcp.git`

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
   | `MCP_SESSION_SECRET` | A long random string (e.g. from `openssl rand -hex 32`) | **Secret** |

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

## Notes

- **Free tier:** The service may spin down after inactivity; the first request after idle can be slow.
- **HTTPS:** Render serves over HTTPS; always use `https://` for the MCP URL in clients.
- **Session secret:** Always set `MCP_SESSION_SECRET` in production so session cookies are signed.
- **Fork:** Based on [coinbase/payments-mcp](https://github.com/coinbase/payments-mcp); this fork adds HTTP/SSE hosting and Render deploy support.
