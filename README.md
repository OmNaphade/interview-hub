# Interview Hub - AI-Powered Interview Preparation

A full-stack interview preparation & AI assistant web application powered by Ollama locally or by an Ollama-compatible cloud host in production.

## Features

### 🤖 AI Chatbot
- **Smart Chat Modes**: General, Code, Interview, ELI5, and My Notes (RAG)
- **Real-time Streaming**: SSE-based streaming for smooth conversation
- **Code Analysis**: Copy, explain, and get suggestions for code blocks
- **Session Management**: Organize conversations by date
- **RAG (Retrieval-Augmented Generation)**: Chat with your own documents

### 📚 Interview Preparation
- **Topic Dashboard**: 12+ technical topics with progress tracking
- **Theory Questions**: Q&A with source documents
- **Coding Challenges**: Monaco Editor with syntax highlighting
- **Mock Interview Simulator**: AI scoring and feedback
- **Study Roadmap**: Visual progress tracking

### 📄 Document Management
- **Multiple Formats**: PDF, DOCX, and URL ingestion
- **Automatic Embedding**: pgvector-powered semantic search
- **Question Generation**: AI generates Q&A from your documents
- **Smart Tagging**: Auto-detect topics from documents

## Tech Stack

### Frontend
- **React 18** + **Vite** for development
- **Tailwind CSS** for styling
- **Monaco Editor** for code editing
- **Zustand** for state management
- **React Query** for data fetching
- **Axios** for HTTP requests
- **React Hot Toast** for notifications

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** with **Prisma ORM**
- **pgvector** for vector embeddings
- **Ollama** for local LLM + embeddings

### Data Pipeline
- **PDF parsing**: pdf-parse
- **DOCX parsing**: mammoth
- **Web scraping**: cheerio + axios
- **Text chunking**: Custom chunking service
- **Embeddings**: Ollama nomic-embed-text

## Project Structure

```
interview-hub/
├── client/                    → React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         → Chat UI components
│   │   │   ├── interview/    → Interview components
│   │   │   └── ui/           → Common UI components
│   │   ├── pages/            → Route pages
│   │   ├── hooks/            → Custom React hooks
│   │   ├── store/            → Zustand stores
│   │   ├── services/         → API service
│   │   ├── data/             → Static question data
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                    → Express backend
    ├── app.js                → Express app factory
    ├── index.js              → Server entry point
    ├── config.js             → Configuration
    ├── routes/               → API routes
    ├── controllers/          → Route logic
    ├── services/             → Business logic
    │   ├── ollamaService.js
    │   ├── ragService.js
    │   ├── documentParser.js
    │   ├── embeddingService.js
    ├── middleware/           → Express middleware
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.js
    ├── data/questions/       → Built-in questions
    ├── datafiles/            → User document storage
    ├── tests/                → API contract tests
    ├── .env.example
    └── package.json
```

## Prerequisites

- **Node.js** 16+ (for server and client)
- **PostgreSQL** 13+ running locally or on network
- **Ollama** running with models pulled
- **Windows/Mac/Linux**

## Setup Instructions

### 1. **Install Ollama & Pull Models**

Download Ollama from https://ollama.ai and install it.

```bash
ollama pull llama3
ollama pull nomic-embed-text
ollama serve
```

Keep the Ollama terminal open (runs on `http://localhost:11434`)

### 2. **Setup PostgreSQL**

Create database and enable pgvector:

```bash
createdb interview_app

psql -d interview_app -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

On Windows, if that command fails with `extension "vector" is not available`,
use the pgvector Docker database included in this repo:

```bash
docker compose up -d postgres
```

Then set `server/.env` to:

```env
DATABASE_URL="postgresql://om_2026:postgres@localhost:5433/interviewdb"
```

The Docker database uses host port `5433`, so it can run beside a local
PostgreSQL install that is already using `5432`.

### 3. **Setup Backend**

```bash
cd server

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://postgres:password@localhost:5432/interview_app"

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with questions
node prisma/seed.js

# Start server
npm run dev
```

Server runs on `http://localhost:5000`

### 4. **Setup Frontend**

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 5. **Access Application**

Open browser: `http://localhost:5173`

## API Endpoints

### Chat
- `GET /api/chat/sessions` - List all chat sessions
- `GET /api/chat/sessions/:id` - Get session with messages
- `POST /api/chat/sessions` - Create new session
- `DELETE /api/chat/sessions/:id` - Delete session
- `GET /api/chat/stream` - SSE stream for AI responses

### Questions
- `GET /api/questions/:topic` - Get questions by topic
- `GET /api/questions/:topic/:id` - Get single question

### Interview
- `POST /api/interview/start` - Start mock interview
- `POST /api/interview/answer` - Submit answer & score
- `GET /api/interview/summary/:id` - Get session results

### Documents
- `POST /api/documents/ingest` - Ingest PDF/DOCX/URL
- `GET /api/documents` - List all documents
- `GET /api/documents/:id/chunks` - Preview document chunks
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/search` - RAG semantic search

### Progress & Bookmarks
- `GET /api/progress` - Get all progress
- `PUT /api/progress/:topic/:step` - Update progress
- `GET /api/progress/bookmarks` - Get bookmarks
- `POST /api/progress/bookmarks` - Add bookmark
- `DELETE /api/progress/bookmarks/:id` - Remove bookmark

### Status
- `GET /api/status` - Health check

Most app features require authentication. The dashboard and question catalogue can load publicly, then protected actions redirect to the existing login form. Auth sessions are held in an HTTP-only `ih_token` cookie and verified through `GET /api/auth/me` when the app starts.

## Environment Variables

### Server (.env)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/interview_app
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=
CHAT_MODEL=llama3
EMBED_MODEL=nomic-embed-text
PORT=5000
NODE_ENV=development
AUTH_SECRET=change-this-long-random-secret
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
ADMIN_EMAILS=masteroman1234@gmail.com
DATAFILES_PATH=./datafiles
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_CHUNKS=5
```

## Database Schema

Key tables:
- **ChatSession** - Chat conversations
- **Message** - Chat messages with optional RAG sources
- **Question** - Interview questions (built-in, AI-generated, user-uploaded)
- **Document** - Ingested documents metadata
- **DocumentChunk** - Text chunks with vector embeddings
- **Bookmark** - Bookmarked questions
- **TopicProgress** - Roadmap progress tracking
- **InterviewSession** - Mock interview results

## Features in Detail

### Chat Modes

1. **General** - Helpful assistant for any question
2. **Code** - Expert programming assistant
3. **Interview** - Coaching-style feedback
4. **ELI5** - Beginner-friendly explanations
5. **From My Notes (RAG)** - Only answers from your documents

### Document Ingestion

1. Drop files in `/server/datafiles/` or use UI
2. System automatically:
   - Extracts text from PDF/DOCX
   - Fetches content from URLs
   - Chunks text intelligently
   - Generates embeddings
   - Detects topics
   - Generates Q&A

### Interview Simulator

- Select topic + difficulty
- AI asks questions sequentially
- Score each answer 1-10
- Get detailed feedback
- View performance analytics

## Build & Deploy

### Production Build (Frontend)

```bash
cd client
npm run build
```

Output in `dist/` ready for static hosting.

### Tests

```bash
cd server
npm test

cd ../client
npm run build
```

### Production Deployment

Use `DEPLOYMENT.md` for the Render + Netlify deployment. The frontend calls `/api`, and `netlify.toml` proxies those requests to the Render backend.

Admin access is controlled by `ADMIN_EMAILS`, a comma-separated env var. The app defaults to `masteroman1234@gmail.com`, but production should set it explicitly so you can change admins without editing code.

For Ollama Cloud on Render:

```env
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=your-real-ollama-api-key
CHAT_MODEL=glm-5.1
EMBED_MODEL=nomic-embed-text
```

## Troubleshooting

### Ollama Connection Error
- Ensure `ollama serve` is running
- Check `http://localhost:11434/api/tags`
- Verify OLLAMA_BASE_URL in .env

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Run `psql -d interview_app` to test

### Vector Extension Missing
- Run: `psql -d interview_app -c "CREATE EXTENSION IF NOT EXISTS vector;"`
- If PostgreSQL says `extension "vector" is not available`, run `docker compose up -d postgres` and point `DATABASE_URL` at `localhost:5433`

### Slow Embeddings
- Embeddings are GPU-intensive
- Consider CPU-optimized models
- Run Ollama on separate machine

## Performance Tips

1. **Use GPU** for Ollama: Set up CUDA if available
2. **Scale backend** with PM2 or clustering
3. **Cache responses** with Redis
4. **Optimize images** and lazy load components
5. **Use database indexes** on frequently queried columns

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch
3. Make changes
4. Submit pull request

## License

MIT License - see LICENSE file

## Support

For issues and questions:
- Check GitHub Issues
- Review documentation above
- Run diagnostics: `curl http://localhost:5000/health`

## Roadmap

- [ ] Multiple language support
- [ ] Real-time multiplayer interviews
- [ ] Video recording for practice
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] Integration with LeetCode/HackerRank
- [ ] Spaced repetition system
- [ ] Peer review features

---

Built with ❤️ for interview preparation
