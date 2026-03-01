"""
Self-Attestation Service — SESSION 8.
Creates SelfAttestation record, generates PDF certificate, uploads to storage, creates EvidenceFile.
Uses app.services.storage.upload_bytes and EvidenceFile fields: file_name, content_type, size_bytes, storage_key, uploaded_by_user_id.
"""
import hashlib
import io
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
)

from app.models.models import EvidenceFile, Control, Tenant
from app.models.workflow import SelfAttestation, AuditChecklistItem, ControlRequiredEvidence
from app.services import storage
from app.services.audit import log_event


async def create_self_attestation(
    tenant_id: str,
    assessment_id: str,
    control_id: str,
    required_evidence_id: str,
    attested_by_user_id: str,
    attested_by_name: str,
    attested_by_title: str | None,
    checklist_items_confirmed: list[str] | dict[str, Any],
    ip_address: str | None,
    user_agent: str | None,
    db: AsyncSession,
) -> SelfAttestation:
    """
    Creates SelfAttestation, generates PDF, uploads via storage.upload_bytes,
    creates EvidenceFile (file_name, content_type, size_bytes, storage_key, uploaded_by_user_id),
    updates AuditChecklistItem.
    """
    now = datetime.now(timezone.utc)

    tenant = (
        await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    ).scalar_one_or_none()
    control = (
        await db.execute(select(Control).where(Control.id == control_id))
    ).scalar_one_or_none()
    req_evidence = (
        await db.execute(
            select(ControlRequiredEvidence).where(
                ControlRequiredEvidence.id == required_evidence_id
            )
        )
    ).scalar_one_or_none()
    if not tenant or not control or not req_evidence:
        raise ValueError("Tenant, Control, or RequiredEvidence not found")

    checklist_list = (
        checklist_items_confirmed
        if isinstance(checklist_items_confirmed, list)
        else list(checklist_items_confirmed) if isinstance(checklist_items_confirmed, (dict, tuple)) else []
    )
    attestation_text = (
        f"I, {attested_by_name}"
        f"{f', {attested_by_title},' if attested_by_title else ','} "
        f"on behalf of {tenant.name}, hereby attest that the following "
        f"statements regarding {req_evidence.artifact_name} "
        f"({control.control_code} — {control.title}) are true and accurate "
        f"as of {now.strftime('%B %d, %Y')}:\n\n"
        + "\n".join(f"• {item}" for item in checklist_list)
    )

    attestation = SelfAttestation(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        control_id=control_id,
        required_evidence_id=required_evidence_id,
        attested_by_user_id=attested_by_user_id,
        attested_by_name=attested_by_name,
        attested_by_title=attested_by_title,
        attestation_text=attestation_text,
        checklist_items_confirmed=(
            {"items": checklist_list} if not isinstance(checklist_items_confirmed, dict) else checklist_items_confirmed
        ),
        ip_address=ip_address,
        user_agent=user_agent,
        attested_at=now,
    )
    db.add(attestation)
    await db.flush()

    pdf_bytes = _generate_attestation_pdf(
        attestation_id=str(attestation.id),
        tenant_name=tenant.name,
        control_code=control.control_code,
        control_name=control.title,
        artifact_name=req_evidence.artifact_name,
        hipaa_citation=req_evidence.hipaa_citation,
        attested_by_name=attested_by_name,
        attested_by_title=attested_by_title,
        checklist_items=checklist_list,
        attested_at=now,
    )
    cert_hash = hashlib.sha256(pdf_bytes).hexdigest()

    safe_name = f"{control.control_code}_{req_evidence.artifact_name}".replace(" ", "_")[:80]
    storage_key = f"attestations/{tenant_id}/{assessment_id}/{safe_name}_{str(attestation.id)[:8]}.pdf"
    storage.upload_bytes(storage_key, pdf_bytes, "application/pdf")

    file_name = f"Self_Attestation_{safe_name}.pdf"
    evidence_file = EvidenceFile(
        tenant_id=tenant_id,
        uploaded_by_user_id=attested_by_user_id,
        file_name=file_name,
        content_type="application/pdf",
        size_bytes=len(pdf_bytes),
        storage_key=storage_key,
        tags=[control.control_code] if control.control_code else None,
        admin_comment=(
            f"Self-attested by {attested_by_name}"
            f"{f', {attested_by_title}' if attested_by_title else ''}. "
            f"Attestation ID: {attestation.id}. Hash: {cert_hash[:16]}..."
        ),
    )
    db.add(evidence_file)
    await db.flush()

    attestation.certificate_storage_key = storage_key
    attestation.certificate_hash = cert_hash
    attestation.evidence_file_id = str(evidence_file.id)

    checklist_item = (
        await db.execute(
            select(AuditChecklistItem).where(
                AuditChecklistItem.assessment_id == assessment_id,
                AuditChecklistItem.required_evidence_id == required_evidence_id,
            )
        )
    ).scalar_one_or_none()
    if checklist_item:
        checklist_item.status = "self_attested"
        checklist_item.evidence_file_id = str(evidence_file.id)
        checklist_item.self_attestation_id = str(attestation.id)
        checklist_item.client_response = "self_attested"
        checklist_item.client_responded_at = now

    await log_event(
        db,
        event_type="self_attestation_created",
        tenant_id=tenant_id,
        user_id=attested_by_user_id,
        entity_type="self_attestation",
        entity_id=str(attestation.id),
        payload={
            "control_code": control.control_code,
            "artifact_name": req_evidence.artifact_name,
            "attestation_id": str(attestation.id),
            "certificate_hash": cert_hash[:16],
        },
    )

    return attestation


def _generate_attestation_pdf(
    attestation_id: str,
    tenant_name: str,
    control_code: str,
    control_name: str,
    artifact_name: str,
    hipaa_citation: str | None,
    attested_by_name: str,
    attested_by_title: str | None,
    checklist_items: list[str],
    attested_at: datetime,
) -> bytes:
    """Generates self-attestation certificate PDF."""
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
    navy = colors.HexColor("#1A3A5C")
    amber = colors.HexColor("#E67E22")

    title_style = ParagraphStyle(
        "T", parent=styles["Title"], fontSize=18, textColor=navy, spaceAfter=4
    )
    sub_style = ParagraphStyle(
        "S", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#555555"), spaceAfter=4
    )
    body_style = ParagraphStyle(
        "B", parent=styles["Normal"], fontSize=10, leading=16, spaceAfter=8
    )
    small_style = ParagraphStyle(
        "Sm", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#888888")
    )

    story = []
    story.append(Paragraph("SELF-ATTESTATION CERTIFICATE", title_style))
    story.append(Paragraph("HIPAA Security Rule Compliance", sub_style))
    story.append(Paragraph("Issued by Summit Range Consulting HIPAA Portal", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=navy))
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            "⚠ SELF-ATTESTATION — This document represents an organizational "
            "self-declaration, not an independent audit finding. "
            "It is recorded as evidence of organizational attestation.",
            ParagraphStyle(
                "W",
                parent=styles["Normal"],
                fontSize=9,
                textColor=amber,
                backColor=colors.HexColor("#FEF9E7"),
                borderPad=6,
                spaceAfter=12,
            ),
        )
    )

    details = [
        ["Organization:", tenant_name],
        ["Control:", f"{control_code} — {control_name}"],
        ["Requirement:", artifact_name],
        ["HIPAA Citation:", hipaa_citation or "—"],
        [
            "Attested By:",
            attested_by_name + (f", {attested_by_title}" if attested_by_title else ""),
        ],
        ["Date & Time:", attested_at.strftime("%B %d, %Y at %H:%M UTC")],
        ["Certificate ID:", attestation_id],
    ]
    detail_table = Table(details, colWidths=[1.8 * inch, 4.7 * inch])
    detail_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#EBF5FB"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ])
    )
    story.append(detail_table)
    story.append(Spacer(1, 16))

    story.append(
        Paragraph(
            "Attestation Statements",
            ParagraphStyle("H", parent=styles["Heading2"], fontSize=12, textColor=navy, spaceAfter=8),
        )
    )
    story.append(
        Paragraph(
            "The undersigned hereby attests that the following statements are "
            "true and accurate as of the date above:",
            body_style,
        )
    )
    for item in checklist_items:
        story.append(
            Paragraph(
                f"☑ {item}",
                ParagraphStyle(
                    "Item",
                    parent=styles["Normal"],
                    fontSize=10,
                    leading=14,
                    spaceAfter=4,
                    leftIndent=20,
                ),
            )
        )
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "This attestation was electronically executed via the Summit Range Consulting "
            "HIPAA Readiness Portal. The organization assumes full responsibility for the "
            "accuracy of the statements above. This document is tamper-evident and "
            "timestamped. Independent documentation is recommended for formal audit purposes.",
            small_style,
        )
    )
    story.append(
        Paragraph(
            f"Attestation ID: {attestation_id} | "
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            small_style,
        )
    )

    doc.build(story)
    return buf.getvalue()
