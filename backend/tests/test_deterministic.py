import pytest
from pathlib import Path
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter

def extract_text(path: Path) -> str:
    raw = path.read_text(errors="ignore")
    soup = BeautifulSoup(raw, "html.parser")
    return soup.get_text(separator="\n")

def test_html_extraction():
    # Ensure the sample file exists in the data folder
    filepath = Path("../data/aapl-2023-10k.htm")
    if not filepath.exists():
        pytest.skip("Test file not found")
        
    text = extract_text(filepath)
    assert "Apple" in text
    assert "net sales" in text.lower()
    assert len(text) > 1000

def test_chunking_logic():
    text = "A" * 2500  # 2500 characters
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(text)
    
    # 2500 chars with overlap 200 should produce 3 chunks
    assert len(chunks) == 3
    # Check that no text was lost
    assert len("".join(chunks)) >= len(text)
