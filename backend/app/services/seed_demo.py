"""
Demo client seed logic — shared by CLI script and POST /internal/seed-demo-client.
Call run_seed_demo_client(db); caller must commit.
"""
import os
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import hash_password
from app.models.models import (
    Framework, ControlsetVersion, RulesetVersion,
    User, Tenant, TenantMember, Assessment, Question, Answer,
    Control, EvidenceFile, EvidenceLink,
)

DEMO_TENANT_NAME = "Valley Creek Family Practice"
DEMO_INDUSTRY = "Primary Care / Family Medicine"
DEMO_CLIENT_EMAIL = "client@valleycreek.example.com"
DEMO_CLIENT_PASSWORD = "Client2024!"
DEMO_CLIENT_NAME = "Maria Lopez"

CONTROL_CODES_WITH_EVIDENCE = [
    "A1-01", "A1-02", "A2-03", "A2-04", "A2-05", "A3-06", "A3-07", "A4-08", "A4-09",
    "A5-10", "A5-11", "A6-12", "A6-13", "A6-14", "A7-15", "A7-16", "A7-17",
    "B1-18", "B1-19", "B2-20", "B2-21", "B3-22", "B3-23", "B3-24", "C1-25",
]

ANSWERS_BY_QUESTION_CODE = {
    "A1-Q1": {"date": (datetime.now(timezone.utc) - timedelta(days=240)).strftime("%Y-%m-%d")},
    "A1-Q2": {"choice": "Partial"},
    "A2-Q1": {"choice": "Yes"},
    "A2-Q2": {"choice": "Partial"},
    "A2-Q3": {"choice": "No"},
    "A3-Q1": {"choice": "Partial"},
    "A3-Q2": {"choice": "No"},
    "A4-Q1": {"choice": "Partial"},
    "A4-Q2": {"choice": "No"},
    "A5-Q1": {"choice": "Yes"},
    "A5-Q2": {"choice": "No"},
    "A6-Q1": {"choice": "No"},
    "A6-Q2": {"choice": "No"},
    "A6-Q3": {"choice": "No"},
    "A7-Q1": {"choice": "Yes"},
    "A7-Q2": {"choice": "No"},
    "A7-Q3": {"choice": "Unknown"},
    "B1-Q1": {"choice": "Yes"},
    "B1-Q2": {"choice": "Partial"},
    "B2-Q1": {"choice": "Partial"},
    "B2-Q2": {"choice": "Yes"},
    "B3-Q1": {"choice": "No"},
    "B3-Q2": {"choice": "No"},
    "B3-Q3": {"choice": "No"},
    "C1-Q1": {"choice": "Yes"},
    "C1-Q2": {"choice": "Partial"},
    "C1-Q3": {"choice": "No"},
    "C2-Q1": {"choice": "Partial"},
    "C2-Q2": {"choice": "No"},
    "C2-Q3": {"choice": "Unknown"},
    "C3-Q1": {"choice": "Partial"},
    "C3-Q2": {"choice": "Yes"},
    "C4-Q1": {"choice": "Yes"},
    "C4-Q2": {"choice": "Partial"},
    "C5-Q1": {"choice": "Partial"},
    "C5-Q2": {"choice": "Yes"},
    "D1-Q1": {"choice": "No"},
    "D1-Q2": {"choice": "Partial"},
    "D2-Q1": {"choice": "Unknown"},
    "D2-Q2": {"choice": "Unknown"},
}


async def run_seed_demo_client(db: AsyncSession) -> dict:
    """
    Create or update demo tenant, client user, assessment, answers, evidence.
    Caller must commit. Returns dict with tenant_id, client_email, client_password, message
    or error key on failure.
    """
    r = await db.execute(select(Framework).where(Framework.code == "HIPAA"))
    framework = r.scalar_one_or_none()
    if not framework:
        return {"error": "Run seed.py first (no HIPAA framework)."}

    r = await db.execute(
        select(ControlsetVersion).where(
            ControlsetVersion.framework_id == framework.id,
            ControlsetVersion.version == "v1.0",
            ControlsetVersion.is_active == True,
        )
    )
    csv = r.scalar_one_or_none()
    r = await db.execute(
        select(RulesetVersion).where(
            RulesetVersion.framework_id == framework.id,
            RulesetVersion.version == "v1.0",
            RulesetVersion.is_active == True,
        )
    )
    rsv = r.scalar_one_or_none()
    if not csv or not rsv:
        return {"error": "Run seed.py first (no active controlset/ruleset)."}

    admin_email = (os.getenv("ADMIN_EMAIL", "admin@summitrange.com") or "").strip().lower()
    r = await db.execute(select(User).where(User.email == admin_email))
    admin = r.scalar_one_or_none()
    if not admin:
        return {"error": "Admin user not found. Run seed.py first."}

    r = await db.execute(select(Tenant).where(Tenant.name == DEMO_TENANT_NAME))
    tenant = r.scalar_one_or_none()
    if not tenant:
        tenant = Tenant(
            name=DEMO_TENANT_NAME,
            industry=DEMO_INDUSTRY,
            primary_contact_email=DEMO_CLIENT_EMAIL,
            onboarding_completed=True,
            ehr_system="Epic",
            employee_count_range="6–20",
            location_count=2,
            security_officer_name="Dr. James Chen",
            security_officer_title="Privacy & Security Officer",
            security_officer_email="j.chen@valleycreek.example.com",
            security_officer_phone="+1 (555) 234-5678",
        )
        db.add(tenant)
        await db.flush()
    else:
        if not tenant.onboarding_completed:
            tenant.onboarding_completed = True
        if not tenant.ehr_system:
            tenant.ehr_system = "Epic"
            tenant.employee_count_range = "6–20"
            tenant.location_count = 2
            tenant.security_officer_name = "Dr. James Chen"
            tenant.security_officer_title = "Privacy & Security Officer"
            tenant.security_officer_email = "j.chen@valleycreek.example.com"
            tenant.security_officer_phone = "+1 (555) 234-5678"
        await db.flush()

    r = await db.execute(select(User).where(User.email == DEMO_CLIENT_EMAIL))
    client_user = r.scalar_one_or_none()
    if not client_user:
        client_user = User(
            email=DEMO_CLIENT_EMAIL,
            full_name=DEMO_CLIENT_NAME,
            password_hash=hash_password(DEMO_CLIENT_PASSWORD),
            status="active",
        )
        db.add(client_user)
        await db.flush()

    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id == client_user.id,
        )
    )
    if r.scalar_one_or_none() is None:
        db.add(TenantMember(tenant_id=tenant.id, user_id=client_user.id, role="client_user"))
        await db.flush()

    r = await db.execute(
        select(TenantMember).where(
            TenantMember.tenant_id == tenant.id,
            TenantMember.user_id == admin.id,
        )
    )
    if r.scalar_one_or_none() is None:
        db.add(TenantMember(tenant_id=tenant.id, user_id=admin.id, role="internal_user"))
        await db.flush()

    r = await db.execute(
        select(Assessment)
        .where(
            Assessment.tenant_id == tenant.id,
            Assessment.framework_id == framework.id,
        )
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )
    assessment = r.scalar_one_or_none()
    if not assessment:
        assessment = Assessment(
            tenant_id=tenant.id,
            framework_id=framework.id,
            controlset_version_id=csv.id,
            ruleset_version_id=rsv.id,
            status="in_progress",
            created_by_user_id=admin.id,
        )
        db.add(assessment)
        await db.flush()

    r = await db.execute(
        select(Question).where(
            Question.framework_id == framework.id,
            Question.is_active == True,
        )
    )
    questions = {q.question_code: q for q in r.scalars().all()}

    created = 0
    for q_code, value in ANSWERS_BY_QUESTION_CODE.items():
        q = questions.get(q_code)
        if not q:
            continue
        r = await db.execute(
            select(Answer).where(
                Answer.assessment_id == assessment.id,
                Answer.question_id == q.id,
            )
        )
        if r.scalar_one_or_none() is None:
            db.add(
                Answer(
                    tenant_id=tenant.id,
                    assessment_id=assessment.id,
                    question_id=q.id,
                    value=value,
                    updated_by_user_id=client_user.id,
                )
            )
            created += 1
    await db.flush()

    r = await db.execute(
        select(EvidenceLink).where(
            EvidenceLink.assessment_id == assessment.id,
            EvidenceLink.tenant_id == tenant.id,
        )
    )
    existing_control_ids = {link.control_id for link in r.scalars().all() if link.control_id}
    if not existing_control_ids:
        r = await db.execute(
            select(Control).where(
                Control.controlset_version_id == csv.id,
                Control.control_code.in_(CONTROL_CODES_WITH_EVIDENCE),
            )
        )
        controls_with_evidence = {c.control_code: c for c in r.scalars().all()}
        for code in CONTROL_CODES_WITH_EVIDENCE:
            ctrl = controls_with_evidence.get(code)
            if not ctrl:
                continue
            ef = EvidenceFile(
                tenant_id=tenant.id,
                uploaded_by_user_id=client_user.id,
                file_name=f"demo_evidence_{code.replace('-', '_')}.pdf",
                content_type="application/pdf",
                size_bytes=15000,
                storage_key=f"demo/valleycreek/{tenant.id}/{code}.pdf",
                tags=[ctrl.hipaa_control_id] if ctrl.hipaa_control_id else None,
            )
            db.add(ef)
            await db.flush()
            link = EvidenceLink(
                tenant_id=tenant.id,
                assessment_id=assessment.id,
                evidence_file_id=ef.id,
                control_id=ctrl.id,
            )
            db.add(link)
        await db.flush()

    return {
        "tenant_id": tenant.id,
        "tenant_name": DEMO_TENANT_NAME,
        "client_email": DEMO_CLIENT_EMAIL,
        "client_password": DEMO_CLIENT_PASSWORD,
        "message": "Demo client ready. Log in as client to see the portal, or open Clients to view.",
    }
