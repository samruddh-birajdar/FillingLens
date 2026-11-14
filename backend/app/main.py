from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from app.database import SessionLocal
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk
from app.models.chat_history import ChatHistory
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
from fastapi.responses import FileResponse
from sentence_transformers import SentenceTransformer
# Load the model locally when the server starts
local_embedder = SentenceTransformer('all-MiniLM-L6-v2')

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients ---
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
)

class ChatRequest(BaseModel):
    query: str
    filing_id: int

# --- HELPER: Query Rewriter ---
def rewrite_query(question: str, history: list) -> str:
    history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in history])
    prompt = f"""Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question. 
If the question is already standalone, just return it as is.
You MUST include the specific entity (e.g., 'net sales', 'revenue', 'risks') from the previous question in the rewritten standalone question. Do not make it generic.

Chat History:
{history_text}

Follow Up Input: {question}
Standalone question:"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    return response.choices[0].message.content.strip()

# --- DOCUMENTS ---
@app.get("/documents")
def get_documents():
    db = SessionLocal()
    try:
        filings = db.query(Filing).order_by(Filing.id.desc()).all()
        return [{"id": f.id, "name": os.path.basename(f.source_url)} for f in filings]
    finally:
        db.close()

# --- UPLOAD ---
JOBS: dict[str, dict] = {}
BATCH_SIZE = 100

def embed_all(chunks: list[str], job: dict) -> list:
    embeddings = []
    # The local model can process in batches instantly
    BATCH_SIZE = 100
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        # This runs on your CPU, no internet required!
        batch_embeddings = local_embedder.encode(batch).tolist()
        embeddings.extend(batch_embeddings)
        job["done"] = len(embeddings)
        print(f"✅ Embedded {len(embeddings)}/{len(chunks)}")
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

# --- CHAT (WITH CONVERSATIONAL MEMORY) ---
@app.post("/chat")
def chat(request: ChatRequest):
    db = SessionLocal()
    try:
        # 1. Save user message to history
        user_msg = ChatHistory(user_id="demo_user", role="user", content=request.query)
        db.add(user_msg)
        db.commit()

        # 2. Fetch last 4 messages for context
        history = db.query(ChatHistory).filter(ChatHistory.user_id == "demo_user").order_by(ChatHistory.id.desc()).limit(4).all()
        history.reverse()

        # 3. Rewrite query if there is history
        search_query = request.query
        if len(history) > 1:
            search_query = rewrite_query(request.query, history)
            print(f"🔄 Rewritten Query: {search_query}")

        
        # 4. Vector search using the rewritten query (Local CPU Embedding)
        query_embedding = local_embedder.encode([search_query])[0].tolist()
        
        stmt = (
            select(Chunk)
            .where(Chunk.filing_id == request.filing_id)
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(5)
        )
        chunks = db.execute(stmt).scalars().all()
        
        context = "\n\n".join([c.content for c in chunks])
        
        prompt = f"""You are a helpful financial assistant. Use the following context from a document to answer the user's question. 
If the answer is not in the context, say "I cannot find the answer in the provided document."

Context:
{context}

Question: {request.query}
Answer:"""

        # 5. Generate Answer with Groq
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        answer = response.choices[0].message.content

        # 6. Grounding Validator
        if "I cannot find the answer" not in answer:
            print("🛡️ Running Grounding Validator (Groq)...")
            validation_prompt = f"""You are a fact-checker. 
Check if the Answer is supported by the Source Text. 
Minor phrasing differences are OK.
If the Answer contains major hallucinated facts or numbers not in the Source Text, reply with exactly: "FAILED".
If the Answer is supported, reply with exactly: "PASSED".

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
                answer = "⚠️ **Grounding Check Failed**: The AI generated an answer, but the validator could not verify every claim against the source document. To prevent misinformation, the answer has been blocked."
            else:
                print("✅ Validator passed. Answer is grounded.")

        # 7. Save AI response to history
        ai_msg = ChatHistory(user_id="demo_user", role="assistant", content=answer)
        db.add(ai_msg)
        db.commit()

        return {
            "answer": answer,
            "sources": [c.id for c in chunks]
        }
        
    except Exception as e:
        db.rollback()
        print(f"🔥 ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- INVOICE MODULE ---
from app.invoice_router import router as invoice_router
app.include_router(invoice_router)

# --- SERVE UPLOADED FILES ---
@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str):
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)

@app.delete("/documents/{filing_id}")
def delete_document(filing_id: int):
    db = SessionLocal()
    try:
        # 1. Find the filing
        filing = db.query(Filing).filter(Filing.id == filing_id).first()
        if not filing:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # 2. Delete all chunks associated with this filing
        db.query(Chunk).filter(Chunk.filing_id == filing_id).delete()
        
        # 3. Delete the filing record itself
        db.delete(filing)
        db.commit()
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()