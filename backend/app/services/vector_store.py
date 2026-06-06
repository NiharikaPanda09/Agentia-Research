import json
import math
import hashlib
import numpy as np
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.all_models import DocumentChunk, UploadedFile

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def _get_mock_embedding(text: str) -> list:
    # Deterministic mock vector generation for local execution
    hash_bytes = hashlib.sha256(text.encode("utf-8")).digest()
    state = int.from_bytes(hash_bytes[:4], byteorder="big")
    # Simple LCG pseudo-random generation to avoid heavy numpy seed locks
    vec = []
    val = state
    for _ in range(768):
        val = (1103515245 * val + 12345) & 0x7fffffff
        vec.append((val / 0x7fffffff) * 2.0 - 1.0)
    # Normalize vector
    magnitude = math.sqrt(sum(x*x for x in vec))
    if magnitude > 0:
        vec = [x / magnitude for x in vec]
    return vec

def get_embedding(text: str) -> list:
    """
    Generates a 768-dimensional embedding vector for the input text.
    If no GEMINI_API_KEY is available, generates a deterministic pseudo-random
    vector based on the hash of the text.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        return _get_mock_embedding(text)

    try:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return response["embedding"]
    except Exception as e:
        print(f"Error generating embedding from Gemini: {e}. Falling back to mock vector.")
        return _get_mock_embedding(text)

def cosine_similarity(v1: list, v2: list) -> float:
    """Calculates cosine similarity between two lists of floats."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_a = math.sqrt(sum(x * x for x in v1))
    norm_b = math.sqrt(sum(x * x for x in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def search_workspace_documents(db: Session, query_text: str, workspace_id: str, limit: int = 5) -> list:
    """
    Performs a vector search for the query text across all chunks in a workspace.
    Determines dialect and performs in-memory fallback if using SQLite.
    """
    query_vector = get_embedding(query_text)
    
    # Check if dialect is PostgreSQL (could use pgvector operators if pgvector is installed)
    dialect_name = db.bind.dialect.name
    
    if dialect_name == "postgresql":
        try:
            # We can run a raw SQL query or check if pgvector SQLAlchemy is loaded.
            # Using raw SQL is extremely reliable and avoids ORM integration friction.
            query_str = """
                SELECT dc.id, dc.content, dc.page_number, dc.file_id, 
                       (dc.embedding <=> :emb) as distance
                FROM document_chunks dc
                JOIN uploaded_files uf ON dc.file_id = uf.id
                WHERE uf.workspace_id = :workspace_id
                ORDER BY distance ASC
                LIMIT :limit
            """
            result = db.execute(
                query_str, 
                {"emb": str(query_vector), "workspace_id": workspace_id, "limit": limit}
            ).fetchall()
            
            output = []
            for row in result:
                chunk = db.query(DocumentChunk).filter(DocumentChunk.id == row[0]).first()
                # distance is 1 - similarity for <=> operator
                similarity = 1.0 - float(row[4])
                output.append((chunk, similarity))
            return output
        except Exception as e:
            print(f"PostgreSQL pgvector query failed, falling back to memory search: {e}")

    # Fallback / SQLite mode:
    # Query all document chunks for this workspace
    chunks = db.query(DocumentChunk).join(UploadedFile).filter(
        UploadedFile.workspace_id == workspace_id
    ).all()
    
    if not chunks:
        return []
        
    scored_chunks = []
    for chunk in chunks:
        if not chunk.embedding:
            continue
        
        # Load embedding list
        emb = chunk.embedding
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except Exception:
                continue
                
        similarity = cosine_similarity(query_vector, emb)
        scored_chunks.append((chunk, similarity))
        
    # Sort descending
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    return scored_chunks[:limit]
