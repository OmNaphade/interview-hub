# Complete Setup Guide - Interview Hub

This guide will walk you through setting up the entire application locally.

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] PostgreSQL 13+ installed
- [ ] Ollama installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

---

## Step 1: Get GROQ API Key (Primary AI)

**GROQ** powers all chat, code hints, and interview scoring. It runs in the cloud — no local setup needed.

1. Sign up at [groq.com](https://groq.com) — it's free
2. Generate an API key from the console
3. You'll add it to `server/.env` in Step 3

> **Why GROQ instead of Ollama for chat?** GROQ provides fast cloud inference (8B parameter model at cloud speeds) vs running Ollama locally on CPU, which is slow. Ollama is kept only for local document embeddings.

---

## Step 2: Install & Setup Ollama (Optional — Embeddings Only)

Ollama is only needed for **document embeddings** (RAG features). If you don't plan to upload documents, you can skip this step.

### Windows/Mac/Linux
1. Download Ollama from: https://ollama.ai
2. Install following the platform-specific instructions
3. Verify installation:
   ```bash
   ollama --version
   ```

### Pull Required Models

Open a terminal and run:

```bash
# Pull the embedding model (required for RAG/document features)
ollama pull nomic-embed-text

# Start Ollama server
ollama serve
```

Keep this terminal running! The server will be available at `http://localhost:11434`

**Note**: First pull may take 5-10 minutes depending on internet speed.

---

## Step 3: Setup PostgreSQL

### Windows
1. Download PostgreSQL 15+ from: https://www.postgresql.org/download/windows/
2. Run installer with default settings
3. Remember the password you set for `postgres` user
4. Open pgAdmin (installed with PostgreSQL)

If `CREATE EXTENSION vector;` fails with `extension "vector" is not available`,
your PostgreSQL install does not include pgvector. This repo includes a Docker
fallback that already has pgvector:

```bash
docker compose up -d postgres
```

Use this database URL in `server/.env`:

```env
DATABASE_URL="postgresql://om_2026:postgres@localhost:5433/interviewdb"
```

The Docker database listens on host port `5433`, leaving your existing Windows
PostgreSQL on `5432` alone.

### Mac (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database

Open PostgreSQL terminal (psql) and run:

```sql
CREATE DATABASE interview_app;

\c interview_app

CREATE EXTENSION IF NOT EXISTS vector;

\q
```

Verify pgvector is installed:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Step 4: Setup Backend Server

### Clone and Navigate
```bash
cd server
```

### Create Environment File

Create `.env` file in `/server`. Copy from the example:

```bash
cp .env.example .env
```

Or create manually:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/interview_app"

# GROQ (Primary AI — required for chat)
GROQ_API_KEY="gsk_your_groq_api_key"
GROQ_MODEL="llama-3.1-8b-instant"

# Ollama (Optional — for document embeddings only)
# OLLAMA_BASE_URL="http://localhost:11434"
# EMBED_MODEL="nomic-embed-text"

PORT=5000
NODE_ENV="development"
AUTH_SECRET="at-least-32-random-chars-for-jwt"
FRONTEND_URL="http://localhost:5173"
ALLOW_PASSWORD_AUTH=true
ADMIN_EMAILS="admin@example.com"
DATAFILES_PATH="./datafiles"
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_CHUNKS=5
```

**Replace `your_password` with the password you set during PostgreSQL installation**

### Install Dependencies

```bash
npm install
```

This installs:
- Express.js
- Prisma ORM
- PostgreSQL driver
- Document parsing libraries (pdf-parse, mammoth, cheerio)
- Axios for HTTP requests

### Setup Prisma

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

You'll see output like:
```
✔ Generated Prisma Client v5.7.0
✔ Created migration 0_init
✔ Applied migration init to database
```

### Seed Database with Questions

```bash
node prisma/seed.js
```

You should see:
```
🌱 Seeding database...
✅ Seeded 60+ questions across 12 topics
```

### Setup Docker (Optional — for Code Playground)

The code playground requires Docker Desktop to execute code in containers:

1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install and start it (ensure the Docker daemon is running)
3. The server will auto-detect Docker at startup via `docker info`
4. Docker images are pulled automatically in the background on first run

If Docker is not available, the playground shows a friendly 503 message — all other features work.

### Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
✅ Docker available — playground execution enabled (or ⚠️ Docker not available)
🗄️  Database: ✅
```

The backend is now ready! Keep this running in a terminal.

---

## Step 5: Setup Frontend Client

### In a New Terminal

Navigate to client directory:
```bash
cd client
```

### Install Dependencies

```bash
npm install
```

This installs:
- React 18
- Vite
- Tailwind CSS
- React Router
- Zustand
- Monaco Editor
- Axios

### Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
Local:        http://localhost:5173/
```

---

## Step 6: Access the Application

1. Open browser: `http://localhost:5173`
2. You should see the Login page — create an account or sign in
3. Dashboard shows 12 topic cards with progress
4. Go to "Chat" to start chatting with AI (powered by GROQ)
5. Try the Playground to write and run code (requires Docker)
6. The navbar shows **"Chatbot"** status indicator — green when GROQ is online

---

## Troubleshooting

### "Cannot connect to GROQ"

**Problem**: Chat returns errors or status shows "Chatbot: Offline"

**Solution**:
1. Verify `GROQ_API_KEY` is set in `server/.env`
2. Check the key at [groq.com](https://groq.com)
3. The status endpoint returns `{"groq": "online"}` when connected

### "Ollama not available"

**Problem**: Document features don't work

**Solution**:
1. This is expected if you didn't set up Ollama — GROQ handles chat
2. For RAG/document features, set `OLLAMA_BASE_URL` and install Ollama
3. Verify: `ollama serve` is running and `nomic-embed-text` is pulled

### "Database connection refused"

**Problem**: PostgreSQL connection error

**Solution**:
1. Verify PostgreSQL is running: `psql -U postgres`
2. Check `DATABASE_URL` is correct
3. Verify `interview_app` database exists: `\l` in psql
4. Re-run migrations: `npx prisma migrate dev --name fix`

### "pgvector extension not found"

**Problem**: Migration fails with vector type error

**Solution**:
```bash
# If your PostgreSQL install has pgvector available:
psql -U postgres -d interview_app -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Then retry:
npx prisma migrate dev --name init
```

If that command says `extension "vector" is not available`, use the bundled
Docker pgvector database instead:

```bash
docker compose up -d postgres
```

Then set `server/.env`:

```env
DATABASE_URL="postgresql://om_2026:postgres@localhost:5433/interviewdb"
```

And retry from `server`:

```bash
npx prisma migrate dev
node prisma/seed.js
```

### "Models not found" error in Ollama

**Problem**: Ollama can't find llama3 or nomic-embed-text

**Solution**:
1. Verify models are pulled:
   ```bash
   ollama list
   ```
2. If missing, re-pull:
   ```bash
   ollama pull llama3
   ollama pull nomic-embed-text
   ```

### Slow responses from AI

**Problem**: AI takes too long to respond

**Solution**:
- CPU-based processing is slow
- Consider upgrading RAM (16GB+ recommended)
- If available, set up GPU support for Ollama
- Use lighter model: `ollama pull mistral` instead of llama3

### Frontend won't load

**Problem**: White screen or connection refused

**Solution**:
1. Verify backend is running on port 5000
2. Check browser console for errors (F12)
3. Verify proxy in `client/vite.config.js`:
   ```javascript
   proxy: {
     '/api': 'http://localhost:5000'
   }
   ```

### "Docker not available" in Playground

**Problem**: Playground shows 503 or "not available"

**Solution**:
1. Ensure Docker Desktop is installed and running
2. Run `docker info` in terminal to verify
3. Restart the backend server after Docker is running
4. Check server startup logs for "✅ Docker available"

### "Question cards don't render correctly"

**Problem**: Cards missing difficulty badges or wrong format

**Solution**:
1. Questions use template format at `server/data/questions/formatted/`
2. Re-run the transform script: `node scripts/transform-questions.js`
3. The old format at `server/data/questions/` is still the source of truth

---

## Accessing the Application

Once everything is running:

**Frontend**: http://localhost:5173
**Backend API**: http://localhost:5000
**Playground**: http://localhost:5173/playground
**GROQ API**: cloud (no local URL)
**Ollama**: http://localhost:11434 (optional, for embeddings)
**PostgreSQL**: localhost:5432 (or localhost:5433 for Docker pgvector)

### Default Features Available

✅ Chat with AI (powered by GROQ, 5 modes)
✅ 12 topic dashboards with difficulty filtering
✅ Theory questions & answers (expandable cards)
✅ Coding challenges with code blocks
✅ Code Playground with Docker execution (9 languages)
✅ Bookmark questions
✅ Session management
✅ User authentication (email, Google, GitHub)
✅ Admin panel (user/roadmap management)
✅ Profile settings & password change
✅ Document upload & RAG (requires Ollama)
✅ Mock interview simulator with AI scoring
✅ Dark mode with persistence

---

## Common Commands

### Backend
```bash
# Development
npm run dev

# Production start
npm start

# Prisma tools
npx prisma studio      # Visual DB browser
npx prisma migrate status
npx prisma db seed     # Re-seed data
```

### Frontend
```bash
# Development
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

### Database
```bash
# Connect to database
psql -U postgres -d interview_app

# List tables
\dt

# Exit
\q

# Prisma Studio (GUI browser)
npx prisma studio
```

---

## Environment Configuration

### GROQ Model Options

Edit `/server/.env`:

**Default (fast):**
```env
GROQ_MODEL="llama-3.1-8b-instant"
```

**Larger model (slower, smarter):**
```env
GROQ_MODEL="llama-3.3-70b-versatile"
```

**Small model (fastest):**
```env
GROQ_MODEL="llama3-8b-8192"
```

### Ollama (Optional — for documents only)

```env
OLLAMA_BASE_URL="http://localhost:11434"
EMBED_MODEL="nomic-embed-text"
```

---

## Next Steps

After setup is complete:

1. **Explore the Chat**: Try all 5 modes (GROQ-powered)
2. **Code Playground**: Write and run code in 9 languages (needs Docker)
3. **Practice Questions**: Work through different topics with expandable cards
4. **Try Mock Interview**: AI-scored interview simulation
5. **Upload Documents**: Enable RAG mode (requires Ollama)
6. **Customize**: Add more question topics or edit templates
7. **Deploy**: Push to production (Netlify + Render)

---

## Performance Tips

### Docker Playground
- Docker Desktop uses significant RAM. Allocate at least 4GB in Docker settings.
- Images are pulled once on first use, then cached.
- Container timeouts: 30s for code, 120s for databases.

---

## Check System Status

```bash
# Backend health
curl http://localhost:5000/health

# GROQ status (returns {"groq": "online"})
curl http://localhost:5000/api/status

# Ollama status (if installed)
curl http://localhost:11434/api/tags

# Database
psql -U postgres -d interview_app -c "SELECT version();"
```

---

## Reset Database

```bash
npx prisma migrate reset  # WARNING: Deletes all data
```

---

**Happy Learning! 🚀**
