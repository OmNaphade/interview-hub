# Production Checklist

Use this as the minimum release gate before exposing Interview Hub publicly.

For the exact split deployment steps, use `DEPLOYMENT.md`.

## Required Environment

- Set `NODE_ENV=production`.
- Set a strong `AUTH_SECRET` with at least 32 random characters.
- Set `DATABASE_URL` to the production PostgreSQL/pgvector database.
- Set `CORS_ORIGINS` to the exact frontend origin, for example `https://app.example.com`.
- Set `TRUST_PROXY=true` when running behind a reverse proxy or platform load balancer.
- Point `OLLAMA_BASE_URL` to the production Ollama host and confirm the configured models are pulled there.

## Runtime

- Run database migrations before deploying the server.
- Serve the Vite `client/dist` build from a static host or reverse proxy.
- Route frontend `/api/*` requests to the Node server.
- Terminate TLS at the proxy/platform so secure cookies work.
- Monitor `/health` for liveness and `/api/status` for database/Ollama readiness.

## Security

- Keep `.env` files out of source control.
- Do not use the local Docker database password in production.
- Restrict production database access to the app network only.
- Keep dependency audits clean before each release.
