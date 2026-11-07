import sys
from pathlib import Path
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.database import SessionLocal
from app.models.company import Company
from app.models.filing import Filing
from app.models.chunk import Chunk
from app.ingestion.embed import embed_texts
from datetime import date

from bs4 import BeautifulSoup

def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    else:  # .htm, .html, .xml
        raw = path.read_text(errors="ignore")
        soup = BeautifulSoup(raw, "html.parser")
        return soup.get_text(separator="\n")


def main(pdf_path: str):
    path = Path(pdf_path)
    text = extract_text(path)

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(text)
    print(f"Extracted {len(chunks)} chunks")

    embeddings = embed_texts(chunks)
    print(f"Generated {len(embeddings)} embeddings, dim={len(embeddings[0])}")

    db = SessionLocal()
    try:
        company = db.query(Company).filter_by(ticker="TEST").first()
        if not company:
            company = Company(ticker="TEST", name="Test Company")
            db.add(company)
            db.flush()

        filing = Filing(
            company_id=company.id,
            filing_type="10-K",
            filing_date=date.today(),
            source_url=str(path),
        )
        db.add(filing)
        db.flush()

        for content, emb in zip(chunks, embeddings):
            db.add(Chunk(filing_id=filing.id, content=content, embedding=emb))

        db.commit()
        print(f"Inserted filing {filing.id} with {len(chunks)} chunks")
    finally:
        db.close()


if __name__ == "__main__":
    main(sys.argv[1])
