
# FillingLens 🦅

**FillingLens** is a production-grade RAG (Retrieval-Augmented Generation) application that allows analysts to chat with financial filings (e.g., SEC 10-Ks). It features asynchronous document processing, a premium reading interface, and a strict "Grounding Validator" to eliminate AI hallucinations.

![FillingLens Architecture](docs/architecture.png)

## 🏗️ Architecture Breakdown

### 1. Asynchronous Ingestion
If a user uploads a 300-page SEC filing, processing it synchronously would timeout the browser. FastAPI immediately returns a `job_id` and offloads the PDF parsing and chunking to a `BackgroundTask`. It uses **Gemini (`gemini-embedding-001`)** to generate 768-dimensional vectors and stores them in **Supabase (`pgvector`)**. The frontend polls the backend every 1.5 seconds to show a live progress bar.

### 2. The Query Pipeline
When the user asks a question, the backend embeds the query using Gemini, and runs a cosine distance search in Supabase to pull the top 5 most relevant chunks.

### 3. The Safety Layer & Generation (Groq)
Instead of using Gemini for text generation, we route it to **Groq (`openai/gpt-oss-120b`)** for extreme speed. The **Grounding Validator** is the core safety feature: before the answer is sent to the user, a second strict Groq prompt fact-checks the generated answer against the source chunks. If the AI hallucinated a number or claim, it fails the check, blocks the answer, and sends a safety warning.

### 4. Evaluation
The system is verified using a custom Golden Set evaluation pipeline (`eval/run_eval.py`) that measures Retrieval Recall@5 and Generation Faithfulness, alongside `pytest` for deterministic parsing.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Supabase Auth
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, BackgroundTasks
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini (Embeddings), Groq (Generation & Validation)

## 🚀 Local Setup
1. Clone the repo.
2. Add your `DATABASE_URL`, `GEMINI_API_KEY`, and `GROQ_API_KEY` to `backend/.env`.
3. Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `frontend/.env`.
4. Backend: `cd backend && uv run uvicorn app.main:app --reload`
5. Frontend: `cd frontend && pnpm dev`

