"""
Seed script — Phase 1
Populates:
  - HIPAA framework
  - controlset_version v1.0 (active)
  - ruleset_version v1.0 (active)
  - All 40 HIPAA controls (per HIPAA_Control_Set_v1 spec)
  - All questions mapped to controls
  - First internal_user (admin)

Run: python scripts/seed.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.core.auth import hash_password
from app.models.models import (
    Framework, ControlsetVersion, RulesetVersion,
    Control, Rule, Question, User, Tenant, TenantMember
)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── HIPAA Controls (40 total, per spec) ───────────────────────────────────────
CONTROLS = [
    # Category A — Administrative Safeguards
    ("A1-01", "Formal Risk Analysis exists", "A1 Risk Analysis & Management", "Administrative", "Critical", False),
    ("A1-02", "Risk Management Plan defined and maintained", "A1 Risk Analysis & Management", "Administrative", "High", False),
    ("A2-03", "Assigned Security Officer (HIPAA Security Officer)", "A2 Security Governance", "Administrative", "High", False),
    ("A2-04", "Defined security policies & procedures", "A2 Security Governance", "Administrative", "High", False),
    ("A2-05", "Policy review & update process (periodic)", "A2 Security Governance", "Administrative", "Medium", False),
    ("A3-06", "Workforce authorization process (hire / role change)", "A3 Workforce Security", "Administrative", "High", False),
    ("A3-07", "Access termination process (offboarding)", "A3 Workforce Security", "Administrative", "Critical", False),
    ("A4-08", "Role-based access to ePHI systems", "A4 Information Access Management", "Administrative", "Critical", False),
    ("A4-09", "Least privilege enforced", "A4 Information Access Management", "Administrative", "High", False),
    ("A5-10", "HIPAA security awareness training provided", "A5 Security Awareness & Training", "Administrative", "Medium", False),
    ("A5-11", "Training records maintained", "A5 Security Awareness & Training", "Administrative", "Low", False),
    ("A6-12", "Incident Response Plan documented", "A6 Incident Response & Breach Readiness", "Administrative", "High", False),
    ("A6-13", "Breach notification process defined", "A6 Incident Response & Breach Readiness", "Administrative", "High", False),
    ("A6-14", "Incident logging & tracking process", "A6 Incident Response & Breach Readiness", "Administrative", "Medium", False),
    ("A7-15", "Data backup plan for ePHI", "A7 Contingency Planning", "Administrative", "High", False),
    ("A7-16", "Disaster recovery plan", "A7 Contingency Planning", "Administrative", "Medium", False),
    ("A7-17", "Emergency mode operations defined", "A7 Contingency Planning", "Administrative", "Medium", True),
    # Category B — Physical Safeguards
    ("B1-18", "Physical access to systems hosting ePHI restricted", "B1 Facility Access Controls", "Physical", "High", False),
    ("B1-19", "Visitor access control (clinic / server areas)", "B1 Facility Access Controls", "Physical", "Medium", True),
    ("B2-20", "Workstation use policy defined", "B2 Workstation Security", "Physical", "Medium", False),
    ("B2-21", "Screen lock / inactivity timeout enforced", "B2 Workstation Security", "Physical", "High", False),
    ("B3-22", "Device inventory for systems accessing ePHI", "B3 Device & Media Controls", "Physical", "High", False),
    ("B3-23", "Device disposal / reuse process", "B3 Device & Media Controls", "Physical", "Medium", False),
    ("B3-24", "Lost/stolen device response process", "B3 Device & Media Controls", "Physical", "High", False),
    # Category C — Technical Safeguards
    ("C1-25", "Unique user identification", "C1 Access Control", "Technical", "Critical", False),
    ("C1-26", "Multi-Factor Authentication for ePHI access", "C1 Access Control", "Technical", "High", False),
    ("C1-27", "Emergency access procedure defined", "C1 Access Control", "Technical", "Medium", False),
    ("C2-28", "Audit logs enabled on ePHI systems", "C2 Audit Controls", "Technical", "High", False),
    ("C2-29", "Log retention policy defined", "C2 Audit Controls", "Technical", "Medium", False),
    ("C2-30", "Periodic log review process", "C2 Audit Controls", "Technical", "Medium", False),
    ("C3-31", "Mechanisms to protect ePHI from improper alteration", "C3 Integrity Controls", "Technical", "High", False),
    ("C3-32", "Malware protection deployed", "C3 Integrity Controls", "Technical", "High", False),
    ("C4-33", "Encryption in transit for ePHI", "C4 Transmission Security", "Technical", "Critical", False),
    ("C4-34", "Secure remote access (VPN / secure portals)", "C4 Transmission Security", "Technical", "High", True),
    ("C5-35", "Password policy enforced", "C5 Authentication", "Technical", "High", False),
    ("C5-36", "Account lockout / brute force protection", "C5 Authentication", "Technical", "Medium", False),
    # Category D — Vendor & Third-Party Management
    ("D1-37", "Business Associate inventory maintained", "D1 Business Associates", "Vendor", "High", False),
    ("D1-38", "BAAs signed with all applicable vendors", "D1 Business Associates", "Vendor", "Critical", False),
    ("D2-39", "Vendor security due diligence performed", "D2 Vendor Security Oversight", "Vendor", "Medium", False),
    ("D2-40", "Vendor access reviewed periodically", "D2 Vendor Security Oversight", "Vendor", "Medium", False),
]

# ── Questions per control (question_code maps to control_code) ────────────────
# Format: (question_code, control_code, text, answer_type, options)
QUESTIONS = [
    ("A1-Q1", "A1-01", "Has a formal HIPAA Security Risk Analysis been conducted within the last 12 months?", "yes_no_unknown", None),
    ("A1-Q2", "A1-02", "Is there a documented plan to address identified security risks?", "yes_no", None),
    ("A2-Q1", "A2-03", "Is a HIPAA Security Officer formally assigned?", "yes_no", None),
    ("A2-Q2", "A2-04", "Are HIPAA security policies and procedures formally documented?", "yes_no", None),
    ("A2-Q3", "A2-05", "Are security policies reviewed and updated periodically (at least annually)?", "yes_no_unknown", None),
    ("A3-Q1", "A3-06", "Is access to systems with ePHI approved based on job role?", "yes_no", None),
    ("A3-Q2", "A3-07", "Is user access revoked immediately upon termination or role change?", "yes_no", None),
    ("A4-Q1", "A4-08", "Is access to ePHI restricted based on job roles?", "yes_no", None),
    ("A4-Q2", "A4-09", "Are users granted only the minimum access required for their role?", "yes_no_partial", None),
    ("A5-Q1", "A5-10", "Do workforce members receive HIPAA security training?", "yes_no", None),
    ("A5-Q2", "A5-11", "Are training completion records documented and retained?", "yes_no", None),
    ("A6-Q1", "A6-12", "Is there a documented security incident response plan?", "yes_no", None),
    ("A6-Q2", "A6-13", "Is there a documented process for HIPAA breach notification?", "yes_no", None),
    ("A6-Q3", "A6-14", "Are security incidents logged and tracked?", "yes_no", None),
    ("A7-Q1", "A7-15", "Is ePHI data regularly backed up?", "yes_no", None),
    ("A7-Q2", "A7-16", "Is there a documented disaster recovery plan for ePHI systems?", "yes_no", None),
    ("A7-Q3", "A7-17", "Are procedures defined to maintain operations during emergencies?", "yes_no_unknown", None),
    ("B1-Q1", "B1-18", "Is physical access to systems hosting ePHI restricted to authorized personnel?", "yes_no", None),
    ("B1-Q2", "B1-19", "Are visitors logged or supervised in areas with ePHI systems?", "yes_no_partial", None),
    ("B2-Q1", "B2-20", "Is there a workstation use/security policy?", "yes_no", None),
    ("B2-Q2", "B2-21", "Are workstations configured to lock after a period of inactivity?", "yes_no", None),
    ("B3-Q1", "B3-22", "Is there an inventory of devices that access ePHI?", "yes_no", None),
    ("B3-Q2", "B3-23", "Is there a process for securely disposing or reusing devices that contained ePHI?", "yes_no", None),
    ("B3-Q3", "B3-24", "Is there a documented response process for lost or stolen devices?", "yes_no", None),
    ("C1-Q1", "C1-25", "Does every user have a unique identifier (no shared accounts) for ePHI systems?", "yes_no", None),
    ("C1-Q2", "C1-26", "Is Multi-Factor Authentication (MFA) required to access systems with ePHI?", "yes_no_partial", None),
    ("C1-Q3", "C1-27", "Is there a documented emergency access procedure for ePHI systems?", "yes_no", None),
    ("C2-Q1", "C2-28", "Are audit logs enabled on systems that store or process ePHI?", "yes_no", None),
    ("C2-Q2", "C2-29", "Is there a defined log retention policy?", "yes_no", None),
    ("C2-Q3", "C2-30", "Are audit logs reviewed periodically?", "yes_no_unknown", None),
    ("C3-Q1", "C3-31", "Are controls in place to prevent unauthorized alteration or deletion of ePHI?", "yes_no_partial", None),
    ("C3-Q2", "C3-32", "Is anti-malware/endpoint protection deployed on systems accessing ePHI?", "yes_no", None),
    ("C4-Q1", "C4-33", "Is ePHI encrypted in transit (e.g., TLS for email, web portals, APIs)?", "yes_no", None),
    ("C4-Q2", "C4-34", "Is secure remote access (VPN or equivalent) used when accessing ePHI remotely?", "yes_no_partial", None),
    ("C5-Q1", "C5-35", "Is a password policy enforced on all systems with ePHI access?", "yes_no", None),
    ("C5-Q2", "C5-36", "Is account lockout or brute-force protection enabled?", "yes_no", None),
    ("D1-Q1", "D1-37", "Is there an inventory of Business Associates who handle ePHI?", "yes_no", None),
    ("D1-Q2", "D1-38", "Are signed Business Associate Agreements (BAAs) in place with all applicable vendors?", "yes_no_partial", None),
    ("D2-Q1", "D2-39", "Is vendor security reviewed before granting access to ePHI?", "yes_no_unknown", None),
    ("D2-Q2", "D2-40", "Is vendor access to ePHI reviewed and confirmed periodically?", "yes_no_unknown", None),
]

# ── Rules (one per control, pattern-based) ────────────────────────────────────
# Patterns per spec: PATTERN_1_BINARY_FAIL, PATTERN_2_PARTIAL, PATTERN_3_DATE, PATTERN_4_EVIDENCE_DEPENDENT
RULE_PATTERNS = {
    # Binary controls (yes_no → No = Fail, Yes = Pass)
    "A1-01": ("PATTERN_3_DATE", {"max_age_days": 365}),
    "A1-02": ("PATTERN_1_BINARY_FAIL", None),
    "A2-03": ("PATTERN_1_BINARY_FAIL", None),
    "A2-04": ("PATTERN_1_BINARY_FAIL", None),
    "A2-05": ("PATTERN_1_BINARY_FAIL", None),
    "A3-06": ("PATTERN_1_BINARY_FAIL", None),
    "A3-07": ("PATTERN_1_BINARY_FAIL", None),
    "A4-08": ("PATTERN_1_BINARY_FAIL", None),
    "A4-09": ("PATTERN_2_PARTIAL", None),
    "A5-10": ("PATTERN_1_BINARY_FAIL", None),
    "A5-11": ("PATTERN_1_BINARY_FAIL", None),
    "A6-12": ("PATTERN_1_BINARY_FAIL", None),
    "A6-13": ("PATTERN_1_BINARY_FAIL", None),
    "A6-14": ("PATTERN_1_BINARY_FAIL", None),
    "A7-15": ("PATTERN_1_BINARY_FAIL", None),
    "A7-16": ("PATTERN_1_BINARY_FAIL", None),
    "A7-17": ("PATTERN_1_BINARY_FAIL", None),
    "B1-18": ("PATTERN_1_BINARY_FAIL", None),
    "B1-19": ("PATTERN_2_PARTIAL", None),
    "B2-20": ("PATTERN_1_BINARY_FAIL", None),
    "B2-21": ("PATTERN_1_BINARY_FAIL", None),
    "B3-22": ("PATTERN_4_EVIDENCE_DEPENDENT", {"required_tags": ["inventory"]}),
    "B3-23": ("PATTERN_1_BINARY_FAIL", None),
    "B3-24": ("PATTERN_1_BINARY_FAIL", None),
    "C1-25": ("PATTERN_1_BINARY_FAIL", None),
    "C1-26": ("PATTERN_2_PARTIAL", None),
    "C1-27": ("PATTERN_1_BINARY_FAIL", None),
    "C2-28": ("PATTERN_1_BINARY_FAIL", None),
    "C2-29": ("PATTERN_1_BINARY_FAIL", None),
    "C2-30": ("PATTERN_1_BINARY_FAIL", None),
    "C3-31": ("PATTERN_2_PARTIAL", None),
    "C3-32": ("PATTERN_1_BINARY_FAIL", None),
    "C4-33": ("PATTERN_1_BINARY_FAIL", None),
    "C4-34": ("PATTERN_2_PARTIAL", None),
    "C5-35": ("PATTERN_4_EVIDENCE_DEPENDENT", {"required_tags": ["policy"]}),
    "C5-36": ("PATTERN_1_BINARY_FAIL", None),
    "D1-37": ("PATTERN_4_EVIDENCE_DEPENDENT", {"required_tags": ["vendor", "baa"]}),
    "D1-38": ("PATTERN_2_PARTIAL", None),
    "D2-39": ("PATTERN_1_BINARY_FAIL", None),
    "D2-40": ("PATTERN_1_BINARY_FAIL", None),
}


async def seed():
    async with SessionLocal() as db:
        # ── Framework ──────────────────────────────────────────────────────────
        result = await db.execute(select(Framework).where(Framework.code == "HIPAA"))
        framework = result.scalar_one_or_none()
        if not framework:
            framework = Framework(code="HIPAA", name="HIPAA Security Rule (45 CFR 164)")
            db.add(framework)
            await db.flush()
            print(f"✓ Framework created: {framework.id}")
        else:
            print(f"→ Framework exists: {framework.id}")

        # ── ControlsetVersion ──────────────────────────────────────────────────
        result = await db.execute(
            select(ControlsetVersion).where(
                ControlsetVersion.framework_id == framework.id,
                ControlsetVersion.version == "v1.0",
            )
        )
        csv = result.scalar_one_or_none()
        if not csv:
            from datetime import datetime, timezone
            csv = ControlsetVersion(
                framework_id=framework.id,
                version="v1.0",
                is_active=True,
                published_at=datetime.now(timezone.utc),
                notes="Initial HIPAA control set for SMB healthcare",
            )
            db.add(csv)
            await db.flush()
            print(f"✓ ControlsetVersion created: {csv.id}")
        else:
            print(f"→ ControlsetVersion exists: {csv.id}")

        # ── RulesetVersion ─────────────────────────────────────────────────────
        result = await db.execute(
            select(RulesetVersion).where(
                RulesetVersion.framework_id == framework.id,
                RulesetVersion.version == "v1.0",
            )
        )
        rsv = result.scalar_one_or_none()
        if not rsv:
            from datetime import datetime, timezone
            rsv = RulesetVersion(
                framework_id=framework.id,
                version="v1.0",
                is_active=True,
                published_at=datetime.now(timezone.utc),
                notes="Initial rule set — pattern-based engine v1",
            )
            db.add(rsv)
            await db.flush()
            print(f"✓ RulesetVersion created: {rsv.id}")
        else:
            print(f"→ RulesetVersion exists: {rsv.id}")

        # ── Controls ───────────────────────────────────────────────────────────
        control_map = {}  # code → Control
        for code, title, description, category, severity, na_eligible in CONTROLS:
            result = await db.execute(
                select(Control).where(
                    Control.controlset_version_id == csv.id,
                    Control.control_code == code,
                )
            )
            ctrl = result.scalar_one_or_none()
            if not ctrl:
                ctrl = Control(
                    framework_id=framework.id,
                    controlset_version_id=csv.id,
                    control_code=code,
                    title=title,
                    description=description,
                    category=category,
                    severity=severity,
                    na_eligible=na_eligible,
                )
                db.add(ctrl)
                await db.flush()
            control_map[code] = ctrl

        print(f"✓ Controls seeded: {len(control_map)}")

        # ── Rules ──────────────────────────────────────────────────────────────
        rules_created = 0
        for ctrl_code, (pattern, logic) in RULE_PATTERNS.items():
            ctrl = control_map.get(ctrl_code)
            if not ctrl:
                continue
            result = await db.execute(
                select(Rule).where(
                    Rule.ruleset_version_id == rsv.id,
                    Rule.control_id == ctrl.id,
                )
            )
            if not result.scalar_one_or_none():
                rule = Rule(
                    ruleset_version_id=rsv.id,
                    control_id=ctrl.id,
                    pattern=pattern,
                    logic=logic,
                )
                db.add(rule)
                rules_created += 1
        await db.flush()
        print(f"✓ Rules seeded: {rules_created}")

        # ── Questions ──────────────────────────────────────────────────────────
        questions_created = 0
        for q_code, ctrl_code, text, answer_type, options in QUESTIONS:
            ctrl = control_map.get(ctrl_code)
            if not ctrl:
                print(f"  ⚠ Control not found for question {q_code}: {ctrl_code}")
                continue
            result = await db.execute(
                select(Question).where(
                    Question.framework_id == framework.id,
                    Question.question_code == q_code,
                )
            )
            if not result.scalar_one_or_none():
                q = Question(
                    framework_id=framework.id,
                    control_id=ctrl.id,
                    question_code=q_code,
                    text=text,
                    answer_type=answer_type,
                    options=options,
                    is_active=True,
                )
                db.add(q)
                questions_created += 1
        await db.flush()
        print(f"✓ Questions seeded: {questions_created}")

        # ── First internal user ────────────────────────────────────────────────
        admin_email = os.getenv("ADMIN_EMAIL", "admin@summitrange.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")

        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email=admin_email,
                full_name="Summit Range Admin",
                password_hash=hash_password(admin_password),
                status="active",
            )
            db.add(admin)
            await db.flush()
            print(f"✓ Admin user created: {admin_email}")
            print(f"  Password: {admin_password}  ← CHANGE IN PRODUCTION")
        else:
            print(f"→ Admin user exists: {admin_email}")

        # ── Internal tenant for Summit Range team ──────────────────────────────
        result = await db.execute(select(Tenant).where(Tenant.name == "Summit Range Consulting"))
        internal_tenant = result.scalar_one_or_none()
        if not internal_tenant:
            internal_tenant = Tenant(
                name="Summit Range Consulting",
                industry="Cybersecurity Consulting",
                primary_contact_email=admin_email,
            )
            db.add(internal_tenant)
            await db.flush()

            member = TenantMember(
                tenant_id=internal_tenant.id,
                user_id=admin.id,
                role="internal_user",
            )
            db.add(member)
            await db.flush()
            print(f"✓ Internal tenant created: {internal_tenant.id}")
        else:
            print(f"→ Internal tenant exists")

        await db.commit()
        print("\n✅ Seed complete.")
        print(f"   Framework ID : {framework.id}")
        print(f"   ControlSet   : {csv.id} (v1.0, active)")
        print(f"   RuleSet      : {rsv.id} (v1.0, active)")
        print(f"   Controls     : {len(control_map)}")
        print(f"   Questions    : {len(QUESTIONS)}")
        print(f"   Admin email  : {admin_email}")


if __name__ == "__main__":
    asyncio.run(seed())
