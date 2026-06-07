# Deployment Guide

This project is a monorepo:

```txt
interview-hub/
  client/   # React/Vite frontend
  server/   # Express/Prisma backend
```

Deploy it as separate services:

- Database: Supabase Postgres with pgvector
- Backend: Render Web Service from `server/`
- Frontend: Netlify from `client/`
- AI: Ollama Cloud, or another reachable Ollama-compatible host

Do not commit real secrets. Keep `server/.env` local and put production secrets in Render.

## 1. Prepare GitHub

Use one GitHub repo for the whole project. Do not create separate repos for `client` and `server`.

```sh
git init
git remote add origin https://github.com/YOUR_USER/interview-hub.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

Before committing, confirm secret files are ignored:

```sh
git status --short
```

`server/.env` should not appear.

## 2. Supabase Database

Create a Supabase project and enable pgvector in the SQL editor:

```sql
create extension if not exists vector;
```

Use a connection string like this:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
```

If the password contains special characters, URL-encode them. Examples:

```txt
# -> %23
@ -> %40
: -> %3A
/ -> %2F
```

Run migrations locally once, or let Render run them during startup:

```sh
cd server
npx prisma migrate deploy
```

After migrations, Supabase Table Editor should show tables such as:

```txt
User
Document
DocumentChunk
ChatSession
Message
Question
Bookmark
TopicProgress
InterviewSession
```

## 3. Render Backend

Create a Render Web Service from the same GitHub repo.

### Standard Deployment (Free — No Code Playground)

Recommended settings:

```txt
Language: Node
Branch: main
Root Directory: server
Build Command: npm install
Start Command: npm run start:prod
```

If Render shows Docker by default, switch it to Node. Docker is not needed for the core app functions.

> **Playground note:** The code playground requires Docker. On Render's free Node plan, Docker is not available. The server automatically detects this at startup (`docker info` check) and returns a clear 503 message. All other features work normally. See section 8 below for playground deployment options.

### Docker Deployment (Paid — Full Playground)

To enable the code playground in production, upgrade to a **Render Docker Web Service** (Starter $7/mo+):

```txt
Language: Docker
Branch: main
Root Directory: server
Dockerfile Path: Dockerfile
```

**Note:** The `server/Dockerfile` will need Docker-in-Docker (DinD) support for playground execution. See playground deployment options in section 8.

### Environment Variables

Add these Render environment variables:

```env
NODE_ENV=production
PORT=5000
TRUST_PROXY=true
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
AUTH_SECRET=replace-with-at-least-32-random-characters
CORS_ORIGINS=https://temporary-placeholder.netlify.app
FRONTEND_URL=https://temporary-placeholder.netlify.app
ADMIN_EMAILS=masteroman1234@gmail.com
ALLOW_PASSWORD_AUTH=false

# GROQ (Primary AI chat — cloud, no hosting needed)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant

# Ollama (Local embeddings — only if you have an Ollama host)
# OLLAMA_BASE_URL=http://your-ollama-host:11434
# OLLAMA_API_KEY=
# EMBED_MODEL=nomic-embed-text

DATAFILES_PATH=./datafiles
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_CHUNKS=5
```

`CORS_ORIGINS` can temporarily use a placeholder until Netlify gives you the real frontend URL. Update it after Netlify deployment.
Use `ALLOW_PASSWORD_AUTH=false` when you only want real provider-verified Google/GitHub logins.

Sessions are stored in an HTTP-only cookie named `ih_token`. In production the cookie is marked `Secure`, so TLS must be active at Netlify/Render. The frontend checks `/api/auth/me` on load and treats the server cookie as the source of truth.

`ADMIN_EMAILS` is a comma-separated allowlist for superadmin accounts. The app defaults to `masteroman1234@gmail.com` if the env var is missing, but production should set it explicitly so admin access can be changed without a code deploy.

```env
ADMIN_EMAILS=first@example.com,second@example.com
```

The start script runs migrations automatically:

```sh
npm run start:prod
```

That script runs:

```sh
prisma migrate deploy && node index.js
```

The latest migrations add password reset tokens and editable roadmap items. Confirm Render logs show `prisma migrate deploy` succeeding after this change.

After Render deploys, verify:

```txt
https://YOUR_RENDER_APP.onrender.com/health
https://YOUR_RENDER_APP.onrender.com/api/status
```

For this deployment, the backend URL is:

```txt
https://interview-hub-nhmc.onrender.com
```

## 4. GROQ Setup

**GROQ** is the primary AI service for chat, code hints, and interview scoring. It runs in the cloud — no hosting needed.

1. Sign up at [groq.com](https://groq.com) and get an API key
2. Set these env vars in Render:

```env
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

### Status Endpoint

The navbar status indicator checks `GET /api/status` which returns `{"groq": "online"}`. The label shows **"Chatbot"** in the navbar.

### Ollama for Embeddings (Optional)

Ollama is used only for **document embeddings** (vector generation) in RAG mode. Chat and scoring use GROQ. If you have an Ollama host:

```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your-ollama-api-key
EMBED_MODEL=nomic-embed-text
```

Important: the Prisma schema stores embeddings as `vector(768)`, so use an embedding model that returns 768 dimensions.

If Ollama is not available, document ingestion and RAG search will be disabled but all other features (chat, topics, playground) work normally.

For local development, Ollama is still useful:

```bash
ollama pull nomic-embed-text
ollama serve
```

## 5. OAuth Login

OAuth login proves the user controls a real Google or GitHub account. Password signup only validates email format, so disable password auth in production if you do not want made-up email accounts:

```env
ALLOW_PASSWORD_AUTH=false
```

### GitHub OAuth App

Create a GitHub OAuth app in GitHub Developer Settings.

For local development:

```txt
Homepage URL: http://localhost:5173
Authorization callback URL: http://localhost:5173/api/auth/github/callback
```

For production behind Netlify:

```txt
Homepage URL: https://YOUR_NETLIFY_SITE.netlify.app
Authorization callback URL: https://YOUR_NETLIFY_SITE.netlify.app/api/auth/github/callback
```

Set these in Render:

```env
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_CALLBACK_URL=https://YOUR_NETLIFY_SITE.netlify.app/api/auth/github/callback
```

If a GitHub secret was pasted into chat, logs, or committed accidentally, rotate it in GitHub before production.

### Google OAuth Client

Create an OAuth 2.0 Client ID in Google Cloud Console.

Add authorized JavaScript origins:

```txt
http://localhost:5173
https://YOUR_NETLIFY_SITE.netlify.app
```

Add authorized redirect URIs:

```txt
http://localhost:5173/api/auth/google/callback
https://YOUR_NETLIFY_SITE.netlify.app/api/auth/google/callback
```

Set these in Render:

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=https://YOUR_NETLIFY_SITE.netlify.app/api/auth/google/callback
```

Also set:

```env
FRONTEND_URL=https://YOUR_NETLIFY_SITE.netlify.app
CORS_ORIGINS=https://YOUR_NETLIFY_SITE.netlify.app
```

## 6. Netlify Frontend

> **Note:** Your `netlify.toml` already has the correct proxy settings (see below).

Before deploying Netlify, update `netlify.toml` so redirects point to the Render backend:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR_RENDER_APP.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/health"
  to = "https://YOUR_RENDER_APP.onrender.com/health"
  status = 200
  force = true
```

For this deployment:

```toml
to = "https://interview-hub-nhmc.onrender.com/api/:splat"
to = "https://interview-hub-nhmc.onrender.com/health"
```

Commit and push the `netlify.toml` change:

```sh
git add netlify.toml
git commit -m "Configure Netlify backend proxy"
git push
```

Create a Netlify site from the same GitHub repo.

Use:

```txt
Branch: main
Base directory: client
Build command: npm run build
Publish directory: dist
Functions directory: leave blank
```

If Netlify displays the publish directory as `client/dist`, that is also okay when using the UI. The `netlify.toml` file uses `base = "client"` and `publish = "dist"`.

No Netlify env vars are required for the current setup. The frontend calls `/api`, and Netlify proxies those requests to Render.

## 7. Final CORS Update

After Netlify deploys, copy the real Netlify URL:

```txt
https://YOUR_NETLIFY_SITE.netlify.app
```

Update Render:

```env
CORS_ORIGINS=https://YOUR_NETLIFY_SITE.netlify.app
```

Then restart or redeploy the Render backend.

Users should open the Netlify URL, not the Render URL. Render is only the backend API.

## 8. Code Playground Deployment

The playground requires Docker to execute code in containers. Since Render's free Node plan has **no Docker daemon**, the server automatically detects this at startup and returns a clear 503 message.

### Option A: Upgrade Render to Docker Web Service ($7/mo)

Run the backend as a Docker Web Service on Render (Starter plan). The `server/Dockerfile` will need Docker-in-Docker (DinD) support:

```dockerfile
FROM docker:27-dind AS runtime
RUN apk add --no-cache nodejs npm docker-cli
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
CMD dockerd-entrypoint.sh &>/dev/null & \
    sleep 3 && \
    npx prisma migrate deploy && \
    node index.js
```

### Option B: Self-Host Piston on Oracle Cloud (Free)

[Piston](https://github.com/engineer-man/piston) is a dedicated code execution API. Deploy it on Oracle's free tier (4 cores, 24GB RAM):

```bash
# SSH into your Oracle VM, then:
git clone https://github.com/engineer-man/piston
cd piston
docker compose up -d
```

Then update `dockerService.js` to call your Oracle VM's Piston API instead of Docker.

### Option C: Graceful Fallback (Default)

When Docker is unavailable, the playground:
- Shows a friendly: *"Code execution is not available on this server."*
- Returns HTTP 503 with a clear message
- All other features (chat, topics, profile, admin) work normally

---

## 9. Smoke Test

Open the Netlify URL and test:

```txt
signup/login
dashboard
chat
status
document upload/search if used
```

Run local release checks before pushing:

```sh
cd server
npm test

cd ../client
npm run build
```

Direct backend checks:

```txt
https://YOUR_RENDER_APP.onrender.com/health
https://YOUR_RENDER_APP.onrender.com/api/status
```

## 10. Logs

Use these places when something breaks:

```txt
Frontend build errors:
Netlify dashboard -> Site -> Deploys -> latest deploy -> Deploy log

Frontend runtime errors:
Browser DevTools -> Console and Network tabs

Backend/API errors:
Render dashboard -> backend service -> Logs

Deployment/restart failures:
Render dashboard -> backend service -> Events and Logs

Database issues:
Render Logs first, then Supabase dashboard -> Logs
```

Quick rule:

```txt
Page/build failed -> Netlify logs
Login/chat/API failed -> Browser Network tab + Render logs
Database query failed -> Render logs + Supabase logs
```

## 11. Common Issues

### `Environment variable not found: DATABASE_URL`

Render does not read local `server/.env`. Add `DATABASE_URL` in Render environment variables.

### `src refspec main does not match any`

There is no commit yet. Run:

```sh
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Tables do not appear in Supabase

Run migrations:

```sh
cd server
npx prisma migrate deploy
```

Then refresh Supabase Table Editor and check the `public` schema.

### Netlify API calls fail

Check:

- `netlify.toml` points to the correct Render URL
- Render `CORS_ORIGINS` is the exact Netlify site URL
- Browser Network tab shows requests going to `/api/...`
- Render logs show whether the backend received the request

### Render deploy succeeds but app feels slow

Render free services can spin down when idle. The first request after inactivity may be slow.
