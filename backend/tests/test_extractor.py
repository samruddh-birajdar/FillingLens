from app.invoice_extractor import extract_invoice_data
import pytest

def test_regex_extraction_from_text(monkeypatch):
    # We are going to trick the extractor by mocking PdfReader to return our fake text
    fake_pdf_text = """
    Vendor Name: Titanium Dioxide Ltd
    Supplier GSTIN: 22AAAAA0000A1Z5
    Subtotal: 11000.00
    GST Amount: 1980.00
    Total Amount: 12980.00
    1. Paint Base - Qty: 10 - Unit Price: 1000.00
    """
    
    # We create a fake Pypdf Reader
    class FakePage:
        def extract_text(self): return fake_pdf_text
    class FakeReader:
        def __init__(self, *args): self.pages = [FakePage()]
        
    monkeypatch.setattr("app.invoice_extractor.PdfReader", FakeReader)
    
    # Call the function with empty bytes (since we mocked the reader)
    result = extract_invoice_data(b"")
    
    # Assert the regex found everything correctly
    assert result["vendor_name"] == "Titanium Dioxide Ltd"
    assert result["gst_number"] == "22AAAAA0000A1Z5"
    assert result["total"] == 12980.00
    assert len(result["line_items"]) == 1
    assert result["line_items"][0]["description"] == "Paint Base"