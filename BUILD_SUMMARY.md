# Interview Hub - Build Summary

## ✅ Project Complete!

A full-stack Interview Preparation & AI Assistant Web Application with:
- **GROQ** for AI chat, code hints, and interview scoring (cloud LLM)
- **Docker** containers for isolated code execution in the playground
- **Ollama** for local document embeddings (RAG features)
- **Full authentication** with email/password, Google, and GitHub OAuth

---

## 📁 Project Structure

### Server (`/server`)
```
✅ index.js                    - Express app entry point + Docker startup check
✅ config.js                   - Configuration management
✅ .env.example                - Environment template

/routes
  ✅ auth.js                   - Auth endpoints (login, signup, OAuth, password reset)
  ✅ chat.js                   - Chat endpoints
  ✅ questions.js              - Questions endpoints
  ✅ interview.js              - Interview endpoints
  ✅ documents.js              - Document management
  ✅ progress.js               - Progress & bookmarks
  ✅ status.js                 - Health check (groq + db)
  ✅ admin.js                  - Admin endpoints (users, questions, roadmap)
  ✅ playground.js             - Docker code execution

/controllers
  ✅ authController.js         - Auth logic (email, Google, GitHub OAuth)
  ✅ chatController.js         - Chat logic & streaming
  ✅ questionController.js     - Question retrieval
  ✅ interviewController.js    - Interview scoring
  ✅ documentController.js     - Document ingestion
  ✅ progressController.js     - Progress tracking
  ✅ statusController.js       - Health checks (groq key: "online" or "offline")
  ✅ adminController.js        - Admin CRUD
  ✅ playgroundController.js   - Docker execution handler with 503 guard

/services
  ✅ groqService.js            - GROQ API (primary LLM for chat + scoring)
  ✅ ollamaService.js          - Ollama API (embeddings only)
  ✅ dockerService.js          - Docker code execution (9 language images)
  ✅ authService.js            - JWT creation/verification, password hashing
  ✅ oauthService.js           - Google + GitHub OAuth flows
  ✅ ragService.js             - Vector search & RAG
  ✅ documentParser.js         - PDF/DOCX/URL parsing
  ✅ embeddingService.js       - Vector embeddings

/middleware
  ✅ errorHandler.js           - Global error handling (AppError, Prisma codes, network)
  ✅ streamHandler.js          - SSE setup
  ✅ asyncHandler.js           - Async route wrapper
  ✅ auth.js                   - requireAuth middleware
  ✅ admin.js                  - Admin role check

/prisma
  ✅ schema.prisma             - Complete data schema (11 models)
  ✅ client.js                 - Prisma client
  ✅ seed.js                   - Database seeding

/data/questions
  ✅ 12 topic JSON files       - dsa, python, javascript, java, system_design, dbms
                                os, networking, react, nodejs, sql, devops

/data/templates
  ✅ coding-card.json          - Coding problem card template
  ✅ coding-section.json       - Coding section template
  ✅ theory-question.json      - Theory question template
  ✅ theory-section.json       - Theory section template

/data/questions/formatted
  ✅ 12 topic folders          - Each with theory.json and/or coding.json in template format
```

### Client (`/client`)
```
/src
  ✅ App.jsx                   - Main app with routing + auth init
  ✅ main.jsx                  - React entry point
  ✅ index.css                 - Tailwind styles + custom scrollbar

  /components
    /chat
      ✅ ChatWindow.jsx        - Main chat interface
      ✅ ChatInput.jsx         - Message input box
      ✅ ChatSidebar.jsx       - Session list
      ✅ MessageBubble.jsx     - Message display
      ✅ CodeBlock.jsx         - Code highlighting with copy button
      ✅ ModeSelector.jsx      - Chat mode buttons
      ✅ TypingIndicator.jsx   - Loading animation

    /interview
      ✅ TopicCard.jsx         - Topic selection card
      ✅ QuestionAccordion.jsx - Q&A accordion
      ✅ CodingCard.jsx        - Coding problem card (difficulty badge, tags, complexity)
      ✅ TheoryCard.jsx        - Theory question card (HTML explanations, expandable)

    /ui
      ✅ Navbar.jsx            - Top navigation with Chatbot status indicator
      ✅ Sidebar.jsx           - Left sidebar (Dashboard, Chat, Topics, Playground, Profile, Admin)
      ✅ Toast.jsx             - Notifications
      ✅ SkeletonLoader.jsx    - Loading skeletons
      ✅ OfflineBanner.jsx     - Status banner

  /pages
    ✅ LoginPage.jsx           - Login/signup with Google + GitHub OAuth buttons
    ✅ DashboardPage.jsx       - Topic dashboard with progress
    ✅ ChatPage.jsx            - Chat interface
    ✅ TopicPage.jsx           - Topic detail view with question cards
    ✅ PlaygroundPage.jsx      - Code playground with Monaco Editor + Docker execution
    ✅ ProfilePage.jsx         - Profile settings, password change
    ✅ AdminPage.jsx           - Admin panel (users, questions, roadmap)
    ✅ PlaceholderPage.jsx     - Placeholder template

  /store
    ✅ authStore.js            - Auth state (user, login/logout, admin)
    ✅ chatStore.js            - Chat state (Zustand)
    ✅ uiStore.js              - UI state (Zustand, dark mode)

  /hooks
    ✅ useOllama.js            - Ollama streaming hook

  /services
    ✅ api.js                  - Axios configuration & API calls

✅ vite.config.js             - Vite configuration
✅ tailwind.config.js         - Tailwind configuration
✅ postcss.config.js          - PostCSS configuration
✅ index.html                 - HTML template
✅ package.json               - Dependencies
```

### Configuration Files
```
✅ .env.example               - Environment template
✅ .gitignore                 - Git ignore rules
✅ README.md                  - Full documentation
✅ SETUP.md                   - Setup instructions
✅ DEPLOYMENT.md              - Production deployment guide
✅ PRODUCTION_CHECKLIST.md    - Release checklist
✅ QUICK_START.md             - Quick reference
```

---

## 🎨 Features Implemented

### ✅ Backend Features

**Chat System**
- SSE (Server-Sent Events) streaming for real-time AI responses via GROQ
- 5 distinct chat modes: General, Code, Interview, ELI5, RAG
- Session management with message history
- Non-streaming endpoints for hints and code reviews

**Authentication**
- Email + password login/signup with scrypt hashing
- Google OAuth 2.0 sign-in
- GitHub OAuth sign-in
- Custom JWT (HMAC-SHA256 signed) stored in HTTP-only cookie
- Password reset flow with tokens
- Admin role detection via ADMIN_EMAILS allowlist

**Code Playground**
- Isolated Docker container execution for 9 languages
- Resource limits: 256MB RAM, 1 CPU, network isolation, process/file limits
- Automatic Docker availability detection at startup
- Graceful 503 fallback when Docker is unavailable
- Image pre-pulling on server startup
- Database query execution (MySQL, PostgreSQL) with temp containers

**Document Management**
- PDF, DOCX, and URL ingestion
- Intelligent text chunking (500 chars, 50 overlap)
- SHA256 deduplication
- Topic auto-detection
- pgvector-powered semantic search
- Automatic question generation from documents

**Interview Features**
- Mock interview sessions
- AI-based scoring (1-10 scale) via GROQ
- Detailed feedback generation
- Performance analytics
- Weak area identification

**Question Management**
- 12 comprehensive topic collections (~60 questions)
- Difficulty filtering (easy/medium/hard)
- Type filtering (theory/coding)
- Source tracking (builtin/ai_generated/datafile)
- Bookmark system
- Template-based card formatting

**RAG (Retrieval-Augmented Generation)**
- Vector similarity search with pgvector
- Source citation tracking
- Context injection for accurate responses
- Top-K chunk retrieval

**Error Handling**
- Centralized error handler with AppError class
- Prisma error code mapping (P2002 → 409, P2025 → 404, etc.)
- Network/timeout error detection
- Docker-specific error messages
- Stack traces hidden in production

### ✅ Frontend Features

**Chat Interface**
- Real-time message streaming with typewriter effect
- Code block rendering with syntax highlighting
- Copy/Explain/Fix actions for code
- Source citations for RAG responses
- Chat mode selector with descriptions
- Session management with date grouping

**Dashboard**
- Topic cards with progress bars
- Difficulty distribution display
- Question count statistics
- Responsive grid layout

**Topic Page**
- Coding cards with difficulty badges, time/space complexity, approach, code blocks
- Theory cards with expandable HTML explanations, tables, callouts
- Tag display with color coding

**Playground**
- Monaco Editor with syntax highlighting
- Language selector (9 languages)
- Run button with loading state
- Output display with error handling
- Resilient fetch (content-type detection, status code display)

**Authentication UI**
- Login/signup forms with validation
- Google and GitHub OAuth buttons
- Password reset flow
- Profile settings with password change
- Admin panel for user/question/roadmap management

**UI/UX**
- Dark mode with persistent preference
- Smooth animations and transitions
- Status indicators for Chatbot & Database
- Toast notifications
- Skeleton loaders
- Responsive design (mobile-friendly)
- Custom scrollbar styling

**State Management**
- Zustand stores for auth, chat, and UI state
- Persistent localStorage for preferences

---

## 🗄️ Database Schema

**11 Models Created:**
1. **User** - User accounts with email, name, admin flag, OAuth IDs
2. **PasswordResetToken** - Password reset flow with expiry
3. **ChatSession** - Conversation threads
4. **Message** - Individual messages with optional JSON sources
5. **Question** - Interview questions with metadata
6. **Document** - Ingested documents info
7. **DocumentChunk** - Text chunks with pgvector embeddings (768d)
8. **Bookmark** - Bookmarked questions
9. **TopicProgress** - Roadmap tracking
10. **InterviewSession** - Mock interview results with questions data
11. **RoadmapItem** - Study roadmap items

**Key Features:**
- Full cascade delete relationships
- Vector column support (pgvector)
- JSONB for flexible data storage (sources, questionsData)
- Efficient indexing for queries
- UUID primary keys

---

## 🔗 API Endpoints (39 Total)

### Auth (10 endpoints)
- POST `/api/auth/signup` - Create account
- POST `/api/auth/login` - Email/password login
- POST `/api/auth/logout` - Clear auth cookie
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/me` - Update profile
- PUT `/api/auth/password` - Change password
- POST `/api/auth/password/forgot` - Request reset
- POST `/api/auth/password/reset` - Reset password
- GET `/api/auth/google` - Google OAuth start
- GET `/api/auth/github` - GitHub OAuth start

### Playground (2 endpoints)
- POST `/api/playground/run` - Execute code
- GET `/api/playground/languages` - List languages

### Chat (6 endpoints)
- GET `/api/chat/sessions`
- GET `/api/chat/sessions/:id`
- POST `/api/chat/sessions`
- DELETE `/api/chat/sessions/:id`
- GET `/api/chat/stream` (SSE)
- POST `/api/chat/hint`
- POST `/api/chat/review`

### Questions (2 endpoints)
- GET `/api/questions/:topic`
- GET `/api/questions/:topic/:id`

### Interview (3 endpoints)
- POST `/api/interview/start`
- POST `/api/interview/answer`
- GET `/api/interview/summary/:id`

### Documents (6 endpoints)
- POST `/api/documents/ingest`
- GET `/api/documents`
- GET `/api/documents/:id/chunks`
- DELETE `/api/documents/:id`
- POST `/api/documents/generate-questions`
- POST `/api/documents/search`

### Progress & Bookmarks (5 endpoints)
- GET `/api/progress`
- PUT `/api/progress/:topic/:step`
- GET `/api/progress/bookmarks`
- POST `/api/progress/bookmarks`
- DELETE `/api/progress/bookmarks/:id`

### Admin (10 endpoints)
- GET `/api/admin/dashboard`
- GET `/api/admin/users`
- DELETE `/api/admin/users/:id`
- GET `/api/admin/questions`
- POST/PUT/DELETE `/api/admin/questions/:id`
- GET `/api/admin/progress`
- DELETE `/api/admin/progress/:id`
- CRUD `/api/admin/roadmap`

### Status (1 endpoint)
- GET `/api/status` => `{"groq": "online", "database": "connected"}`

---

## 📦 Key Dependencies

### Backend (14 core)
- express, cors, @prisma/client — Server framework + ORM
- dotenv, uuid — Config + utilities
- axios, node-fetch — HTTP clients
- pdf-parse, mammoth, cheerio — Document parsing
- multer — File uploads

### Frontend (15 core)
- react, react-dom, react-router-dom — Core UI
- zustand — State management
- @monaco-editor/react — Code editor (playground)
- axios — HTTP client
- react-hot-toast — Notifications
- lucide-react — Icons
- tailwindcss + postcss — Styling

---

## 🚀 Key Architecture Decisions

1. **GROQ over Ollama for chat** — Faster cloud inference vs slow local CPU. Ollama kept only for embeddings.
2. **Custom JWT** — Lighter than passport.js, HMAC-SHA256 signed, stored in HTTP-only cookie.
3. **SSE over WebSocket** — Simpler for one-way streaming, auto-reconnects, no extra libraries.
4. **pgvector** — Vector search in PostgreSQL, no separate vector database needed.
5. **Docker containers for code** — Each language in isolated container with resource limits.
6. **Zustand** — Simpler than Redux, built-in persistence.
7. **Centralized error handling** — Single middleware for Prisma errors, network failures, AppError.
8. **OAuth state in HTTP-only cookies** — Avoids sessions, CSRF protection.

---

## 🎯 What's Running Now

✅ GROQ-powered chat with 5 modes
✅ Code Playground with Docker (9 languages)
✅ Full auth (email, Google, GitHub)
✅ Admin panel for user/roadmap management
✅ 60+ questions across 12 topics
✅ Coding + Theory card system
✅ Dark mode
✅ Document RAG (requires Ollama)
✅ Mock interview with AI scoring
✅ Docker availability auto-detection
✅ Complete production deployment docs

---

## 📖 Quick Reference

**Ports:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432 (or localhost:5433 for Docker)
- GROQ: cloud API (groq.com)
- Ollama: http://localhost:11434 (optional)

**Key Commands:**
- Backend dev: `cd server && npm run dev`
- Frontend dev: `cd client && npm run dev`
- DB studio: `npx prisma studio`
- Re-seed: `node prisma/seed.js`
- Migrate: `npx prisma migrate deploy`
- Transform questions: `node scripts/transform-questions.js`

---

**🎓 Happy Learning & Coding! 🚀**

*Your full-stack, AI-powered interview preparation platform with Docker playground and GROQ chat!*
