
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from app.database import SessionLocal
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk
from google import genai
from google.genai import errors
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
from pypdf import PdfReader
import os
import io
import time
import uuid
import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients ---
# Gemini is still used for EMBEDDINGS
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Groq is used for GENERATION and VALIDATION (OpenAI-compatible)
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
)

class ChatRequest(BaseModel):
    query: str
    filing_id: int

@app.get("/documents")
def get_documents():
    db = SessionLocal()
    try:
        filings = db.query(Filing).order_by(Filing.id.desc()).all()
        return [{"id": f.id, "name": os.path.basename(f.source_url)} for f in filings]
    finally:
        db.close()

JOBS: dict[str, dict] = {}
BATCH_SIZE = 100

def embed_all(chunks: list[str], job: dict) -> list:
    embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        for attempt in range(5):
            try:
                result = gemini_client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=batch,
                    config={"output_dimensionality": 768},
                )
                embeddings.extend(e.values for e in result.embeddings)
                job["done"] = len(embeddings)
                print(f"✅ Embedded {len(embeddings)}/{len(chunks)}")
                break
            except errors.APIError as e:
                if e.code == 429 and attempt < 4:
                    print("⏳ Rate limited. Waiting 65s...")
                    time.sleep(65)
                else:
                    raise
    return embeddings

def process_upload(job_id: str, filename: str, text: str):
    job = JOBS[job_id]
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(text)
        job["total"] = len(chunks)
        print(f"🧩 {len(chunks)} chunks from {filename}")

        embeddings = embed_all(chunks, job)

        db = SessionLocal()
        try:
            company = db.query(Company).filter_by(ticker="USER").first()
            if not company:
                company = Company(ticker="USER", name="User Uploads")
                db.add(company)
                db.flush()
            filing = Filing(
                company_id=company.id,
                filing_type="Upload",
                filing_date=datetime.date.today(),
                source_url=filename,
            )
            db.add(filing)
            db.flush()
            for content, emb in zip(chunks, embeddings):
                db.add(Chunk(filing_id=filing.id, content=content, embedding=emb))
            db.commit()
            job.update(status="done", filing_id=filing.id, filename=filename)
            print("🎉 Document saved.")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ UPLOAD ERROR: {e}")
        job.update(status="error", error=str(e))

@app.post("/upload")
def upload_document(background: BackgroundTasks, file: UploadFile = File(...)):
    name = file.filename or "upload"
    ext = name.lower().rsplit(".", 1)[-1]
    contents = file.file.read()
    print(f"⬆️ Received {name} ({len(contents)} bytes)")

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(contents))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif ext == "txt":
        text = contents.decode("utf-8", errors="ignore")
    else:
        text = BeautifulSoup(contents.decode("utf-8", errors="ignore"), "html.parser").get_text(separator="\n")

    if not text.strip():
        raise HTTPException(422, "No readable text found. Scanned PDFs need OCR first.")

    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"status": "processing", "done": 0, "total": 0}
    background.add_task(process_upload, job_id, name, text)
    return {"job_id": job_id}

@app.get("/upload/{job_id}")
def upload_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown job")
    return job

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        db = SessionLocal()
        
        # 1. EMBEDDING (Still Gemini)
        query_embedding = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=[request.query],
            config={"output_dimensionality": 768},
        ).embeddings[0].values
        
        # 2. RETRIEVAL (pgvector)
        stmt = (
            select(Chunk)
            .where(Chunk.filing_id == request.filing_id)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(5)
        )
        chunks = db.execute(stmt).scalars().all()
        db.close()
        
        context = "\n\n".join([c.content for c in chunks])
        
        prompt = f"""You are a helpful financial assistant. Use the following context from a document to answer the user's question. 
If the answer is not in the context, say "I cannot find the answer in the provided document."

Context:
{context}

Question: {request.query}
Answer:"""

        # 3. GENERATION (Groq)
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        answer = response.choices[0].message.content

        if "I cannot find the answer" in answer:
            return {"answer": answer, "sources": [c.id for c in chunks]}

        # 4. GROUNDING VALIDATOR (Groq)
        print("🛡️ Running Grounding Validator (Groq)...")
        validation_prompt = f"""You are a strict, literal fact-checker. 
I have an Answer generated by an AI, and the Source Text it used.
Your job is to check if every specific claim and number in the Answer is directly supported by the Source Text.
If the Answer contains ANY information, numbers, or claims that are NOT in the Source Text, you must reply with exactly: "FAILED".
If the Answer is fully supported by the Source Text, reply with exactly: "PASSED".

Source Text:
{context}

Answer:
{answer}
"""

        validation_response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": validation_prompt}],
            temperature=0.0
        )
        
        validation_result = validation_response.choices[0].message.content.strip().upper()

        if "FAILED" in validation_result:
            print("❌ Validator caught a hallucination! Blocking answer.")
            return {
                "answer": "⚠️ **Grounding Check Failed**: The AI generated an answer, but the validator could not verify every claim against the source document. To prevent misinformation, the answer has been blocked.",
                "sources": [c.id for c in chunks]
            }

        print("✅ Validator passed. Answer is grounded.")
        return {
            "answer": answer,
            "sources": [c.id for c in chunks]
        }
        
    except Exception as e:
        print(f"🔥 ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
