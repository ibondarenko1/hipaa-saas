"""
Pre-filled HIPAA evidence templates (PDF) per control.
ReportLab PDF with Summit Range header/footer and watermark.
"""
import io
from typing import Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas

# Control ID -> template document title (15 named; rest get generic worksheet)
CONTROL_TEMPLATE_MAP = {
    "HIPAA-GV-01": "Security Officer Designation Letter",
    "HIPAA-ID-01": "Risk Analysis Scope",
    "HIPAA-ID-02": "Risk Management Plan",
    "HIPAA-ID-03": "Sanction Policy",
    "HIPAA-RS-01": "Incident Response Plan",
    "HIPAA-RC-01": "Backup Policy",
    "HIPAA-RC-02": "Disaster Recovery Plan",
    "HIPAA-PR-06": "Access Authorization Form",
    "HIPAA-PR-08": "Password Policy",
    "HIPAA-GV-03": "Security Policy Binder Cover",
    "HIPAA-GV-02": "BAA Template",
    "HIPAA-PR-11": "Visitor Log",
    "HIPAA-PR-14": "Media Disposal Log",
    "HIPAA-PR-12": "Workstation Use Policy",
    "HIPAA-GV-04": "Document Retention Schedule",
}

HEADER_TEXT = "Summit Range Consulting"
FOOTER_TEXT = "Summit Range Consulting — HIPAA Compliance Templates"
WATERMARK_TEXT = "TEMPLATE — CUSTOMIZE BEFORE USE"


def _get_tenant_fields(tenant: Any) -> dict[str, str]:
    """Extract template placeholders from tenant model."""
    return {
        "organization_name": tenant.name or "",
        "security_officer_name": getattr(tenant, "security_officer_name", None) or "",
        "security_officer_title": getattr(tenant, "security_officer_title", None) or "",
        "security_officer_email": getattr(tenant, "security_officer_email", None) or "",
        "security_officer_phone": getattr(tenant, "security_officer_phone", None) or "",
        "primary_contact_email": getattr(tenant, "primary_contact_email", None) or "",
        "ehr_system": getattr(tenant, "ehr_system", None) or "",
        "employee_count_range": getattr(tenant, "employee_count_range", None) or "",
        "location_count": str(getattr(tenant, "location_count", None) or ""),
        "industry": getattr(tenant, "industry", None) or "",
    }


class TemplateCanvas(canvas.Canvas):
    """Canvas that draws header, footer, and watermark on each page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._page_num = 0

    def _draw_header_footer_watermark(self):
        self._page_num += 1
        # Header
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#1A3A5C"))
        self.drawString(inch, letter[1] - 0.4 * inch, HEADER_TEXT)
        # Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.grey)
        self.drawString(inch, 0.5 * inch, FOOTER_TEXT)
        self.drawRightString(letter[0] - inch, 0.5 * inch, f"Page {self._page_num}")
        # Watermark — diagonal, centered, light gray
        self.saveState()
        self.setFillColor(colors.HexColor("#E0E0E0"))
        self.setFont("Helvetica-Bold", 16)
        self.translate(letter[0] / 2, letter[1] / 2)
        self.rotate(45)
        self.drawCentredString(0, 0, WATERMARK_TEXT)
        self.restoreState()

    def showPage(self):
        # Draw on current page before advancing
        self._draw_header_footer_watermark()
        super().showPage()

    def save(self):
        # Last page: draw then save (build() calls save() after last showPage; content is already on last page, so we draw on it when save is called if we haven't yet)
        # Actually build() does: for flowable in flowables: flowable.draw(); then canvas.save(). So the last page was already advanced by showPage(). So the last showPage() already drew. We're good.
        super().save()


def build_template_pdf(tenant: Any, control_id: str, template_title: str, fields: dict[str, str]) -> bytes:
    """Build a single PDF with pre-filled content, header, footer, watermark."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=1.2 * inch,
        bottomMargin=1.0 * inch,
    )
    # Use our canvas for header/footer/watermark
    doc.build = lambda flowables: doc._build(flowables, canvasmaker=TemplateCanvas)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TemplateTitle", parent=styles["Title"],
        fontSize=14, spaceAfter=12, textColor=colors.HexColor("#1A3A5C")
    )
    heading_style = ParagraphStyle(
        "TemplateHeading", parent=styles["Heading2"],
        fontSize=11, spaceBefore=10, spaceAfter=4, textColor=colors.HexColor("#333333")
    )
    body_style = ParagraphStyle(
        "TemplateBody", parent=styles["Normal"],
        fontSize=10, spaceAfter=6,
    )

    story = []
    story.append(Paragraph(template_title, title_style))
    story.append(Paragraph(f"Control: {control_id}", body_style))
    story.append(Spacer(1, 0.2 * inch))

    # Pre-filled profile block
    data = [
        ["Organization", fields["organization_name"]],
        ["Security Officer Name", fields["security_officer_name"]],
        ["Security Officer Title", fields["security_officer_title"]],
        ["Security Officer Email", fields["security_officer_email"]],
        ["Security Officer Phone", fields["security_officer_phone"]],
        ["Primary Contact Email", fields["primary_contact_email"]],
        ["EHR System", fields["ehr_system"]],
        ["Employee Count Range", fields["employee_count_range"]],
        ["Location Count", fields["location_count"]],
        ["Industry", fields["industry"]],
    ]
    t = Table(data, colWidths=[2 * inch, 4 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EBF5FB")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(Paragraph("Pre-filled from organization profile", heading_style))
    story.append(t)
    story.append(Spacer(1, 0.3 * inch))

    # Generic body for worksheet; named templates get same header + title
    story.append(Paragraph("Instructions: Complete and customize this document for your organization. Retain with your HIPAA compliance records.", body_style))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Notes / Evidence:", heading_style))
    story.append(Paragraph("_______________________________________________________________________", body_style))
    story.append(Paragraph("_______________________________________________________________________", body_style))
    story.append(Paragraph("_______________________________________________________________________", body_style))

    doc.build(story)
    return buf.getvalue()


def generate_control_template_pdf(tenant: Any, control_id: str) -> bytes:
    """
    Generate pre-filled PDF for the given control.
    Uses CONTROL_TEMPLATE_MAP for named template title; otherwise "Evidence Collection Worksheet".
    """
    template_title = CONTROL_TEMPLATE_MAP.get(control_id, "Evidence Collection Worksheet")
    fields = _get_tenant_fields(tenant)
    return build_template_pdf(tenant, control_id, template_title, fields)
