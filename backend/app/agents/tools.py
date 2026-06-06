import json
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.vector_store import search_workspace_documents

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def search_uploaded_documents(db: Session, query: str, workspace_id: str) -> list:
    """Searches uploaded workspace files for relevant context chunks."""
    results = search_workspace_documents(db, query, workspace_id, limit=5)
    sources = []
    for chunk, score in results:
        sources.append({
            "title": chunk.file.filename,
            "url": f"file:///workspace/docs/{chunk.file.id}",
            "snippet": chunk.content,
            "page": chunk.page_number,
            "score": score
        })
    return sources

def search_web_simulated(query: str) -> list:
    """
    Uses Gemini to simulate a high-quality search engine results page.
    Generates realistic URLs, titles, and snippets based on real-world knowledge.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        return [
            {
                "title": f"Deep Dive into {query}",
                "url": f"https://arxiv.org/abs/{hash(query)%10000}",
                "snippet": f"Simulated academic analysis regarding {query}. System running in local development mode without Gemini API access.",
                "score": 0.85
            },
            {
                "title": f"Understanding {query} - Wiki",
                "url": f"https://en.wikipedia.org/wiki/{query.replace(' ', '_')}",
                "snippet": f"Overview of historical context, methodologies, and common industrial applications of {query}.",
                "score": 0.75
            }
        ]

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"""
        You are a mock search engine API that returns realistic web search results.
        Generate 3 high-quality, realistic search results for this query: "{query}".
        
        For each result, provide:
        - "title": Clear and descriptive webpage title
        - "url": A plausible, realistic web URL
        - "snippet": A dense 2-3 sentence information-rich summary containing key facts or statistics.
        
        Respond ONLY with a valid JSON array of objects. Do not enclose in markdown blocks.
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Clean markdown fence tags if the model includes them
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        data = json.loads(text)
        for d in data:
            d["score"] = 0.90 # Standard mock confidence
        return data
    except Exception as e:
        print(f"Error in simulated web search: {e}")
        return [
            {
                "title": f"Research Paper on {query}",
                "url": "https://scholar.google.com",
                "snippet": f"An analysis of the key vectors, paradigms, and definitions surrounding {query}.",
                "score": 0.60
            }
        ]
