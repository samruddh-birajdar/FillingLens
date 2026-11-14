import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from app.database import Base, engine

# Import EVERY model so SQLAlchemy knows they exist
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk
from app.models.chat_history import ChatHistory
from app.models.invoice import Invoice, LineItem

load_dotenv()

def reset_database():
    print("1. Dropping the 'chunks' table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS chunks CASCADE;"))
        conn.commit()
    
    print("2. Recreating the 'chunks' table with 384 dimensions...")
    Base.metadata.create_all(bind=engine)
    
    print("3. Verifying the dimensions...")
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT atttypmod FROM pg_attribute WHERE attrelid = 'chunks'::regclass AND attname = 'embedding';"
        ))
        dim = result.scalar()
        print(f"--> Database reports the embedding dimension is: {dim}")
        if dim == 384:
            print("SUCCESS! The table is ready for local embeddings.")
        else:
            print(f"FAILED. It's still {dim}.")

if __name__ == "__main__":
    reset_database()