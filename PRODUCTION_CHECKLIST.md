# Production Checklist

Use this as the minimum release gate before exposing Interview Hub publicly.

For the exact split deployment steps, use `DEPLOYMENT.md`.

## Required Environment

### Core
- [ ] Set `NODE_ENV=production`.
- [ ] Set a strong `AUTH_SECRET` with at least 32 random characters.
- [ ] Set `DATABASE_URL` to the production PostgreSQL/pgvector database.
- [ ] Set `CORS_ORIGINS` to the exact frontend origin, for example `https://app.example.com`.
- [ ] Set `FRONTEND_URL` to the exact frontend origin so OAuth redirects return to the public app.
- [ ] Set `ADMIN_EMAILS` to the comma-separated list of superadmin accounts.
- [ ] Set `TRUST_PROXY=true` when running behind a reverse proxy or platform load balancer.

### GROQ (Primary AI Chat)
- [ ] Set `GROQ_API_KEY` to your groq.com API key.
- [ ] Set `GROQ_MODEL` (recommended: `llama-3.1-8b-instant`).
- [ ] The status endpoint `GET /api/status` returns `{"groq": "online"}` when connected.

### Ollama (Optional — Embeddings Only)
- [ ] Ollama is only used for document embeddings, not chat.
- [ ] Set `OLLAMA_BASE_URL` to the production Ollama host (e.g., `https://ollama.com` for Ollama Cloud).
- [ ] Set `OLLAMA_API_KEY` and `EMBED_MODEL=nomic-embed-text`.
- [ ] If Ollama is unavailable, document/RAG features are disabled but everything else works.

## Runtime

- [ ] Run database migrations before deploying the server.
- [ ] Confirm migrations include `PasswordResetToken`, `RoadmapItem`, and profile/admin fields.
- [ ] Serve the Vite `client/dist` build from a static host or reverse proxy.
- [ ] Route frontend `/api/*` requests to the Node server via `netlify.toml` proxy.
- [ ] Terminate TLS at the proxy/platform so secure cookies work.
- [ ] Monitor `/health` for liveness and `/api/status` for GROQ/database readiness.
- [ ] Run `npm test` in `server/` and `npm run build` in `client/` before release.

### Code Playground
- [ ] Playground requires Docker — not available on Render's free Node plan.
- [ ] On Render free tier, the server auto-detects missing Docker and returns 503 with a clear message.
- [ ] To enable playground: upgrade to Render Docker Web Service ($7/mo) or self-host Piston (see DEPLOYMENT.md).
- [ ] The `dockerAvailable` flag is checked at startup via `docker info`.
- [ ] Docker images are pre-pulled automatically: `python:3.12-slim`, `node:22-slim`, `gcc:13.2-bookworm`, `eclipse-temurin:*`, `mysql:8.0`, `postgres:16`.

## Security

- [ ] Keep `.env` files out of source control.
- [ ] Do not use the local Docker database password in production.
- [ ] Rotate secrets that were pasted into chat, screenshots, logs, or committed history.
- [ ] Restrict production database access to the app network only.
- [ ] Keep dependency audits clean before each release.
- [ ] Confirm `ALLOW_PASSWORD_AUTH=false` if only OAuth logins are desired.
- [ ] OAuth state parameter is stored in HTTP-only cookie for CSRF protection.

## Error Handling

- [ ] Centralized error handler maps Prisma error codes (P2002 → 409, P2025 → 404, etc.).
- [ ] Network errors and timeouts return 503 with "External service unavailable".
- [ ] Stack traces are hidden in production; detailed in development.
- [ ] The playground frontend handles content-type mismatches (HTML instead of JSON) gracefully.

## Question Data

- [ ] 12 topic folders at `server/data/questions/` with built-in JSON questions.
- [ ] Template format files at `server/data/templates/` for card structure.
- [ ] Formatted output at `server/data/questions/formatted/` in template format.
- [ ] Run `node prisma/seed.js` to seed questions into the database.
