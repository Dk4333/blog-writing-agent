# Blog Writing Agent

An AI-powered blog writing agent built with **LangGraph**, **LangChain**, and **Groq (Llama 4 Scout)**, featuring live web research via **Tavily**, human-in-the-loop review, GitHub publishing, and Neon PostgreSQL persistence.

## Architecture

```
React Frontend (Vite + TypeScript)
        │  HTTP /api/*
        ▼
FastAPI Backend  ──►  LangGraph Pipeline
        │                    │
        │              Router → Research (Tavily)
        │              → Orchestrator
        │              → Parallel Workers (fan-out via Send)
        │              → Reducer (merge → images)
        ▼
Neon PostgreSQL          GitHub Contents API
(blog_runs table)        (publish approved posts)
```

## Features

- **Multi-agent pipeline** — Router → Orchestrator → Parallel Section Writers → Reducer, orchestrated with LangGraph
- **Fan-out / fan-in** — workers run in parallel via LangGraph `Send()` API
- **Live web research** — optional Tavily search with citations
- **Human-in-the-loop (HITL)** — review, approve, or request rewrites before publishing
- **LLM-based rewriter** — revise blog with natural language feedback
- **GitHub publishing** — push approved posts directly to a GitHub repo via Contents API
- **Neon PostgreSQL persistence** — all runs stored with full history
- **Dual frontend** — React (primary) + Streamlit (legacy, still works)
- **Docker** — single `docker compose up --build` starts everything

## Project Structure

```
blog-writing-agent/
├── src/
│   └── blog_agent/
│       ├── agent.py              # LangGraph pipeline
│       ├── database.py           # Neon PostgreSQL persistence
│       ├── github_publisher.py   # GitHub Contents API integration
│       ├── rewriter.py           # LLM-based blog rewriter
│       ├── api/
│       │   ├── main.py           # FastAPI app (7 endpoints)
│       │   └── schemas.py        # Pydantic request/response models
│       └── frontend/
│           └── app.py            # Streamlit UI (legacy)
├── frontend/                     # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/client.ts         # Fetch calls to FastAPI
│   │   ├── pages/Generate.tsx    # Blog generation + HITL
│   │   ├── pages/History.tsx     # Past runs
│   │   └── components/           # Navbar, StatusBadge
│   ├── Dockerfile                # Multi-stage: Node build → Nginx
│   └── nginx.conf                # SPA routing + /api/ proxy
├── Dockerfile.backend            # Python 3.11-slim + uvicorn
├── docker-compose.yml            # Wires backend + frontend
├── notebooks/                    # Exploratory Jupyter notebooks
├── outputs/                      # Generated blog posts & images
├── .env                          # API keys (never commit)
├── .env.example                  # Environment variable template
├── pyproject.toml
└── requirements.txt
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
pip install -e .

cp .env.example .env   # fill in your API keys

# Terminal 1 — FastAPI backend
uvicorn blog_agent.api.main:app --reload --port 8000

# Terminal 2 — React frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Or run the legacy Streamlit UI
streamlit run src/blog_agent/frontend/app.py
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | Run the blog agent |
| `GET` | `/api/runs` | List all past runs |
| `GET` | `/api/runs/{id}` | Get a single run |
| `PATCH` | `/api/runs/{id}` | Update run fields |
| `POST` | `/api/runs/{id}/rewrite` | Rewrite with feedback |
| `POST` | `/api/runs/{id}/publish` | Publish to GitHub |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (LLM provider) |
| `TAVILY_API_KEY` | Tavily search API key |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GITHUB_TOKEN` | GitHub personal access token |
| `GITHUB_REPO` | Target repo for publishing (`owner/repo`) |
| `GITHUB_BRANCH` | Branch to push to (default: `main`) |
| `OPENAI_API_KEY` | OpenAI key (optional, unused by default) |

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
