"""Local Reference Document RAG manager using direct chromadb."""
from __future__ import annotations

import os
from pathlib import Path
from typing import List

import chromadb
from chromadb.utils import embedding_functions
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Set up local directories
STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage"
REFERENCE_DIR = STORAGE_DIR / "reference"
CHROMA_DIR = STORAGE_DIR / "chroma_db"

REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)


def get_embedding_function():
    """Get the OpenAI embedding function for Chroma."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set.")
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-3-small"
    )


def get_collection():
    """Get or create the local reference document Chroma collection."""
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name="local_rag_reference",
        embedding_function=get_embedding_function()
    )


def ingest_file(file_path: Path) -> None:
    """Split, embed, and index a reference document directly in Chroma."""
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    filename = file_path.name
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        raise RuntimeError(f"Failed to read file {filename}: {e}")

    # Use RecursiveCharacterTextSplitter from LangChain (safe, works perfectly)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len,
    )
    chunks = splitter.split_text(content)

    if not chunks:
        return

    collection = get_collection()

    # Clean up existing index for this file (overwrite index)
    delete_file_from_index(filename)

    # Add chunks with unique IDs and source metadata
    ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": filename, "file_path": str(file_path)} for _ in chunks]

    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas
    )


def delete_file_from_index(filename: str) -> None:
    """Purge all vector chunks associated with the given filename."""
    collection = get_collection()
    try:
        collection.delete(where={"source": filename})
    except Exception:
        # Ignore errors if collection doesn't exist yet or is empty
        pass


def retrieve_local_context(query: str, k: int = 6) -> List[dict]:
    """Retrieve top-k relevant document chunks directly from Chroma.
    
    Returns standard evidence dicts that match the frontend/agent interface.
    """
    collection = get_collection()
    try:
        # Run similarity query
        results = collection.query(
            query_texts=[query],
            n_results=k
        )
    except Exception:
        return []

    evidence_items = []
    if results and results.get("documents"):
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        for doc, meta in zip(documents, metadatas):
            source_file = meta.get("source", "unknown_doc")
            evidence_items.append({
                "title": f"Local Reference: {source_file}",
                "url": f"file://reference/{source_file}",
                "snippet": doc,
                "source": "local_rag",
                "published_at": None
            })

    return evidence_items
