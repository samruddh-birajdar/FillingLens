import pytest
import time
import os
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk

client = TestClient(app)

# Ensure we have a test DB (assuming your .env TEST_DATABASE_URL is set up)
@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Delete rows instead of dropping tables
    db = SessionLocal()
    try:
        db.query(Chunk).delete()
        db.query(Filing).delete()
        db.query(Company).delete()
        db.commit()
    finally:
        db.close()

def test_end_to_end_rag_pipeline():
    # 1. UPLOAD PDF
    with open("test_10k.pdf", "rb") as f:
        response = client.post("/upload", files={"file": ("test_10k.pdf", f, "application/pdf")})
    
    assert response.status_code == 200
    job_id = response.json().get("job_id")
    assert job_id is not None

    # 2. POLL FOR INGESTION COMPLETION (Max 30 seconds)
    max_retries = 15
    job_status = "processing"
    filing_id = None
    
    for _ in range(max_retries):
        time.sleep(2) # Wait 2 seconds between checks
        status_res = client.get(f"/upload/{job_id}")
        data = status_res.json()
        job_status = data.get("status")
        
        if job_status == "done":
            filing_id = data.get("filing_id")
            break
        elif job_status == "error":
            pytest.fail(f"Ingestion failed: {data.get('error')}")

    assert job_status == "done", "Ingestion took too long or failed"
    assert filing_id is not None

    # 3. ASK A VALID QUESTION
    valid_payload = {"query": "What is the revenue?", "filing_id": filing_id}
    valid_res = client.post("/chat", json=valid_payload)
    assert valid_res.status_code == 200
    valid_data = valid_res.json()
    
    assert "100M" in valid_data["answer"] or "100" in valid_data["answer"], "AI failed to find the revenue"
    assert len(valid_data["sources"]) > 0

    # 4. ASK AN INVALID QUESTION (Hallucination Test)
    invalid_payload = {"query": "What is the CEO's favorite color?", "filing_id": filing_id}
    invalid_res = client.post("/chat", json=invalid_payload)
    assert invalid_res.status_code == 200
    invalid_data = invalid_res.json()

    # The grounding validator should either block it or the AI should refuse to answer
    answer_lower = invalid_data["answer"].lower()
    is_blocked = "grounding check failed" in answer_lower
    is_refused = "cannot find the answer" in answer_lower
    
    assert is_blocked or is_refused, "FAIL: The AI hallucinated an answer for an unanswerable question!"

