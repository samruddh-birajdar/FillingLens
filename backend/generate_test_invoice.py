from fpdf import FPDF

class InvoicePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "BHARAT PAINT COMPANY", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 5, "GSTIN: 27AABCB1234C1Z5", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

def create_invoice():
    pdf = InvoicePDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "", 11)

    # Invoice Details
    pdf.cell(0, 8, "INVOICE DETAILS", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Invoice Number: INV-2026-001", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Date: 15-11-2026", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Supplier Details
    pdf.cell(0, 8, "SUPPLIER DETAILS", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Vendor Name: Titanium Dioxide Ltd", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Supplier GSTIN: 22AAAAA0000A1Z5", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Line Items
    pdf.cell(0, 8, "LINE ITEMS", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "1. Paint Base - Qty: 10 - Unit Price: 1000.00", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "2. Thinner - Qty: 5 - Unit Price: 200.00", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Summary
    pdf.cell(0, 8, "SUMMARY", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Subtotal: 11000.00", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "GST Amount: 1980.00", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Total Amount: 12980.00", new_x="LMARGIN", new_y="NEXT")

    pdf.output("test_invoice.pdf")
    print("✅ Generated test_invoice.pdf")

if __name__ == "__main__":
    create_invoice()