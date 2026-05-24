# Production Checklist

Use this as the minimum release gate before exposing Interview Hub publicly.

For the exact split deployment steps, use `DEPLOYMENT.md`.

## Required Environment

- Set `NODE_ENV=production`.
- Set a strong `AUTH_SECRET` with at least 32 random characters.
- Set `DATABASE_URL` to the production PostgreSQL/pgvector database.
- Set `CORS_ORIGINS` to the exact frontend origin, for example `https://app.example.com`.
- Set `FRONTEND_URL` to the exact frontend origin so OAuth redirects return to the public app.
- Set `TRUST_PROXY=true` when running behind a reverse proxy or platform load balancer.
- Point `OLLAMA_BASE_URL` to the production Ollama host. For Ollama Cloud direct API access, use `https://ollama.com`, not `/api/chat`.
- Set `OLLAMA_API_KEY`, `CHAT_MODEL`, and `EMBED_MODEL` to real production values.

## Runtime

- Run database migrations before deploying the server.
- Serve the Vite `client/dist` build from a static host or reverse proxy.
- Route frontend `/api/*` requests to the Node server. The current Netlify setup does this in `netlify.toml`.
- Terminate TLS at the proxy/platform so secure cookies work.
- Monitor `/health` for liveness and `/api/status` for database/Ollama readiness.
- Run `npm test` in `server/` and `npm run build` in `client/` before release.

## Security

- Keep `.env` files out of source control.
- Do not use the local Docker database password in production.
- Rotate secrets that were pasted into chat, screenshots, logs, or committed history.
- Restrict production database access to the app network only.
- Keep dependency audits clean before each release.
