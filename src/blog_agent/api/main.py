"""FastAPI backend for the Blog Writing Agent."""
from __future__ import annotations

import os
import re
from datetime import date
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from blog_agent.agent import app as langgraph_app
from blog_agent.database import (
    db_available,
    init_db,
    save_run,
    update_run,
    list_runs,
    get_run,
)
from blog_agent.github_publisher import github_available, publish_to_github
from blog_agent.rewriter import rewrite_with_feedback

from .schemas import (
    GenerateRequest,
    GenerateResponse,
    RewriteRequest,
    PublishRequest,
    PublishResponse,
    UpdateRunRequest,
    RunSummary,
    RunDetail,
    MessageResponse,
)

app = FastAPI(title="Blog Writing Agent API", version="0.1.0")

# Allow React dev server (localhost:5173) and any origin for now
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    if db_available():
        try:
            init_db()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("DB init failed (running without persistence): %s", e)


# ---------- Helpers ----------
def _safe_slug(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9 _-]+", "", s)
    s = re.sub(r"\s+", "_", s).strip("_")
    return s or "blog"


# ---------- Routes ----------


@app.get("/api/health")
def health():
    return {"status": "ok", "db": db_available(), "github": github_available()}


@app.post("/api/generate", response_model=GenerateResponse)
def generate_blog(req: GenerateRequest):
    """Run the full LangGraph pipeline and return the blog."""
    as_of = req.as_of or date.today().isoformat()

    inputs = {
        "topic": req.topic.strip(),
        "mode": "",
        "needs_research": False,
        "queries": [],
        "evidence": [],
        "plan": None,
        "as_of": as_of,
        "recency_days": 7,
        "sections": [],
        "merged_md": "",
        "md_with_placeholders": "",
        "image_specs": [],
        "final": "",
    }

    try:
        out = langgraph_app.invoke(inputs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    plan_obj = out.get("plan")
    blog_title = ""
    blog_kind = ""
    plan_dict = None
    if plan_obj:
        if hasattr(plan_obj, "model_dump"):
            plan_dict = plan_obj.model_dump()
            blog_title = plan_obj.blog_title
            blog_kind = plan_obj.blog_kind
        elif isinstance(plan_obj, dict):
            plan_dict = plan_obj
            blog_title = plan_obj.get("blog_title", "")
            blog_kind = plan_obj.get("blog_kind", "")

    evidence = out.get("evidence", [])
    evidence_dicts = [
        e.model_dump() if hasattr(e, "model_dump") else e for e in evidence
    ]

    run_id = None
    if db_available():
        try:
            run_id = save_run(
                topic=req.topic.strip(),
                blog_title=blog_title,
                mode=out.get("mode", ""),
                blog_kind=blog_kind,
                final_md=out.get("final", ""),
            )
        except Exception:
            pass

    return GenerateResponse(
        run_id=run_id,
        blog_title=blog_title,
        mode=out.get("mode", ""),
        blog_kind=blog_kind,
        final_md=out.get("final", ""),
        plan=plan_dict,
        evidence=evidence_dicts,
        image_specs=out.get("image_specs"),
    )


@app.get("/api/runs", response_model=List[RunSummary])
def get_runs(limit: int = 50):
    """List recent blog runs."""
    if not db_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    runs = list_runs(limit=limit)
    for r in runs:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return runs


@app.get("/api/runs/{run_id}", response_model=RunDetail)
def get_run_detail(run_id: int):
    """Fetch a single blog run with full markdown."""
    if not db_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.get("created_at"):
        run["created_at"] = str(run["created_at"])
    return run


@app.patch("/api/runs/{run_id}", response_model=MessageResponse)
def patch_run(run_id: int, req: UpdateRunRequest):
    """Update status or final_md on a run."""
    if not db_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    fields = {}
    if req.status is not None:
        fields["status"] = req.status
    if req.final_md is not None:
        fields["final_md"] = req.final_md
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_run(run_id, **fields)
    return MessageResponse(message="Updated")


@app.post("/api/runs/{run_id}/rewrite", response_model=RunDetail)
def rewrite_run(run_id: int, req: RewriteRequest):
    """Rewrite a blog with feedback and save to DB."""
    if not db_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    current_md = run.get("final_md", "")
    if not current_md:
        raise HTTPException(status_code=400, detail="No markdown to rewrite")

    new_md = rewrite_with_feedback(current_md, req.feedback.strip())
    update_run(run_id, final_md=new_md, status="draft")

    updated = get_run(run_id)
    if updated and updated.get("created_at"):
        updated["created_at"] = str(updated["created_at"])
    return updated


@app.post("/api/runs/{run_id}/publish", response_model=PublishResponse)
def publish_run(run_id: int, req: PublishRequest):
    """Push blog markdown to GitHub."""
    if not github_available():
        raise HTTPException(status_code=503, detail="GITHUB_TOKEN not set")
    if not db_available():
        raise HTTPException(status_code=503, detail="Database not configured")

    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    final_md = run.get("final_md", "")
    if not final_md:
        raise HTTPException(status_code=400, detail="No markdown to publish")

    blog_title = run.get("blog_title") or run.get("topic", "blog")
    repo = req.repo or os.getenv("GITHUB_REPO", "")
    branch = req.branch or os.getenv("GITHUB_BRANCH", "main")
    file_path = req.file_path or f"posts/{_safe_slug(blog_title)}.md"

    if not repo:
        raise HTTPException(status_code=400, detail="No repository specified")

    result = publish_to_github(
        content=final_md,
        file_path=file_path,
        repo=repo,
        commit_message=f"Add blog: {blog_title}",
        branch=branch,
    )

    update_run(run_id, status="published", github_pushed=True, github_url=result.get("html_url", ""))
    return PublishResponse(html_url=result["html_url"], sha=result["sha"])
