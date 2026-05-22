"""Pydantic schemas for FastAPI request / response models."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


# ---------- Requests ----------
class GenerateRequest(BaseModel):
    topic: str
    as_of: Optional[str] = None  # ISO date, defaults to today


class RewriteRequest(BaseModel):
    feedback: str


class PublishRequest(BaseModel):
    repo: Optional[str] = None
    branch: Optional[str] = None
    file_path: Optional[str] = None


class UpdateRunRequest(BaseModel):
    status: Optional[str] = None
    final_md: Optional[str] = None


# ---------- Responses ----------
class RunSummary(BaseModel):
    id: int
    topic: str
    blog_title: Optional[str] = None
    created_at: Optional[str] = None
    mode: Optional[str] = None
    blog_kind: Optional[str] = None
    status: Optional[str] = None
    github_pushed: Optional[bool] = None
    github_url: Optional[str] = None


class RunDetail(RunSummary):
    final_md: Optional[str] = None


class GenerateResponse(BaseModel):
    run_id: Optional[int] = None
    blog_title: str = ""
    mode: str = ""
    blog_kind: str = ""
    final_md: str = ""
    plan: Optional[dict] = None
    evidence: Optional[List[dict]] = None
    image_specs: Optional[List[dict]] = None


class PublishResponse(BaseModel):
    html_url: str
    sha: str


class MessageResponse(BaseModel):
    message: str
