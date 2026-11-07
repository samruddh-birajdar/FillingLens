from app.database import SessionLocal
from app.models.chunk import Chunk
from app.models.filing import Filing
from app.models.company import Company
from app.ingestion.embed import embed_texts
from sqlalchemy import select

def search_chunks(query: str, limit: int = 5):
    # 1. Embed the user's query
    query_embedding = embed_texts([query])[0]
    
    # 2. Search Supabase using pgvector's cosine distance
    db = SessionLocal()
    try:
        # pgvector uses the `<->` operator for L2 distance, 
        # or `<=>` for cosine distance. We'll use cosine distance.
        stmt = (
            select(Chunk)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
        results = db.execute(stmt).scalars().all()
        
        # Return as list of dicts
        return [{"id": c.id, "content": c.content} for c in results]
    finally:
        db.close()

if __name__ == "__main__":
    # Quick test
    print("Searching for: 'What was Apple's total net sales?'")
    results = search_chunks("What was Apple's total net sales?")
    for i, r in enumerate(results):
        print(f"\n--- Result {i+1} (ID: {r['id']}) ---")
        print(r['content'][:300] + "...")
