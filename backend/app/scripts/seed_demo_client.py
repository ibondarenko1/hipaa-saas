"""
Seed demo client: small practice "on duct tape", starting to get in order.
Creates tenant, client user, one assessment with realistic answers.

Run after seed.py. From project root:
  docker compose exec backend python -m app.scripts.seed_demo_client
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.core.auth import hash_password
from app.models.models import (
    Framework, ControlsetVersion, RulesetVersion,
    User, Tenant, TenantMember, Assessment, Question, Answer,
)
from app.services.engine import run_engine

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

DEMO_TENANT_NAME = "Valley Creek Family Practice"
DEMO_INDUSTRY = "Primary Care / Family Medicine"
DEMO_CLIENT_EMAIL = "client@valleycreek.example.com"
DEMO_CLIENT_PASSWORD = "Client2024!"
DEMO_CLIENT_NAME = "Maria Lopez"

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


async def seed_demo_client():
    async with SessionLocal() as db:
        r = await db.execute(select(Framework).where(Framework.code == "HIPAA"))
        framework = r.scalar_one_or_none()
        if not framework:
            print("Run seed.py first (no HIPAA framework).")
            return

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
            print("Run seed.py first (no active controlset/ruleset).")
            return

        admin_email = (os.getenv("ADMIN_EMAIL", "admin@summitrange.com") or "").strip().lower()
        r = await db.execute(select(User).where(User.email == admin_email))
        admin = r.scalar_one_or_none()
        if not admin:
            print("Admin user not found. Run seed.py first.")
            return

        r = await db.execute(select(Tenant).where(Tenant.name == DEMO_TENANT_NAME))
        tenant = r.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name=DEMO_TENANT_NAME,
                industry=DEMO_INDUSTRY,
                primary_contact_email=DEMO_CLIENT_EMAIL,
            )
            db.add(tenant)
            await db.flush()
            print(f"✓ Tenant created: {tenant.name}")
        else:
            print(f"→ Tenant exists: {tenant.name}")

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
            print(f"✓ Client user created: {DEMO_CLIENT_EMAIL}")
        else:
            print(f"→ Client user exists: {DEMO_CLIENT_EMAIL}")

        r = await db.execute(
            select(TenantMember).where(
                TenantMember.tenant_id == tenant.id,
                TenantMember.user_id == client_user.id,
            )
        )
        if r.scalar_one_or_none() is None:
            db.add(TenantMember(tenant_id=tenant.id, user_id=client_user.id, role="client_user"))
            await db.flush()
            print("✓ Client added to tenant as client_user")

        # So admin sees this tenant in the dashboard
        r = await db.execute(
            select(TenantMember).where(
                TenantMember.tenant_id == tenant.id,
                TenantMember.user_id == admin.id,
            )
        )
        if r.scalar_one_or_none() is None:
            db.add(TenantMember(tenant_id=tenant.id, user_id=admin.id, role="internal_user"))
            await db.flush()
            print("✓ Admin added to demo tenant (internal_user)")

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
            print(f"✓ Assessment created: {assessment.id}")
        else:
            print(f"→ Assessment exists: {assessment.id}")

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
        print(f"✓ Answers created: {created}")

        # Mark assessment submitted and run engine so reports can be generated
        if assessment.status != "submitted" and assessment.status != "completed":
            assessment.status = "submitted"
            assessment.submitted_at = datetime.now(timezone.utc)
            await db.flush()
            print("✓ Assessment marked as submitted")
            try:
                stats = await run_engine(assessment, db)
                await db.flush()
                print(f"✓ Engine run: {stats.get('pass', 0)} pass, {stats.get('gaps', 0)} gaps")
            except Exception as e:
                print(f"  ⚠ Engine run failed (reports will need manual Run Engine): {e}")

        await db.commit()
        print("✅ Demo client ready.")
        print(f"   Client login: {DEMO_CLIENT_EMAIL} / {DEMO_CLIENT_PASSWORD}")


if __name__ == "__main__":
    try:
        asyncio.run(seed_demo_client())
    except Exception as e:
        print(f"Demo client seed failed: {e}")
        import traceback
        traceback.print_exc()
        exit(0)
