"""Publish blog posts to GitHub via the Contents API."""
from __future__ import annotations

import base64
import os
from typing import Optional

import requests


def github_available() -> bool:
    return bool(os.getenv("GITHUB_TOKEN"))


def publish_to_github(
    content: str,
    file_path: str,
    repo: str,
    commit_message: str,
    branch: str = "main",
    token: Optional[str] = None,
) -> dict:
    """
    Create or update a file in *repo* via the GitHub Contents API.

    Returns ``{"html_url": ..., "sha": ...}`` on success.
    """
    token = token or os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN is not set.")

    api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    # If the file already exists we need its SHA for an update
    sha = None
    resp = requests.get(api_url, headers=headers, params={"ref": branch}, timeout=15)
    if resp.status_code == 200:
        sha = resp.json().get("sha")

    payload: dict = {
        "message": commit_message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha

    resp = requests.put(api_url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()

    data = resp.json()
    return {
        "html_url": data.get("content", {}).get("html_url", ""),
        "sha": data.get("content", {}).get("sha", ""),
    }
