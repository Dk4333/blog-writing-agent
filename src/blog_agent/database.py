"""Neon PostgreSQL persistence for blog runs."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

_ALLOWED_UPDATE_FIELDS = frozenset(
    {"blog_title", "final_md", "status", "github_pushed", "github_url", "mode", "blog_kind"}
)


def db_available() -> bool:
    return bool(os.getenv("DATABASE_URL"))


@contextmanager
def _get_conn():
    import psycopg2

    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set.")
    conn = psycopg2.connect(url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create the blog_runs table if it doesn't exist."""
    if not db_available():
        return
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS blog_runs (
                    id            SERIAL PRIMARY KEY,
                    topic         TEXT NOT NULL,
                    blog_title    TEXT,
                    created_at    TIMESTAMPTZ DEFAULT NOW(),
                    mode          TEXT,
                    blog_kind     TEXT,
                    final_md      TEXT,
                    status        TEXT DEFAULT 'draft',
                    github_pushed BOOLEAN DEFAULT false,
                    github_url    TEXT
                )
            """)


def save_run(
    topic: str,
    blog_title: str,
    mode: str,
    blog_kind: str,
    final_md: str,
    status: str = "draft",
) -> int:
    """Insert a new blog run and return its id."""
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO blog_runs (topic, blog_title, mode, blog_kind, final_md, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (topic, blog_title, mode, blog_kind, final_md, status),
            )
            return cur.fetchone()[0]


def update_run(run_id: int, **fields: Any) -> None:
    """Update allowed fields on a blog run."""
    safe = {k: v for k, v in fields.items() if k in _ALLOWED_UPDATE_FIELDS}
    if not safe:
        return
    set_clause = ", ".join(f"{k} = %s" for k in safe)
    values = list(safe.values()) + [run_id]
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE blog_runs SET {set_clause} WHERE id = %s", values)  # noqa: S608


def list_runs(limit: int = 50) -> List[Dict[str, Any]]:
    """Return recent blog runs (newest first), without full markdown."""
    from psycopg2.extras import RealDictCursor

    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, topic, blog_title, created_at, mode, blog_kind, "
                "status, github_pushed, github_url "
                "FROM blog_runs ORDER BY created_at DESC LIMIT %s",
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]


def get_run(run_id: int) -> Optional[Dict[str, Any]]:
    """Fetch a single blog run by id (includes full markdown)."""
    from psycopg2.extras import RealDictCursor

    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM blog_runs WHERE id = %s", (run_id,))
            row = cur.fetchone()
            return dict(row) if row else None
