"""Rewrite a blog post based on human feedback."""
from __future__ import annotations

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

REWRITE_SYSTEM = """You are a senior technical editor.
Revise the blog post based on the reviewer's feedback.

Rules:
- Preserve the overall structure (same sections, same flow).
- Apply the specific feedback precisely.
- Keep the same Markdown formatting.
- Output the FULL revised blog post in Markdown.
- Do not add commentary — output only the blog content.
"""


def rewrite_with_feedback(
    current_md: str,
    feedback: str,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
) -> str:
    """Return a revised version of *current_md* incorporating *feedback*."""
    llm = ChatGroq(model=model)
    result = llm.invoke(
        [
            SystemMessage(content=REWRITE_SYSTEM),
            HumanMessage(
                content=f"Current blog:\n\n{current_md}\n\n---\nFeedback:\n{feedback}"
            ),
        ]
    )
    return result.content.strip()
