# Interview Hub - Quick Start Reference

## 📋 Checklist Before Starting

- [ ] GROQ API key (from [groq.com](https://groq.com)) — required for chat
- [ ] PostgreSQL with pgvector installed, or Docker Desktop running
- [ ] Node.js 16+ installed
- [ ] Docker Desktop (optional, for playground code execution)
- [ ] Ollama installed (optional, for document embeddings)
- [ ] Code editor open with project

---

## 🚀 Launch in 3 Commands

### Terminal 1: Backend
```bash
cd server
cp .env.example .env
# Edit .env: set GROQ_API_KEY, DATABASE_URL
npm install
npx prisma migrate dev --name init
npm run dev
```
Wait for: "🚀 Server running on http://localhost:5000"

### Terminal 2: Frontend
```bash
cd client
npm install
npm run dev
```
Wait for: "Local: http://localhost:5173"

### Terminal 3 (Optional): Docker for Playground
If you want code execution in the playground:
1. Start [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Restart the backend — it auto-detects Docker at startup
3. Server logs show: ✅ "Docker available — playground execution enabled"

> **No Docker?** The playground returns a clear 503 message. All other features work.

---

## 🎯 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web app |
| Backend API | http://localhost:5000 | API endpoints |
| Playground | http://localhost:5173/playground | Code execution |
| GROQ | cloud | AI chat (no local URL) |
| Ollama | http://localhost:11434 | Embeddings (optional) |
| PG Admin | localhost:5432 or localhost:5433 | Database |

---

## 📁 Key Files to Know

**Backend Config:**
- `server/.env` - Environment variables (GROQ_API_KEY, DATABASE_URL, etc.)
- `server/config.js` - App configuration
- `server/prisma/schema.prisma` - Database schema

**Frontend Config:**
- `client/vite.config.js` - Vite settings
- `client/tailwind.config.js` - Tailwind theme
- `client/src/services/api.js` - API client

**Question Data:**
- `server/data/questions/` - 12 topic folders (source of truth)
- `server/data/questions/formatted/` - Template-formatted versions
- `server/data/templates/` - Card template JSON files

---

## 🔧 Common Tasks

### Add More Questions
1. Edit `server/data/questions/[topic].json`
2. Run: `node prisma/seed.js`

### Change GROQ Model
Edit `server/.env`:
```env
GROQ_MODEL="llama-3.1-8b-instant"  # fast default
# GROQ_MODEL="llama-3.3-70b-versatile"  # slower, smarter
# GROQ_MODEL="llama3-8b-8192"  # fastest
```

### View Database
```bash
npx prisma studio
```

### Check API Health
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/status  # returns {"groq": "online"}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "GROQ not available" | Set `GROQ_API_KEY` in `server/.env` |
| "Chatbot: Offline" in navbar | GROQ key missing or invalid |
| "Database connection refused" | Check DATABASE_URL in .env |
| "Port already in use" | Change PORT in .env |
| "Playground not available" | Start Docker Desktop and restart backend |
| "pgvector error" | Run `docker compose up -d postgres`, use `localhost:5433` |

---

## 📊 What's Implemented

✅ AI Chat with 5 modes (powered by GROQ)
✅ Real-time streaming SSE
✅ 60+ questions across 12 topics
✅ Code Playground with Docker (9 languages)
✅ User authentication (email, Google, GitHub)
✅ Admin panel (users, questions, roadmap)
✅ Profile management & password change
✅ Coding cards with difficulty badges
✅ Theory cards with expandable answers
✅ Dark mode with persistence
✅ Session management
✅ Code syntax highlighting (Monaco Editor)
✅ Document upload & RAG (requires Ollama)
✅ Mock interview with AI scoring
✅ Responsive design
✅ Status indicators (Chatbot, Database)
✅ Docker availability auto-detection

---

## 🗂️ Project Structure

```
interview-hub/
├── server/              (Express backend)
│   ├── routes/
│   ├── controllers/
│   ├── services/        (groqService, dockerService, ollamaService, etc.)
│   ├── prisma/
│   └── data/questions/
├── client/              (React frontend)
│   └── src/
│       ├── components/
│       ├── pages/       (Login, Dashboard, Chat, Topic, Profile, Admin, Playground)
│       ├── store/
│       ├── hooks/
│       └── services/
├── README.md            (Full guide)
├── SETUP.md             (Step-by-step)
├── DEPLOYMENT.md        (Production deployment)
└── BUILD_SUMMARY.md     (What's built)
```

---

First things to try:
1. Start the backend and frontend
2. Go to http://localhost:5173 and create an account
3. Click a topic in Dashboard to see theory/coding cards
4. Go to Chat and try different modes
5. Try the Playground with JavaScript: `console.log("Hello!");`
