# Deployment Guide

This app should be deployed as two services:

- Frontend: Netlify, using `client/`
- Backend: a Node host such as Render, Railway, Fly.io, or a VPS, using `server/`

## 1. Backend

Deploy `server/` first. The backend must have a public HTTPS URL before the Netlify proxy can be finalized.

Required environment variables:

```env
NODE_ENV=production
PORT=5000
TRUST_PROXY=true
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
AUTH_SECRET=replace-with-at-least-32-random-characters
CORS_ORIGINS=https://YOUR_NETLIFY_SITE.netlify.app
OLLAMA_BASE_URL=https://YOUR_OLLAMA_HOST
OLLAMA_API_KEY=only-needed-for-ollama-cloud
CHAT_MODEL=llama3
EMBED_MODEL=nomic-embed-text
DATAFILES_PATH=./datafiles
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_CHUNKS=5
```

Start command for a normal Node host:

```sh
npm run start:prod
```

Docker hosts can use `server/Dockerfile`.

After deploy, verify:

```txt
https://YOUR_BACKEND_DOMAIN/health
https://YOUR_BACKEND_DOMAIN/api/status
```

## 2. Netlify Frontend

Before deploying to Netlify, edit `netlify.toml` and replace:

```txt
https://REPLACE_WITH_BACKEND_DOMAIN
```

with your real backend URL, for example:

```txt
https://interview-hub-api.onrender.com
```

Netlify build settings are already in `netlify.toml`:

```txt
Base directory: client
Build command: npm run build
Publish directory: dist
```

The frontend keeps using `/api/*`; Netlify proxies those requests to the backend.

## 3. Database

Use PostgreSQL with pgvector enabled. Before first production boot, make sure migrations run:

```sh
npm run deploy:migrate
```

`npm run start:prod` also runs `prisma migrate deploy` before starting the server.

## 4. Ollama

Ollama must be reachable from the backend host. Pull the configured models on the Ollama machine:

```sh
ollama pull llama3
ollama pull nomic-embed-text
```

If you use another model name, update `CHAT_MODEL` and `EMBED_MODEL`.

### Ollama Cloud

For Ollama Cloud, create an API key at ollama.com and set:

```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your_ollama_api_key
CHAT_MODEL=gpt-oss:120b
EMBED_MODEL=nomic-embed-text
```

Use a model name that appears in your Ollama Cloud `/api/tags` list. The backend sends the `Authorization: Bearer ...` header automatically when `OLLAMA_API_KEY` is present.
