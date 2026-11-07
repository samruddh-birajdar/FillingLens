
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import time
from dotenv import load_dotenv
from app.database import SessionLocal
from app.search import search_chunks
from openai import OpenAI

load_dotenv()

# Groq client for evaluation
groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
)

def generate_with_retry(prompt: str) -> str:
    for attempt in range(3):
        try:
            response = groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            if attempt < 2:
                print(f"   ⏳ Model error, retrying in 10s... ({e})")
                time.sleep(10)
            else:
                raise
    return ""

def evaluate():
    with open("eval/golden_set.json", "r") as f:
        golden_set = json.load(f)

    recall_hits = 0
    faithfulness_passes = 0
    total = len(golden_set)

    print(f"Running evaluation on {total} questions...\n")
    db = SessionLocal()

    for item in golden_set:
        question = item["question"]
        expected_ids = set(item["expected_chunk_ids"])

        retrieved = search_chunks(question, limit=5)
        retrieved_ids = {c["id"] for c in retrieved}

        if retrieved_ids.intersection(expected_ids):
            recall_hits += 1
            retrieval_status = "PASS"
        else:
            retrieval_status = "FAIL"

        context = "\n\n".join([c["content"] for c in retrieved])
        answer = generate_with_retry(f"Context:\n{context}\n\nQuestion: {question}\nAnswer:")

        keyword_pass = all(kw.lower() in answer.lower() for kw in item["expected_answer_keywords"])
        if keyword_pass:
            faithfulness_passes += 1
            gen_status = "PASS"
        else:
            gen_status = "FAIL"

        print(f"[RET: {retrieval_status}] [GEN: {gen_status}] Q: {question[:50]}...")
        if retrieval_status == "FAIL":
            print(f"    Expected: {expected_ids}, Got: {retrieved_ids}")

    db.close()

    print(f"\n--- RESULTS ---")
    print(f"Retrieval Recall@5: {recall_hits}/{total} ({(recall_hits/total)*100:.1f}%)")
    print(f"Generation Faithfulness: {faithfulness_passes}/{total} ({(faithfulness_passes/total)*100:.1f}%)")

if __name__ == "__main__":
    evaluate()