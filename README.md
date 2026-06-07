# Interview Hub — AI-Powered Interview Preparation

A full-stack interview preparation web application with an AI assistant powered by **GROQ** (fast cloud LLM) for chat, a **code playground** with Docker container execution, and **Ollama** (local) for document embeddings.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  React 18 + Vite + Tailwind CSS + Zustand + React Router│
│  Port: 5173 (dev) / Netlify (prod)                      │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP (withCredentials: true)
                       │  Vite dev proxy /api → :5000
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Express.js Backend                    │
│  Port: 5000 (dev) / Render (prod)                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Auth Routes  │  │  Chat Routes │  │Question/etc   │   │
│  │ /api/auth/*  │  │  /api/chat/* │  │  /api/*       │   │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘   │
│         │                │                   │           │
│         ▼                ▼                   ▼           │
│  ┌──────────┐   ┌────────────┐   ┌──────────────────┐   │
│  │authService│   │groqService │   │ ollamaService    │   │
│  │oauthSvc   │   │(chat/score)│   │ (embeddings only)│   │
│  │           │   │ragService  │   │ documentParser   │   │
│  │           │   │dockerSvc   │   │ embeddingService │   │
│  └────┬─────┘   └─────┬──────┘   └────────┬─────────┘   │
│       │               │                   │              │
│       ▼               ▼                   ▼              │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Prisma ORM + PostgreSQL              │   │
│  │         (pgvector for semantic search)            │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### AI & Service Split

| Service | What it does | Provider |
|---------|-------------|----------|
| **groqService** | Streaming chat, code hints, interview scoring | GROQ Cloud (`api.groq.com`) |
| **ollamaService** | Document embeddings (vector generation) | Ollama local (`localhost:11434`) |
| **dockerService** | Code execution via Docker containers | Docker Desktop |

---

## Code Playground (Docker Execution)

The playground lets you write and run code directly in the browser using Docker containers. Each language runs in its own isolated container with resource limits.

### Supported Languages

| Language | Docker Image | Type |
|----------|-------------|------|
| C++ | `gcc:13.2-bookworm` | Compiled |
| Java 8 | `eclipse-temurin:8-jdk-jammy` | Compiled |
| Java 11 | `eclipse-temurin:11-jdk-jammy` | Compiled |
| Java 17 | `eclipse-temurin:17-jdk-jammy` | Compiled |
| Java 21 | `eclipse-temurin:21-jdk-jammy` | Compiled |
| JavaScript | `node:22-slim` | Interpreted |
| Python | `python:3.12-slim` | Interpreted |
| MySQL | `mysql:8.0` | Database |
| PostgreSQL | `postgres:16` | Database |

### How Code Execution Works

```
Browser                          Express                        Docker
  │                                │                              │
  │ POST /api/playground/run       │                              │
  │ { language: "python",         │                              │
  │   code: "print('Hi')" }       │                              │
  │──────────────────────────────►│                              │
  │                                │  Write code to temp file     │
  │                                │                              │
  │                                │  docker run --rm             │
  │                                │    --network none            │
  │                                │    -m 256m --cpus 1          │
  │                                │    python:3.12-slim          │
  │                                │    python3 /code/code.py     │
  │                                │─────────────────────────────►│
  │                                │                              │
  │                                │◄──── stdout/stderr ─────────│
  │                                │                              │
  │                                │  Cleanup temp files          │
  │◄───────────────────────────────│                              │
  │ { output: "Hi", error: false } │                              │
```

### Security Measures

- **Network isolation**: `--network none` — containers have no network access
- **Memory limits**: 256MB for code, 512MB for Java, extended for databases
- **CPU limits**: `--cpus 1` — single CPU core
- **Process limits**: `--ulimit nproc=64` — max 64 processes
- **File limits**: `--ulimit nofile=64` — max 64 open files
- **Read-only code**: `:ro` mount for code containers
- **Timeouts**: 30s for code execution, 120s for database startup
- **Cleanup**: Temp directories and containers always destroyed after execution

### Database Query Execution

For MySQL and PostgreSQL, a full database container is started temporarily:

1. Start container with the database image
2. Wait for the database to be ready (polling with health checks)
3. Execute the SQL query
4. Capture output (formatted table)
5. Kill and remove the container

### Error Handling

The playground has specific error messages for common Docker failures:

| Error | User Message |
|-------|-------------|
| Docker not running | "Docker is not running. Please start Docker Desktop and try again." |
| Image not found | "Docker image not found locally. Pulling images... Please try again in a moment." |
| Code timed out | "Execution timed out. Your code may have an infinite loop or be too complex." |
| Out of memory | "Out of memory. Your code used too much memory." |
| Code too large | "Code exceeds maximum length of 100KB" |

### Image Pre-pulling

On server startup, Docker images are checked and pulled in parallel in the background:

```bash
docker pull python:3.12-slim
docker pull node:22-slim
docker pull gcc:13.2-bookworm
docker pull mysql:8.0
docker pull postgres:16
docker pull eclipse-temurin:8-jdk-jammy
docker pull eclipse-temurin:11-jdk-jammy
docker pull eclipse-temurin:17-jdk-jammy
docker pull eclipse-temurin:21-jdk-jammy
```

### Docker Availability Check

On startup, the server automatically checks if Docker is available by running `docker info`:

```
✅ Docker available — playground execution enabled
⚠️  Docker not available — playground execution disabled
```

If Docker is unavailable (common on Render's free tier):
- The playground controller returns a **503** with a friendly message: "Code execution is not available on this server."
- The `runCode()` function also has a guard that throws `AppError(503)` as a safety net
- All other app features (chat, topics, profile) work normally

### Production Deployment

The playground **requires Docker** to execute code. On Render, Docker is only available on **paid plans** (Starter at $7/mo+). The free Node plan does not have a Docker daemon.

**Options for production:**
1. **Upgrade Render to Docker Web Service** ($7/mo) — Run the backend as a Docker container with Docker-in-Docker support for full playground functionality.
2. **Self-host Piston on a free Oracle Cloud VM** — Deploy the [Piston](https://github.com/engineer-man/piston) code execution engine on Oracle's free tier (4 cores, 24GB RAM), then point your Render backend to it via HTTP API.
3. **Graceful fallback** — When Docker is unavailable, the playground automatically detects this at startup and shows a clear message. No crashes, no empty responses.

See `DEPLOYMENT.md` for detailed deployment instructions.

---

## Question Card System

Questions are displayed using rich card components that support two formats:

### Coding Cards (`CodingCard.jsx`)

```
┌──────────────────────────────────────────┐
│ [Medium] [Java] [Frequent]               │
│                                          │
│ Two Sum — Find two numbers that add up   │
│ to a target value (LeetCode #1)          │
│                                          │
│ ──────── Expand/Collapse ────────        │
│                                          │
│ TIME: O(n)   SPACE: O(n)                 │
│                                          │
│ Approach: Use a hash map to store        │
│ seen values while iterating...           │
│                                          │
│ ┌──────────────────────────────────┐     │
│ │ class Solution {                 │     │
│ │   public int[] twoSum(...) {     │     │
│ │     ...                          │     │
│ │   }                              │     │
│ └──────────────────────────────────┘     │
│                                          │
│ ⚠ Warning: Watch for integer overflow    │
│ 💡 Tip: Try sorting first                │
└──────────────────────────────────────────┘
```

Supports: difficulty badge, custom tags, time/space complexity, approach description, code block with copy button, note/tip/warning callouts, problem number with color.

### Theory Cards (`TheoryCard.jsx`)

```
┌──────────────────────────────────────────┐
│ [Easy] [Frequent]                        │
│                                          │
│ What is the difference between an array  │
│ and a linked list?                       │
│                                          │
│ ──────── Expand/Collapse ────────        │
│                                          │
│ Arrays store elements contiguously...    │
│                                          │
│ ┌──────────────────────────────────┐     │
│ │ Key Differences:                 │     │
│ │ Array: O(1) access               │     │
│ │ List: O(n) access                │     │
│ └──────────────────────────────────┘     │
│                                          │
│ 📘 Note: Also be prepared to discuss...  │
└──────────────────────────────────────────┘
```

Supports: HTML explanations, tables with headers/rows, code blocks, note/tip/warning callouts, tags.

### Template JSON Files

Template files for the card format are stored at `server/data/templates/`:

- `coding-card.json` — Structure for a single coding problem
- `coding-section.json` — Group of coding problems under a category
- `theory-question.json` — Structure for a single theory question
- `theory-section.json` — Group of theory questions under a category

---

## Authentication Flow

### Auth Methods

The app supports three authentication methods:

1. **Email + Password** — Local account creation and login
2. **Google OAuth 2.0** — Sign in with Google account
3. **GitHub OAuth** — Sign in with GitHub account

### How Authentication Works

All auth sessions use an **HTTP-only cookie** named `ih_token` containing a custom HMAC-signed JWT (signed with `AUTH_SECRET`).

```
Auth Cookie: ih_token=<header>.<payload>.<signature>
  • httpOnly: true (not accessible via JavaScript)
  • sameSite: "lax" (sent for top-level navigations)
  • secure: true in production (HTTPS only)
  • maxAge: 7 days
```

### Password Auth Flow

```
Browser                              Server
  │                                     │
  │  POST /api/auth/login               │
  │  { email, password }                │
  │────────────────────────────────────►│
  │                                     │
  │  Verify password (scrypt hash)      │
  │  Create JWT token                   │
  │  Set ih_token cookie                │
  │◄────────────────────────────────────│
  │  { user: { id, email, name, ...} }  │
  │                                     │
  │  User stored in Zustand authStore   │
```

### Google OAuth Flow

```
Browser                         Express Server                    Google
  │                                  │                              │
  │ Click "Continue with Google"     │                              │
  │ window.location =                │                              │
  │  /api/auth/google?returnTo=...   │                              │
  │─────────────────────────────────►│                              │
  │                                  │  Set ih_oauth_state cookie   │
  │                                  │  Set ih_oauth_return_to ck   │
  │                                  │  302 → Google OAuth URL     │
  │◄─────────────────────────────────│                              │
  │                                  │                              │
  │ 302 → accounts.google.com        │                              │
  │───────────────────────────────────────────────────────────────►│
  │              User authenticates                                 │
  │◄───────────────────────────────────────────────────────────────│
  │              Redirect to callback URL                           │
  │                                                                 │
  │ GET /api/auth/google/callback?code=xxx&state=yyy                │
  │─────────────────────────────────►│                              │
  │                                  │  Verify state cookie ==      │
  │                                  │  state query param           │
  │                                  │  Exchange code for token     │
  │                                  │  Fetch user profile          │
  │                                  │  Find or create user in DB   │
  │                                  │  Set ih_token cookie         │
  │                                  │  302 → FRONTEND_URL/dashboard│
  │◄─────────────────────────────────│                              │
  │                                  │                              │
  │ Load React app at /dashboard     │                              │
  │ GET /api/auth/me (cookie sent)   │                              │
  │─────────────────────────────────►│                              │
  │                                  │  Verify token, return user   │
  │◄─────────────────────────────────│                              │
  │ setUser(res.data.user)           │                              │
```

**Key security measures:**
- OAuth state parameter prevents CSRF attacks
- State stored in HTTP-only cookie, verified on callback
- Google requires verified email (`email_verified: true`)
- On state mismatch, user is redirected to `/login?error=oauth_failed`

### GitHub OAuth Flow

Same pattern as Google, but:
- GitHub OAuth endpoint: `https://github.com/login/oauth/authorize`
- Token exchange: `https://github.com/login/oauth/access_token`
- Profile: `https://api.github.com/user` + `/user/emails`
- Requires a verified primary email

### Session Persistence

On every full page load, `App.jsx` calls `GET /api/auth/me` which:
1. Reads the `ih_token` cookie
2. Verifies the HMAC signature
3. Checks expiration (7-day TTL)
4. Looks up the user in PostgreSQL
5. Returns user data or clears the cookie

### Admin Detection

Admin status is determined by matching the user's email against the `ADMIN_EMAILS` environment variable. Admins see an "Admin" panel in the sidebar with user management, question CRUD, and analytics.

---

## Error Handling Architecture

The application uses a centralized error handling system:

### AppError Class

Custom error class with status codes and structured responses:

```js
throw new AppError(400, "Validation failed", { field: "email" });
// → { error: "Validation failed", details: { field: "email" } }
```

### Prisma Error Mapping

| Prisma Code | HTTP Status | Message |
|-------------|-------------|---------|
| `P2002` | 409 Conflict | "A record with this value already exists" |
| `P2025` | 404 Not Found | "Record not found" |
| `P1001` | 503 Service Unavailable | "Cannot connect to database" |
| `P2003` | 400 Bad Request | "Referenced record does not exist" |
| `P2014` | 400 Bad Request | "Required relation violation" |

### Network & Service Errors

| Condition | HTTP Status | Message |
|-----------|-------------|---------|
| Timeout | 503 | "External service unavailable" |
| Connection refused | 503 | "External service unavailable" |
| Docker daemon down | 503 | "Docker is not running" |
| Invalid JSON body | 400 | "Invalid JSON in request body" |

### Frontend Error Handling

The frontend playground (`PlaygroundPage.jsx`) has resilient fetch error handling:

- Checks the `content-type` header before parsing JSON — if the server returns HTML (e.g., proxy error when backend is down), it falls back to showing the response text
- Checks `res.ok` and displays the HTTP status code alongside the error message
- Catches network errors and displays them clearly in the output panel instead of crashing

In production, stack traces are hidden; in development they're included for debugging.

---

## Chat Flow (AI Conversation)

### Streaming Architecture

The chat uses **Server-Sent Events (SSE)** for real-time streaming:

```
Browser                          Server                        GROQ API
  │                                │                              │
  │ GET /api/chat/stream           │                              │
  │ ?sessionId=abc&message=...     │                              │
  │&mode=general                   │                              │
  │───────────────────────────────►│                              │
  │                                │  Fetch session history       │
  │                                │  Save user message to DB     │
  │                                │  Build system prompt by mode │
  │                                │                              │
  │                                │  POST /chat/completions      │
  │                                │  { stream: true, ... }       │
  │                                │─────────────────────────────►│
  │                                │                              │
  │ data: {"token":"The"}         │◄──── SSE chunk ──────────────│
  │◄──────────────────────────────│                              │
  │ data: {"token":" answer"}     │◄──── SSE chunk ──────────────│
  │◄──────────────────────────────│                              │
  │ data: {"token":" is..."}      │◄──── SSE chunk ──────────────│
  │◄──────────────────────────────│                              │
  │ data: {"done":true}           │                              │
  │◄──────────────────────────────│                              │
  │                                │  Save assistant message      │
  │                                │  (on response "finish" event)│
```

### Chat Modes

| Mode | System Prompt | Use Case |
|------|--------------|----------|
| `general` | Helpful AI assistant | Anything |
| `code` | Expert programmer | Debugging, code review |
| `interview` | Interview coach | Practice answers |
| `eli5` | Explain Like I'm 5 | Simple explanations |
| `rag` | Uses your documents | Chat with uploaded files |

### RAG (Retrieval-Augmented Generation)

When in `rag` mode:

```
User Question
      │
      ▼
getEmbedding(question)  ──►  Ollama nomic-embed-text
      │
      ▼
pgvector similarity search  ──►  SELECT ... ORDER BY embedding <-> query
      │
      ▼
Top 5 chunks with context + user question
      │
      ▼
Sent to GROQ as system prompt
      │
      ▼
GROQ answers ONLY from your documents
```

---

## Document Ingestion Pipeline

```
Upload PDF/DOCX or URL
      │
      ▼
extractPDF / extractDOCX / extractURL
      │
      ▼
chunkText(text, size=500, overlap=50)
      │
      ▼
For each chunk:
  getEmbedding(chunk)  ──►  Ollama embed model
  Store chunk + vector in DocumentChunk table
      │
      ▼
detectTopics(text)  ──►  Keyword matching → topic tags
      │
      ▼
generateQuestionsFromDocument  ──►  Ollama generates Q&A
      │
      ▼
Questions saved to Question table with source="ai_generated"
```

---

## Interview System

```
User selects topic + difficulty
      │
      ▼
Fetch questions matching topic & difficulty from DB
      │
      ▼
Create InterviewSession with question data
      │
      ▼
For each question:
  User submits answer
      │
      ▼
  Send to GROQ: "Score this answer 1-10"
      │
      ▼
  Parse JSON response: { score, feedback }
      │
      ▼
  Update session with score
      │
      ▼
After all questions:
  Calculate overall average score
  Mark session as completed
```

---

## Project Structure

```
interview-hub/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/               # ChatInput, MessageBubble, CodeBlock, etc.
│   │   │   ├── interview/          # CodingCard, TheoryCard, TopicCard, QuestionAccordion
│   │   │   └── ui/                 # Navbar, Sidebar, Toast, SkeletonLoader
│   │   ├── pages/                  # Login, Dashboard, Chat, Topic, Profile, Admin, Playground
│   │   ├── hooks/                  # useOllama (chat streaming hook)
│   │   ├── store/                  # Zustand: authStore, chatStore, uiStore
│   │   ├── services/               # api.js (Axios client with all endpoints)
│   │   ├── App.jsx                 # Router, protected routes, auth init
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Tailwind base styles
│   ├── vite.config.js              # Vite + React + API proxy
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                          # Express backend
    ├── app.js                       # Express app factory (CORS, helmet, rate-limit)
    ├── index.js                     # Server entry point
    ├── config.js                    # Environment config loader
    ├── routes/
    │   ├── auth.js                  # /api/auth/* (login, signup, OAuth, password reset)
    │   ├── chat.js                  # /api/chat/* (sessions, streaming, hints)
    │   ├── questions.js             # /api/questions/* (topics, questions)
    │   ├── interview.js             # /api/interview/* (start, answer, summary)
    │   ├── documents.js             # /api/documents/* (ingest, search, chunks)
    │   ├── progress.js              # /api/progress/* (tracking, bookmarks)
    │   ├── status.js                # /api/status (health check)
    │   ├── admin.js                 # /api/admin/* (users, questions, analytics)
    │   └── playground.js            # /api/playground/* (Docker code execution)
    ├── controllers/                 # Route handler logic
    ├── services/
    │   ├── groqService.js           # GROQ API (streaming + non-streaming chat)
    │   ├── ollamaService.js         # Ollama API (embeddings only)
    │   ├── dockerService.js         # Docker code execution (9 language images)
    │   ├── authService.js           # JWT creation/verification, password hashing
    │   ├── oauthService.js          # Google + GitHub OAuth flows
    │   ├── ragService.js            # Vector search + prompt building
    │   ├── documentParser.js        # PDF/DOCX/URL extraction, chunking
    │   └── embeddingService.js      # Store chunks + generate questions
    ├── middleware/
    │   ├── auth.js                  # requireAuth middleware (uses AppError)
    │   ├── admin.js                 # Admin role check
    │   ├── asyncHandler.js          # Async error wrapper
    │   ├── errorHandler.js          # Centralized error handler (AppError, Prisma, network)
    │   └── streamHandler.js         # SSE headers + keep-alive
    ├── prisma/
    │   ├── schema.prisma            # Database schema
    │   ├── client.js                # Prisma client singleton
    │   ├── seed.js                  # Question seeder
    │   └── migrations/              # Database migrations
    ├── data/
    │   ├── questions/               # Built-in JSON question files (12 topics)
    │   └── templates/               # Question card template JSON files
    └── tests/                       # API tests
```

---

## Sidebar Navigation

The sidebar provides quick access to:

| Item | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Topic overview with progress |
| Chat | `/chat` | AI chat with multiple modes |
| Topics | `/topics/:topic` | Subject pages (expandable list of 12 topics) |
| Coding (Playground) | `/playground` | Code playground with Docker execution |
| Profile | `/profile` | Account settings, password change |
| Admin | `/admin` | Admin panel (admin users only) |

---

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `User` | User accounts | id, email, name, passwordHash, createdAt |
| `PasswordResetToken` | Password reset flow | userId, tokenHash, expiresAt, usedAt |
| `ChatSession` | Chat conversations | userId, title, mode, model |
| `Message` | Individual messages | sessionId, role, content, sources (JSON) |
| `Question` | Interview questions | topic, questionText, answerText, difficulty, type |
| `RoadmapItem` | Study roadmap | topic, title, description, order |
| `Bookmark` | Saved questions | userId, questionId |
| `TopicProgress` | User progress | userId, topic, stepName, status |
| `Document` | Uploaded files | userId, filename, fileHash, status |
| `DocumentChunk` | Text chunks with vectors | documentId, chunkText, embedding (vector(768)) |
| `InterviewSession` | Mock interviews | userId, topic, difficulty, questionsData (JSON) |

---

## API Endpoints

### Authentication (`/api/auth/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | No | Create account |
| POST | `/login` | No | Email/password login |
| POST | `/logout` | No | Clear auth cookie |
| GET | `/me` | Required | Get current user |
| PUT | `/me` | Required | Update profile |
| PUT | `/password` | Required | Change password |
| POST | `/password/forgot` | No | Request reset |
| POST | `/password/reset` | No | Reset password |
| GET | `/config` | No | Auth methods available |
| GET | `/google` | No | Start Google OAuth |
| GET | `/google/callback` | No | Google OAuth callback |
| GET | `/github` | No | Start GitHub OAuth |
| GET | `/github/callback` | No | GitHub OAuth callback |

### Playground (`/api/playground/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/run` | Required | Execute code in Docker container |
| GET | `/languages` | Required | Get supported languages |

### Chat (`/api/chat/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sessions` | Required | List chat sessions |
| GET | `/sessions/:id` | Required | Get session messages |
| POST | `/sessions` | Required | Create session |
| DELETE | `/sessions/:id` | Required | Delete session |
| GET | `/stream` | Required | SSE streaming chat |
| POST | `/hint` | Required | Get coding hint |
| POST | `/review` | Required | Get code review |

### Questions (`/api/questions/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:topic` | No | Get questions by topic |
| GET | `/:topic/:id` | No | Get single question |
| GET | `/:topic/roadmap` | No | Get roadmap items |

### Interview (`/api/interview/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/start` | Required | Start mock interview |
| POST | `/answer` | Required | Submit answer, get score |
| GET | `/summary/:id` | Required | Get session results |

### Documents (`/api/documents/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ingest` | Required | Upload PDF/DOCX/URL |
| GET | `/` | Required | List documents |
| GET | `/:id/chunks` | Required | Preview chunks |
| DELETE | `/:id` | Required | Delete document |
| POST | `/generate-questions` | Required | AI generate Q&A |
| POST | `/search` | Required | Semantic search |

### Progress (`/api/progress/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Required | Get all progress |
| PUT | `/:topic/:step` | Required | Update progress |
| GET | `/bookmarks` | Required | List bookmarks |
| POST | `/bookmarks` | Required | Add bookmark |
| DELETE | `/bookmarks/:id` | Required | Remove bookmark |

### Admin (`/api/admin/*`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | Admin | Stats/analytics |
| GET | `/users` | Admin | List users |
| DELETE | `/users/:id` | Admin | Delete user |
| GET | `/questions` | Admin | List questions |
| POST | `/questions` | Admin | Create question |
| PUT | `/questions/:id` | Admin | Update question |
| DELETE | `/questions/:id` | Admin | Delete question |
| GET | `/progress` | Admin | All progress |
| DELETE | `/progress/:id` | Admin | Delete progress |
| GET | `/roadmap` | Admin | List roadmap |
| POST | `/roadmap` | Admin | Create roadmap item |
| PUT | `/roadmap/:id` | Admin | Update roadmap item |
| DELETE | `/roadmap/:id` | Admin | Delete roadmap item |

---

## Tech Stack

### Frontend
- **React 18** with functional components + hooks
- **Vite** for dev server and builds
- **Tailwind CSS** for styling (dark mode toggle)
- **React Router v6** for client-side routing
- **Zustand** for state management (auth, chat, UI)
- **Axios** for HTTP with `withCredentials: true`
- **Lucide React** for icons
- **Monaco Editor** (@monaco-editor/react) for code editing in playground

### Backend
- **Node.js** + **Express.js** (middleware-based architecture)
- **Prisma ORM** with PostgreSQL
- **pgvector** extension for vector similarity search
- **Custom JWT** (HMAC-SHA256 signed, no library needed)
- **scrypt** for password hashing (Node.js built-in)
- **Docker** for code execution (9 language images)

### AI Services
- **GROQ** — Primary LLM for chat, code review, interview scoring
- **Ollama** — Local embeddings for document vectorization

### Data Processing
- **pdf-parse** — PDF text extraction
- **mammoth** — DOCX text extraction
- **cheerio + axios** — Web scraping

---

## Setup (Quick)

### Prerequisites
- Node.js 16+
- PostgreSQL 13+ with pgvector extension (or Docker from docker-compose.yml)
- Docker Desktop (for playground code execution)
- Ollama installed (for document embeddings)

### Backend
```bash
cd server
cp .env.example .env
# Edit .env with your database URL, GROQ API key, OAuth credentials
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

### Docker Images (for Playground)
On first server start, Docker images are pulled automatically in the background.
Or pull them manually:
```bash
docker pull python:3.12-slim
docker pull node:22-slim
docker pull gcc:13.2-bookworm
docker pull eclipse-temurin:17-jdk-jammy
docker pull mysql:8.0
docker pull postgres:16
```

### Access
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Playground: `http://localhost:5173/playground`
- Ollama: `http://localhost:11434`

---

## OAuth Setup

### Google
1. Create OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com)
2. Add authorized redirect URI: `http://localhost:5173/api/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### GitHub
1. Create OAuth App in [GitHub Developer Settings](https://github.com/settings/developers)
2. Set callback URL: `http://localhost:5173/api/auth/github/callback`
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`

---

## Environment Variables (template only, no real values)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# GROQ (Primary AI chat)
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.1-8b-instant"

# Ollama (Local embeddings only)
OLLAMA_BASE_URL="http://localhost:11434"
EMBED_MODEL="nomic-embed-text"

# Server
PORT=5000
NODE_ENV="development"
AUTH_SECRET="at-least-32-random-chars"
FRONTEND_URL="http://localhost:5173"
ALLOW_PASSWORD_AUTH=true
ADMIN_EMAILS="admin@example.com"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:5173/api/auth/google/callback"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:5173/api/auth/github/callback"

# RAG
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_CHUNKS=5
```

---

## Deployment Architecture

```
Netlify                          Render                         Supabase
┌──────────┐    /api/* proxy     ┌──────────┐                  ┌──────────┐
│ Frontend │──────────────────►  │ Backend  │──────────────────►│PostgreSQL│
│ SPA      │   netlify.toml     │ Express  │  Prisma ORM      │+pgvector │
│ dist/    │                     │ :5000    │                  │          │
└──────────┘                     └────┬─────┘                  └──────────┘
                                      │
                                      ├── GROQ API (chat/score)
                                      │
                                      └── Docker (playground execution)
```

- **Frontend**: Netlify (static hosting, SPA redirect)
- **Backend**: Render Web Service (Node)
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI Chat**: GROQ (cloud API, no hosting needed)
- **Playground**: Docker on the backend machine
- **Embeddings**: Ollama on Render (or local machine)

See `DEPLOYMENT.md` for detailed deployment steps.

---

## Key Design Decisions

1. **GROQ over Ollama for chat**: GROQ provides faster inference (8B parameter model at cloud speed) vs running Ollama locally. Ollama is kept for embeddings since GROQ doesn't support them.

2. **Custom JWT instead of passport**: Lighter weight, no extra dependencies. HMAC-SHA256 signed tokens with the AUTH_SECRET. Token stored in HTTP-only cookie for XSS protection.

3. **Manual cookie parsing**: Instead of the `cookie-parser` middleware, cookies are parsed directly from the `Cookie` header. This keeps dependencies minimal.

4. **OAuth state in cookies**: State parameter is stored in an HTTP-only cookie rather than session storage. This avoids needing `express-session` and works with the stateless API design.

5. **SSE over WebSocket**: Server-Sent Events are simpler for one-way streaming (server → client). No WebSocket library needed, works over standard HTTP, and auto-reconnects.

6. **pgvector for RAG**: Vector similarity search is done directly in PostgreSQL using the pgvector extension. No need for a separate vector database like Pinecone or Weaviate.

7. **Docker containers for code execution**: Each language runs in its own isolated container with memory/CPU/network restrictions. Database queries spin up temporary containers that are destroyed after use.

8. **Centralized error handling**: All errors flow through a single middleware that maps Prisma error codes, network failures, and application errors to consistent JSON responses. In production, stack traces are hidden.
