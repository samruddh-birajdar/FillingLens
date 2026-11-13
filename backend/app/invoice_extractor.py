import re
from pypdf import PdfReader
import io

def extract_invoice_data(file_bytes: bytes) -> dict:
    """
    Reads a PDF invoice and extracts key fields using Regex.
    """
    # 1. Read the PDF text
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    # 2. Define the Regex patterns
    # re.IGNORECASE makes it case-insensitive (matches "Vendor" or "vendor")
    vendor_pattern = r"Vendor Name:\s*([^\n]+)"
    gst_pattern = r"Supplier GSTIN:\s*([A-Z0-9]{15})"
    subtotal_pattern = r"Subtotal:\s*([\d.]+)"
    gst_amount_pattern = r"GST Amount:\s*([\d.]+)"
    total_pattern = r"Total Amount:\s*([\d.]+)"
    
    # Line item pattern: matches "1. Paint Base - Qty: 10 - Unit Price: 1000.00"
    line_item_pattern = r"\d+\.\s*(.+?)\s*-\s*Qty:\s*(\d+)\s*-\s*Unit Price:\s*([\d.]+)"

    # 3. Extract the data (with fallbacks if not found)
    vendor = re.search(vendor_pattern, text)
    gst = re.search(gst_pattern, text)
    subtotal = re.search(subtotal_pattern, text)
    gst_amount = re.search(gst_amount_pattern, text)
    total = re.search(total_pattern, text)
    line_items_raw = re.findall(line_item_pattern, text)

    # 4. Build the line items list
    line_items = []
    for item in line_items_raw:
        line_items.append({
            "description": item[0].strip(),
            "quantity": int(item[1]),
            "unit_price": float(item[2])
        })

    # 5. Return the structured dictionary
    return {
        "vendor_name": vendor.group(1).strip() if vendor else "Unknown",
        "gst_number": gst.group(1).strip() if gst else "",
        "subtotal": float(subtotal.group(1)) if subtotal else 0.0,
        "gst_amount": float(gst_amount.group(1)) if gst_amount else 0.0,
        "total": float(total.group(1)) if total else 0.0,
        "line_items": line_items
    }