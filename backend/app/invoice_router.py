from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.database import SessionLocal
from app.models.invoice import Invoice, LineItem, InvoiceStatus
from app.invoice_extractor import extract_invoice_data
from app.invoice_rules import evaluate_invoice
import hashlib
import uuid
import os

router = APIRouter(
    prefix="/invoices",
    tags=["invoices"]
)

# Create uploads folder if it doesn't exist
os.makedirs("uploads", exist_ok=True)


@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    contents = await file.read()
    
    file_hash = hashlib.md5(contents).hexdigest()
    
    db = SessionLocal()
    try:
        existing = db.query(Invoice).filter(Invoice.file_hash == file_hash).first()
        if existing:
            raise HTTPException(status_code=400, detail="This invoice has already been uploaded.")

        extracted_data = extract_invoice_data(contents)
        
        if extracted_data["vendor_name"] == "Unknown":
            raise HTTPException(status_code=422, detail="Could not read invoice text. Please ensure it is a text-based PDF.")

        rule_result = evaluate_invoice(extracted_data)
        
        new_invoice = Invoice(
            user_id="demo_user",
            file_hash=file_hash,
            vendor_name=extracted_data["vendor_name"],
            gst_number=extracted_data["gst_number"],
            subtotal=extracted_data["subtotal"],
            gst_amount=extracted_data["gst_amount"],
            total=extracted_data["total"],
            status=rule_result["status"],
            reasons=rule_result["reasons"]
        )
        
        db.add(new_invoice)
        db.flush()
        
        for item in extracted_data["line_items"]:
            db.add(LineItem(
                invoice_id=new_invoice.id,
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"]
            ))
            
        db.commit()
        
        return {
            "message": "Invoice processed successfully",
            "invoice_id": new_invoice.id,
            "status": rule_result["status"],
            "reasons": rule_result["reasons"]
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/list")
def list_invoices():
    db = SessionLocal()
    try:
        invoices = db.query(Invoice).order_by(Invoice.id.desc()).all()
        return [
            {
                "id": inv.id,
                "vendor": inv.vendor_name,
                "total": inv.total,
                "status": inv.status,
                "reasons": inv.reasons
            } for inv in invoices
        ]
    finally:
        db.close()


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int):
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        return {
            "id": invoice.id,
            "vendor_name": invoice.vendor_name,
            "gst_number": invoice.gst_number,
            "subtotal": invoice.subtotal,
            "gst_amount": invoice.gst_amount,
            "total": invoice.total,
            "status": invoice.status,
            "reasons": invoice.reasons,
            "file_path": invoice.file_path
        }
    finally:
        db.close()


@router.post("/{invoice_id}/approve")
def approve_invoice(invoice_id: int):
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        invoice.status = InvoiceStatus.READY
        invoice.reasons = ["Manually approved by user."]
        db.commit()
        return {"message": "Invoice approved", "id": invoice.id}
    finally:
        db.close()


@router.post("/{invoice_id}/reject")
def reject_invoice(invoice_id: int):
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        invoice.status = InvoiceStatus.REJECTED
        invoice.reasons = ["Manually rejected by user."]
        db.commit()
        return {"message": "Invoice rejected", "id": invoice.id}
    finally:
        db.close()


@router.post("/load-sample")
def load_sample():
    db = SessionLocal()
    try:
        # Use absolute path to find the PDF
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend/
        sample_pdf_path = os.path.join(base_dir, "test_invoice.pdf")
        
        if not os.path.exists(sample_pdf_path):
             raise HTTPException(404, "test_invoice.pdf not found. Run generate_test_invoice.py first.")

        # Read the PDF
        with open(sample_pdf_path, "rb") as f:
            file_bytes = f.read()
            
        unique_filename = f"sample_{uuid.uuid4().hex}.pdf"
        
        # Ensure uploads folder exists in the backend folder
        uploads_dir = os.path.join(base_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save the file
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Create the database record
        new_invoice = Invoice(
            user_id="demo_user",
            file_hash=str(uuid.uuid4()),
            vendor_name="Bharat Logistics",
            gst_number="22AAAAA0000A1Z5",
            subtotal=45000.00,
            gst_amount=8100.00,
            total=53100.00,
            status=InvoiceStatus.NEEDS_REVIEW,
            reasons=["Amount ₹53100.00 exceeds the ₹50000.00 threshold. Manager approval required."],
            file_path=f"uploads/{unique_filename}" # Store relative path for the URL
        )
        db.add(new_invoice)
        db.flush()

        db.add(LineItem(
            invoice_id=new_invoice.id,
            description="Freight Transport - Delhi to Mumbai",
            quantity=1,
            unit_price=45000.00
        ))
        db.commit()
        
        return {"message": "Sample invoice loaded", "invoice_id": new_invoice.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/invoices/uploads/{filename}")  # Add /invoices here
def get_uploaded_file(filename: str):
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)