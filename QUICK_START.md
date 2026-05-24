# Interview Hub - Quick Start Reference

## 📋 Checklist Before Starting

- [ ] Ollama installed and running: `ollama serve`
- [ ] PostgreSQL with pgvector installed, or Docker Desktop running
- [ ] Node.js 16+ installed
- [ ] Code editor open with project

---

## 🚀 Launch in 3 Commands

### Terminal 1: Ollama (Keep Running)
```bash
ollama serve
```
Wait for: "Listening on 127.0.0.1:11434"

### Terminal 2: Backend
```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL password
npm install
npx prisma migrate dev --name init
npm run dev
```
Wait for: "🚀 Server running on http://localhost:5000"

If PostgreSQL says `extension "vector" is not available`, start the bundled
pgvector database:

```bash
docker compose up -d postgres
```

Then use this database URL in `server/.env`:

```env
DATABASE_URL="postgresql://om_2026:postgres@localhost:5433/interviewdb"
```

### Terminal 3: Frontend
```bash
cd client
npm install
npm run dev
```
Wait for: "Local: http://localhost:5173"

---

## 🎯 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web app |
| Backend API | http://localhost:5000 | API endpoints |
| Ollama | http://localhost:11434 | LLM service |
| PG Admin | localhost:5432 or localhost:5433 | Database |

---

## 📁 Key Files to Know

**Backend Config:**
- `server/.env` - Environment variables
- `server/config.js` - App configuration
- `server/prisma/schema.prisma` - Database schema

**Frontend Config:**
- `client/vite.config.js` - Vite settings
- `client/tailwind.config.js` - Tailwind theme
- `client/src/services/api.js` - API client

**Question Data:**
- `server/data/questions/` - 12 topic folders

---

## 🔧 Common Tasks

### Add More Questions
1. Edit `server/data/questions/[topic].json`
2. Run: `node prisma/seed.js`

### Change Chat Model
Edit `server/.env`:
```env
CHAT_MODEL="mistral"  # or "neural-chat", "orca-mini"
```

### View Database
```bash
npx prisma studio
```

### Check API Health
```bash
curl http://localhost:5000/health
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to Ollama" | `ollama serve` not running |
| "Database connection refused" | Check DATABASE_URL in .env |
| "Port already in use" | Change PORT in .env |
| "Models not found" | Run `ollama pull llama3` |
| "pgvector error" | Run `docker compose up -d postgres`, then use `localhost:5433` in `DATABASE_URL` |

---

## 📊 What's Implemented

✅ AI Chat with 5 modes
✅ Real-time streaming
✅ 60+ questions (12 topics)
✅ Dark mode
✅ Session management
✅ Code syntax highlighting
✅ Database + ORM
✅ Vector search ready
✅ Responsive design
✅ Status indicators

🔜 Coding challenges
🔜 Mock interviews
🔜 Study roadmap
🔜 Document upload

---

## 🗂️ Project Structure

```
interview-hub/
├── server/              (Express backend)
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── prisma/
│   └── data/questions/
├── client/              (React frontend)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── store/
│       ├── hooks/
│       └── services/
├── README.md            (Full guide)
├── SETUP.md             (Step-by-step)
└── BUILD_SUMMARY.md     (What's built)
```

---

## 📚 Documentation

- **README.md** - Complete project overview
- **SETUP.md** - Detailed setup guide
- **BUILD_SUMMARY.md** - What was built
- **This file** - Quick reference

---

## 🎓 First Things to Try

1. Start all 3 services
2. Go to http://localhost:5173
3. Click a topic in Dashboard
4. Go to Chat tab
5. Try different chat modes:
   - 💬 General - Ask anything
   - 💻 Code - Code help
   - 🎯 Interview - Interview prep
   - 📝 ELI5 - Simple explanations

---

## 💾 Database Commands

```bash
# Connect to database
psql -U postgres -d interview_app

# View tables
\dt

# View schema
\d Message

# View data
SELECT * FROM "Question" LIMIT 5;

# Exit
\q
```

---

## 🔑 Default Credentials

**PostgreSQL:**
- Username: `postgres`
- Password: (your choice during install)
- Database: `interview_app`

**Ollama:**
- No credentials needed
- Models: llama3, nomic-embed-text

---

## ⚡ Performance Tips

- Use GPU if available: `ollama pull llama3:gpu`
- 16GB RAM recommended
- Disable animations on slow machines
- Use mistral model for speed

---

## 🚀 Next Steps

1. ✅ Get everything running
2. ✅ Explore chat features
3. ✅ Try different topics
4. ✅ Upload your own documents
5. ✅ Customize questions
6. ✅ Deploy to production

---

## 📞 Support

- Check logs in terminal
- Read README.md for details
- Review SETUP.md for setup help
- Check BUILD_SUMMARY.md for architecture

---

## 💡 Did You Know?

- Everything runs locally (privacy!)
- No API keys needed
- Works offline (after setup)
- Fully customizable
- Ready for production
- Great for learning

---

**Ready to prepare for your interview? Start chatting! 🎉**

For detailed instructions, see `SETUP.md`
For architecture details, see `BUILD_SUMMARY.md`
