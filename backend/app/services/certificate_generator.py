"""Generate training completion certificate PDF (ReportLab)."""
import io
from datetime import datetime

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


def generate_workforce_certificate_pdf(
    organization_name: str,
    employee_name: str,
    module_title: str,
    completed_at: datetime,
    score_percent: int,
    certificate_number: str,
    content_hash: str,
    module_version: str | None = None,
) -> bytes:
    """Build a single-page workforce certificate PDF (landscape) with cert number and hash footer."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(letter),
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=1.0 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle", parent=styles["Title"],
        fontSize=20, spaceAfter=16, textColor=colors.HexColor("#1A3A5C"), alignment=1
    )
    body_style = ParagraphStyle(
        "CertBody", parent=styles["Normal"],
        fontSize=12, spaceAfter=8, alignment=1
    )
    small_style = ParagraphStyle(
        "CertSmall", parent=styles["Normal"],
        fontSize=9, spaceAfter=4, textColor=colors.grey, alignment=1
    )
    footer_style = ParagraphStyle(
        "CertFooter", parent=styles["Normal"],
        fontSize=8, textColor=colors.grey, alignment=1
    )

    story = []
    story.append(Paragraph("Certificate of Training Completion", title_style))
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(f"<b>Certificate No.</b> {certificate_number}", small_style))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("This certifies that", body_style))
    story.append(Paragraph(f"<b>{employee_name or 'Participant'}</b>", body_style))
    story.append(Paragraph(f"of <b>{organization_name or 'Organization'}</b>", body_style))
    story.append(Paragraph("has completed the training module", body_style))
    story.append(Paragraph(f"<b>{module_title}</b>", body_style))
    if module_version:
        story.append(Paragraph(f"(Version: {module_version})", small_style))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Score: {score_percent}%", body_style))
    story.append(Paragraph(f"Completed: {completed_at.strftime('%B %d, %Y')}", small_style))
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph("Summit Range Consulting — HIPAA Workforce Compliance Training", small_style))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph(f"Verification hash: {content_hash}", footer_style))

    doc.build(story)
    return buf.getvalue()


def generate_certificate_pdf(
    module_title: str,
    user_name: str,
    completed_at: datetime,
    score_percent: int,
) -> bytes:
    """Build a single-page certificate PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle", parent=styles["Title"],
        fontSize=22, spaceAfter=20, textColor=colors.HexColor("#1A3A5C"), alignment=1
    )
    body_style = ParagraphStyle(
        "CertBody", parent=styles["Normal"],
        fontSize=12, spaceAfter=8, alignment=1
    )
    small_style = ParagraphStyle(
        "CertSmall", parent=styles["Normal"],
        fontSize=9, spaceAfter=4, textColor=colors.grey, alignment=1
    )

    story = []
    story.append(Paragraph("Certificate of Completion", title_style))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("This certifies that", body_style))
    story.append(Paragraph(f"<b>{user_name or 'Participant'}</b>", body_style))
    story.append(Paragraph("has completed the training module", body_style))
    story.append(Paragraph(f"<b>{module_title}</b>", body_style))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Score: {score_percent}%", body_style))
    story.append(Paragraph(f"Completed: {completed_at.strftime('%B %d, %Y')}", small_style))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("Summit Range Consulting — HIPAA Compliance Training", small_style))

    doc.build(story)
    return buf.getvalue()
