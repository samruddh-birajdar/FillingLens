import os
import time
from google import genai
from google.genai import errors
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

BATCH_SIZE = 100

def embed_texts(texts: list[str]) -> list[list[float]]:
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        retries = 3
        for attempt in range(retries):
            try:
                result = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=batch,
                    config={"output_dimensionality": 768},
                )
                all_embeddings.extend([e.values for e in result.embeddings])
                print(f"Embedded {min(i + BATCH_SIZE, len(texts))}/{len(texts)}")
                break
            except errors.APIError as e:
                if e.code == 429 and attempt < retries - 1:
                    wait = 65
                    try:
                        details = e.details
                        for d in details:
                            if d.get("@type") == "type.googleapis.com/google.rpc.RetryInfo":
                                wait = int(d["retryDelay"].rstrip("s")) + 2
                                break
                    except Exception:
                        pass
                    print(f"Rate limited, waiting {wait}s before retry...")
                    time.sleep(wait)
                else:
                    raise
    return all_embeddings