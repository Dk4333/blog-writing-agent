# Blog Writing Agent

An AI-powered blog writing agent built with **LangGraph**, **LangChain**, and **OpenAI GPT-4o**, featuring web research via **Tavily** and a **Streamlit** frontend.

## Features

- Multi-agent pipeline: Router → Orchestrator → Parallel Workers → Reducer
- Optional live web research with citation support
- Automatic AI image generation and placement
- Streamlit UI with real-time streaming progress
- Export as `.md` or `.zip` (Markdown + images)

## Project Structure

```
blog-writing-agent/
├── src/
│   └── blog_agent/
│       ├── __init__.py
│       ├── agent.py          # LangGraph agent & state machine
│       └── frontend/
│           ├── __init__.py
│           └── app.py        # Streamlit frontend
├── notebooks/                # Exploratory Jupyter notebooks
├── outputs/                  # Generated blog posts (.md) & images
│   └── images/
├── tests/                    # Unit & integration tests
├── .env                      # API keys (never commit)
├── .env.example              # Environment variable template
├── pyproject.toml            # Project metadata & build config
├── requirements.txt          # Pinned dependencies
└── README.md
```

## Quick Start

### 1. Clone & create a virtual environment

```bash
git clone <repo-url>
cd blog-writing-agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
# or install as a package (editable):
pip install -e .
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

### 4. Run the Streamlit frontend

```bash
streamlit run src/blog_agent/frontend/app.py
```

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `TAVILY_API_KEY` | Tavily search API key |

## Notebooks

Exploratory notebooks live in `notebooks/`:

| Notebook | Description |
|---|---|
| `01_basic.ipynb` | Basic agent setup |
| `02_improved_prompting.ipynb` | Improved prompt engineering |
| `03_research.ipynb` | Research-enabled agent |
| `04_research_fine_tuned.ipynb` | Fine-tuned research agent |
| `05_image.ipynb` | Image generation integration |

## License

MIT
