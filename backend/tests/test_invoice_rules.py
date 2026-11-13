from app.invoice_rules import evaluate_invoice, InvoiceStatus

def test_happy_path_bharat_paint():
    # A normal invoice that passes all rules
    data = {
        "vendor_name": "Titanium Dioxide Ltd", 
        "gst_number": "22AAAAA0000A1Z5", # 15 chars
        "subtotal": 10000, 
        "gst_amount": 1800, 
        "total": 11800
    }
    result = evaluate_invoice(data)
    assert result["status"] == InvoiceStatus.READY
    assert "All Bharat Paint checks passed" in result["reasons"][0]

def test_unknown_vendor():
    data = {
        "vendor_name": "Hacker Chemicals", 
        "gst_number": "22AAAAA0000A1Z5", 
        "subtotal": 10000, 
        "gst_amount": 1800, 
        "total": 11800
    }
    result = evaluate_invoice(data)
    assert result["status"] == InvoiceStatus.REJECTED
    assert "Unknown vendor" in result["reasons"][0]

def test_invalid_gst_length():
    data = {
        "vendor_name": "Resin Masters Inc", 
        "gst_number": "12345", # Too short
        "subtotal": 10000, 
        "gst_amount": 1800, 
        "total": 11800
    }
    result = evaluate_invoice(data)
    assert result["status"] == InvoiceStatus.REJECTED
    assert "Invalid GST number" in result["reasons"][0]

def test_math_mismatch():
    data = {
        "vendor_name": "Packaging Solutions", 
        "gst_number": "22AAAAA0000A1Z5", 
        "subtotal": 10000, 
        "gst_amount": 1800, 
        "total": 15000 # Math is wrong here
    }
    result = evaluate_invoice(data)
    assert result["status"] == InvoiceStatus.NEEDS_REVIEW
    assert "Math mismatch" in result["reasons"][0]

def test_threshold_exceeded():
    data = {
        "vendor_name": "Bharat Logistics", 
        "gst_number": "22AAAAA0000A1Z5", 
        "subtotal": 60000, 
        "gst_amount": 10800, 
        "total": 70800 # Over 50k limit
    }
    result = evaluate_invoice(data)
    assert result["status"] == InvoiceStatus.NEEDS_REVIEW
    assert "exceeds the ₹50000.00 threshold" in result["reasons"][0]