from enum import Enum
from decimal import Decimal

class InvoiceStatus(str, Enum):
    READY = "READY"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"

# Bharat Paint Company Rules
APPROVED_VENDORS = [
    "Titanium Dioxide Ltd",
    "Resin Masters Inc",
    "Packaging Solutions",
    "Bharat Logistics"
]
THRESHOLD_AMOUNT = Decimal("50000.00") # ₹50,000 INR limit

def evaluate_invoice(data: dict) -> dict:
    """
    Takes extracted invoice data and returns the final status and reasons.
    """
    reasons = []
    
    # Rule 1: Vendor Check
    vendor = data.get("vendor_name", "").strip()
    if vendor not in APPROVED_VENDORS:
        return {
            "status": InvoiceStatus.REJECTED,
            "reasons": [f"Unknown vendor: '{vendor}'. Not approved for Bharat Paint."]
        }

    # Rule 2: GST Check (India GST is 15 characters)
    gst_number = data.get("gst_number", "").strip()
    if not gst_number or len(gst_number) != 15:
        return {
            "status": InvoiceStatus.REJECTED,
            "reasons": [f"Invalid GST number: '{gst_number}'. Must be exactly 15 characters."]
        }

    # Rule 3: Math Check (Subtotal + GST == Total)
    try:
        subtotal = Decimal(str(data.get("subtotal", 0)))
        gst_amount = Decimal(str(data.get("gst_amount", 0)))
        total = Decimal(str(data.get("total", 0)))
        
        # Allow a tiny margin of error for rounding (0.01)
        if abs((subtotal + gst_amount) - total) > Decimal("0.01"):
            return {
                "status": InvoiceStatus.NEEDS_REVIEW,
                "reasons": [f"Math mismatch: Subtotal ({subtotal}) + GST ({gst_amount}) does not equal Total ({total})."]
            }
    except Exception:
        return {
            "status": InvoiceStatus.NEEDS_REVIEW,
            "reasons": ["Could not parse numeric amounts."]
        }

    # Rule 4: Amount Threshold (₹50,000)
    if total > THRESHOLD_AMOUNT:
        reasons.append(f"Amount ₹{total} exceeds the ₹{THRESHOLD_AMOUNT} threshold. Manager approval required.")
        return {
            "status": InvoiceStatus.NEEDS_REVIEW,
            "reasons": reasons
        }

    # If all rules pass
    return {
        "status": InvoiceStatus.READY,
        "reasons": ["All Bharat Paint checks passed. Ready for payment."]
    }