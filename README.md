# Blog Writing Agent

An AI-powered blog writing agent built with **LangGraph**, **LangChain**, and **OpenAI**, featuring local **RAG grounding** (via Chroma), live web research via **Tavily**, human-in-the-loop review, GitHub publishing, and Neon PostgreSQL persistence.

## Architecture

```
React Frontend (Vite + TypeScript)
        │  HTTP /api/*  (nginx reverse proxy)
        ▼
FastAPI Backend  ──►  LangGraph Pipeline
        │                    │
        │              Router → Research (Tavily + Local RAG)
        │              → Orchestrator (with retry)
        │              → Parallel Workers (fan-out via Send)
        │              → Reducer (merge → images)
        │              → Human Review (interrupt ⏸️)
        │              → Publish (if approved ✅)
        ▼
Neon PostgreSQL          GitHub Contents API
(blog_runs table +       (publish approved posts)
 checkpoint storage)
```

## Features

- **Multi-agent pipeline** — Router → Orchestrator → Parallel Section Writers → Reducer → Human Review → Publish, orchestrated with LangGraph
- **Fan-out / fan-in** — workers run in parallel via LangGraph `Send()` API
- **Human-in-the-loop approval** — graph pauses via LangGraph `interrupt()` after blog generation; user approves or rejects via `POST /api/runs/{id}/approve`, which resumes the graph with `Command(resume=...)`
- **Integrated GitHub publishing** — approved posts are pushed to GitHub directly from within the LangGraph pipeline (no separate publish call needed)
- **Local RAG Grounding** — upload local reference drafts, notes, or APIs via React UI to ground new posts in private or complex domain knowledge
- **Live web research** — optional Tavily search with citations
- **LLM-based rewriter** — revise blog with natural language feedback
- **Neon PostgreSQL persistence** — all runs stored with full history; LangGraph checkpoints persisted via `PostgresSaver`
- **AI image generation** — automatic image planning with graceful fallback on failure
- **Retry-resilient LLM calls** — structured output calls retry on validation failures
- **Frontend** — React + TypeScript + Vite, served via nginx in production
- **Docker** — single `docker compose up --build` starts everything
- **Chroma Vector DB** — fully local vector storage and semantic lookup for uploaded documents

## Project Structure

```
blog-writing-agent/
├── backend/
│   ├── src/
│   │   └── blog_agent/
│   │       ├── agent.py              # LangGraph pipeline (router, orchestrator, workers, reducer, human_review, publish)
│   │       ├── database.py           # Neon PostgreSQL persistence (blog_runs + thread_id)
│   │       ├── github_publisher.py   # GitHub Contents API integration
│   │       ├── rewriter.py           # LLM-based blog rewriter
│   │       ├── rag.py                # Local reference document RAG indexing & querying
│   │       └── api/
│   │           ├── main.py           # FastAPI app (11 endpoints, interrupt/resume support)
│   │           └── schemas.py        # Pydantic request/response models
│   ├── storage/                      # Local database and document storage
│   │   ├── chroma_db/                # Chroma SQLite collection files
│   │   └── reference/                # Copied user reference text/markdown documents
│   ├── notebooks/                    # Exploratory Jupyter notebooks
│   ├── outputs/                      # Generated blog posts & images
│   ├── tests/                        # Backend tests
│   ├── Dockerfile                    # Python 3.11-slim + uvicorn
│   ├── pyproject.toml                # Backend Python package config
│   └── requirements.txt              # Pinned dependencies
├── frontend/                         # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/client.ts             # Fetch calls to FastAPI (relative paths)
│   │   ├── pages/Generate.tsx        # Blog generation + HITL
│   │   ├── pages/History.tsx         # Past runs
│   │   └── components/               # Navbar, StatusBadge
│   ├── Dockerfile                    # Multi-stage: Node build → Nginx
│   └── nginx.conf                    # SPA routing + /api/ proxy → backend:8000
├── docker-compose.yml                # Wires backend + frontend
├── .env                              # API keys (never commit)
├── .env.example                      # Environment variable template
├── pyproject.toml                    # Root project config
└── requirements.txt                  # Root requirements (if needed)
```

## Quick Start

### Option A — Docker (recommended)

```bash
git clone <repo-url>
cd blog-writing-agent
cp .env.example .env   # fill in your API keys
docker compose up --build
```

- React UI → http://localhost:3080
- FastAPI docs → http://localhost:8088/docs

### Option B — Local development

```bash
git clone <repo-url>
cd blog-writing-agent
python -m venv .venv
source .venv/bin/activate
pip install -e ./backend

cp .env.example .env   # fill in your API keys

# Terminal 1 — FastAPI backend
cd backend
PYTHONPATH=src uvicorn blog_agent.api.main:app --reload --port 8000

# Terminal 2 — React frontend (set VITE_API_URL for local dev)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
# → http://localhost:5173
```
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | Run the blog agent; returns `status: "awaiting_approval"` + `thread_id` at the interrupt point |
| `POST` | `/api/runs/{id}/approve` | Resume the paused graph with `{"approved": true/false}` — publishes to GitHub if approved |
| `GET` | `/api/runs` | List all past runs |
| `GET` | `/api/runs/{id}` | Get a single run |
| `PATCH` | `/api/runs/{id}` | Update run fields |
| `POST` | `/api/runs/{id}/rewrite` | Rewrite with feedback |
| `POST` | `/api/runs/{id}/publish` | ~~Publish to GitHub~~ *(deprecated — use `/approve` instead)* |
| `GET` | `/api/rag/files` | List all uploaded reference documents |
| `POST` | `/api/rag/upload` | Upload and index a reference document (supports .md, .txt, .html) |
| `DELETE` | `/api/rag/files/{filename}` | Delete reference document from storage and purge database vectors |

### Two-Phase Generate → Approve Flow

```
1. POST /api/generate {"topic": "..."}
   → Pipeline runs: Router → Research → Orchestrator → Workers → Reducer
   → Graph pauses at human_review node (interrupt)
   → Response: {final_md, status: "awaiting_approval", thread_id, run_id}

2. POST /api/runs/{id}/approve {"approved": true}
   → Graph resumes → publish node pushes to GitHub
   → Response: {status: "published", github_url: "https://..."}

   OR

2. POST /api/runs/{id}/approve {"approved": false}
   → Graph ends without publishing
   → Response: {status: "rejected", github_url: ""}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (primary LLM + image generation) |
| `GROQ_API_KEY` | Groq API key (optional, fast inference) |
| `TAVILY_API_KEY` | Tavily search API key |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GITHUB_TOKEN` | GitHub personal access token |
| `GITHUB_REPO` | Target repo for publishing (`owner/repo`) |
| `GITHUB_BRANCH` | Branch to push to (default: `main`) |
| `GOOGLE_API_KEY` | Google API key (optional) |

## Notebooks

| Notebook | Description |
|----------|-------------|
| `1_bwa_basic.ipynb` | Basic agent setup |
| `2_bwa_improved_prompting.ipynb` | Improved prompt engineering |
| `3_bwa_research.ipynb` | Research-enabled agent |
| `4_bwa_research_fine_tuned.ipynb` | Fine-tuned research agent |
| `5_bwa_image.ipynb` | Image generation integration |

## License

MIT
