# Complete Setup Guide - Interview Hub

This guide will walk you through setting up the entire application locally.

## Prerequisites Checklist

- [ ] Node.js 16+ installed
- [ ] PostgreSQL 13+ installed
- [ ] Ollama installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

---

## Step 1: Install & Setup Ollama

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
# Pull the main chat model
ollama pull llama3

# Pull the embedding model
ollama pull nomic-embed-text

# Start Ollama server
ollama serve
```

Keep this terminal running! The server will be available at `http://localhost:11434`

**Note**: First pull may take 10-20 minutes depending on internet speed.

---

## Step 2: Setup PostgreSQL

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

## Step 3: Setup Backend Server

### Clone and Navigate
```bash
cd server
```

### Create Environment File

Create `.env` file in `/server`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/interview_app"
OLLAMA_BASE_URL="http://localhost:11434"
CHAT_MODEL="llama3"
EMBED_MODEL="nomic-embed-text"
PORT=5000
NODE_ENV="development"
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
- Document parsing libraries
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
✅ Seeded 60 questions
```

### Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
📚 Ollama: http://localhost:11434
🗄️  Database: ✅
```

The backend is now ready! Keep this running in a terminal.

---

## Step 4: Setup Frontend Client

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

## Step 5: Access the Application

1. Open browser: `http://localhost:5173`
2. You should see the Interview Hub dashboard
3. Click on any topic to explore questions
4. Go to "Chat" to start chatting with AI

---

## Troubleshooting

### "Cannot connect to Ollama"

**Problem**: Error message about Ollama connection

**Solution**:
1. Verify `ollama serve` is running in its terminal
2. Test: `curl http://localhost:11434/api/tags`
3. If using custom host, update `OLLAMA_BASE_URL` in `.env`

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

---

## Accessing the Application

Once everything is running:

**Frontend**: http://localhost:5173
**Backend API**: http://localhost:5000
**Ollama**: http://localhost:11434
**PostgreSQL**: localhost:5432

### Default Features Available

✅ Chat with AI (all 5 modes)
✅ 12 topic dashboards
✅ Theory questions & answers
✅ Bookmark questions
✅ Session management

🔜 Coming Soon:
- Coding challenges editor
- Mock interview simulator
- Document upload & RAG
- Study roadmap
- Progress analytics

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
```

---

## Environment Configuration

### Optional: Different Ollama Models

Edit `/server/.env`:

**Fast but less accurate:**
```env
CHAT_MODEL="mistral"
```

**Larger model (requires more RAM):**
```env
CHAT_MODEL="neural-chat"
```

**Quantized for speed:**
```env
CHAT_MODEL="orca-mini"
```

### Optional: Remote PostgreSQL

Change `DATABASE_URL` to:
```env
DATABASE_URL="postgresql://user:password@host:5432/interview_app"
```

---

## Next Steps

After setup is complete:

1. **Explore the Chat**: Try different modes
2. **Ingest Documents**: Upload your own materials
3. **Practice Questions**: Work through different topics
4. **Try Mock Interview**: (Once implemented)
5. **Customize**: Add more question topics
6. **Deploy**: Push to production when ready

---

## Performance Tips

### Local Machine (Recommended)
- Minimum: 8GB RAM, 4-core CPU
- Optimal: 16GB RAM, 8-core CPU, GPU

### Enable GPU (If Available)

**NVIDIA GPU:**
```bash
ollama run llama3 --gpu all
```

**AMD GPU:**
```bash
export HIP_DEVICE_ORDER=PCI
ollama serve
```

### Database Optimization

After seeding, create indexes:
```bash
npx prisma db execute --stdin < optimize.sql
```

---

## Support & Debugging

### Enable Debug Logging

Backend:
```env
NODE_ENV="development"
DEBUG="*"
```

Frontend (Browser Console):
```javascript
localStorage.setItem('DEBUG', '*')
```

### Check System Status

```bash
# Backend health
curl http://localhost:5000/health

# Ollama status
curl http://localhost:11434/api/tags

# Database
psql -U postgres -d interview_app -c "SELECT version();"
```

---

## Uninstall/Reset

### Reset Database
```bash
npx prisma migrate reset  # WARNING: Deletes all data
```

### Clear Ollama Models
```bash
ollama rm llama3
ollama rm nomic-embed-text
```

### Stop Services
```bash
# Backend
Ctrl+C in backend terminal

# Frontend
Ctrl+C in frontend terminal

# Ollama
Ctrl+C in Ollama terminal

# PostgreSQL (macOS)
brew services stop postgresql@15
```

---

## Deployment

### Deploy Backend

**Railway.app** (Easiest)
1. Push code to GitHub
2. Connect repository to Railway
3. Add PostgreSQL add-on
4. Set environment variables
5. Deploy!

### Deploy Frontend

**Vercel** (Recommended)
1. Import project on Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment: `VITE_API_URL=https://your-backend.com`
5. Deploy!

---

## Getting Help

If you encounter issues:

1. **Check Logs**: Review terminal output for errors
2. **Verify Connections**: Test each service independently
3. **Check Ports**: Ensure 5000, 5173, 5432 are available
4. **Review .env**: Make sure all variables are set correctly
5. **Restart Services**: Sometimes helps with connection issues

---

**Happy Learning! 🚀**
