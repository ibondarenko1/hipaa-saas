"""
Seed ControlRequiredEvidence from SESSION 8 spec.
Maps HIPAA control IDs to required artifacts (policy, procedure, log, etc.).
Idempotent: skips existing (control_id, artifact_name) pairs.

Run after migrations (e.g. docker compose run --rm backend python scripts/seed_required_evidence.py).
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.models.models import Control
from app.models.workflow import ControlRequiredEvidence

# Format: (hipaa_control_id, artifact_name, artifact_type, required, hipaa_citation,
#          has_template, template_control_id, is_self_attestable, attestation_checklist)
REQUIRED_EVIDENCE = [
    ("HIPAA-GV-01", "Security Officer Designation Letter", "policy",
     True, "164.308(a)(2)", True, "HIPAA-GV-01", True,
     ["Our organization has designated a Security Officer",
      "The Security Officer is responsible for HIPAA compliance",
      "I understand this role and accept the responsibility"]),
    ("HIPAA-GV-02", "Business Associate Agreement (BAA)", "contract",
     True, "164.308(b)(1)", True, "HIPAA-GV-02", False, None),
    ("HIPAA-GV-03", "Security Policies and Procedures", "policy",
     True, "164.316(a)", True, "HIPAA-GV-03", True,
     ["Our organization has security policies in place",
      "Policies are reviewed at least annually",
      "All staff are aware of security policies"]),
    ("HIPAA-GV-04", "Document Retention Schedule", "policy",
     False, "164.316(b)(2)", True, "HIPAA-GV-04", True,
     ["Our organization has a document retention policy",
      "Records are retained for the required period"]),
    ("HIPAA-ID-01", "Risk Analysis Report", "report",
     True, "164.308(a)(1)(ii)(A)", False, None, False, None),
    ("HIPAA-ID-02", "Risk Management Plan", "policy",
     True, "164.308(a)(1)(ii)(B)", True, "HIPAA-ID-02", True,
     ["Our organization has reviewed security risks",
      "We have a plan to address identified risks",
      "Risk management is an ongoing process"]),
    ("HIPAA-ID-03", "Sanction Policy", "policy",
     True, "164.308(a)(1)(ii)(C)", True, "HIPAA-ID-03", True,
     ["Our organization has a workforce sanction policy",
      "Violations of HIPAA policies result in sanctions",
      "The sanction policy has been communicated to staff"]),
    ("HIPAA-PR-06", "HIPAA Security Training Records", "certificate",
     True, "164.308(a)(5)", False, None, False, None),
    ("HIPAA-PR-06", "Security Awareness Training Policy", "policy",
     True, "164.308(a)(5)(i)", True, "HIPAA-GV-03", True,
     ["Our organization provides HIPAA security training",
      "Training is provided to all new staff",
      "Training is repeated periodically (at least annually)"]),
    ("HIPAA-PR-08", "Password / Access Management Policy", "policy",
     True, "164.308(a)(5)(ii)(D)", True, "HIPAA-PR-08", True,
     ["Our organization has a password policy",
      "Passwords meet minimum complexity requirements",
      "Staff are trained on password security"]),
    ("HIPAA-PR-09", "Facility Access Control Policy", "policy",
     True, "164.310(a)(1)", True, "HIPAA-GV-03", True,
     ["Physical access to ePHI systems is restricted",
      "Visitors are escorted or logged",
      "Workstations are positioned to prevent unauthorized viewing"]),
    ("HIPAA-PR-11", "Visitor Log", "log",
     False, "164.310(a)(2)(ii)", True, "HIPAA-PR-11", True,
     ["Our facility maintains a visitor log",
      "Visitors are required to sign in and out"]),
    ("HIPAA-PR-12", "Workstation Use Policy", "policy",
     True, "164.310(b)", True, "HIPAA-PR-12", True,
     ["Our organization has a workstation use policy",
      "Workstations with ePHI access have physical safeguards",
      "Auto-lock is enabled on all workstations"]),
    ("HIPAA-PR-14", "Media Disposal / Destruction Log", "log",
     False, "164.310(d)(1)", True, "HIPAA-PR-14", True,
     ["Our organization has a media disposal procedure",
      "Hardware containing ePHI is securely wiped or destroyed",
      "Disposal is documented"]),
    ("HIPAA-PR-16", "Unique User Account List", "list",
     True, "164.312(a)(2)(i)", False, None, True,
     ["All staff have unique user accounts",
      "Shared accounts are not used for ePHI access",
      "User accounts are reviewed periodically"]),
    ("HIPAA-PR-19", "Encryption Policy / Evidence", "policy",
     True, "164.312(a)(2)(iv)", True, "HIPAA-GV-03", True,
     ["ePHI at rest is encrypted where feasible",
      "ePHI in transit is encrypted (TLS/HTTPS)",
      "Encryption keys are managed securely"]),
    ("HIPAA-PR-22", "Transmission Security Policy", "policy",
     True, "164.312(e)(1)", True, "HIPAA-GV-03", True,
     ["ePHI is only transmitted over secure channels",
      "Email containing ePHI is encrypted",
      "Remote access uses VPN or equivalent"]),
    ("HIPAA-DE-01", "System Activity Review Log / Report", "log",
     True, "164.308(a)(1)(ii)(D)", False, None, True,
     ["Our organization reviews system activity logs",
      "Suspicious activity is investigated",
      "Log reviews occur at least quarterly"]),
    ("HIPAA-DE-03", "Audit Log Evidence / Screenshots", "log",
     True, "164.312(b)", False, None, True,
     ["Audit logging is enabled on systems containing ePHI",
      "Logs are retained for the required period",
      "Logs are reviewed regularly"]),
    ("HIPAA-RS-01", "Incident Response Plan", "policy",
     True, "164.308(a)(6)(i)", True, "HIPAA-RS-01", True,
     ["Our organization has an incident response plan",
      "Staff know how to report a potential breach",
      "The plan has been tested or reviewed"]),
    ("HIPAA-RS-02", "Breach Notification Policy", "policy",
     True, "164.408", True, "HIPAA-GV-03", True,
     ["Our organization has a breach notification procedure",
      "We understand the 60-day notification requirement",
      "We know who to notify (HHS, patients, media if applicable)"]),
    ("HIPAA-RC-01", "Data Backup Policy and Backup Logs", "policy",
     True, "164.308(a)(7)(ii)(A)", True, "HIPAA-RC-01", True,
     ["Our organization performs regular data backups",
      "Backups are tested periodically",
      "Backup copies are stored securely (offsite or cloud)"]),
    ("HIPAA-RC-02", "Disaster Recovery Plan", "policy",
     True, "164.308(a)(7)(ii)(B)", True, "HIPAA-RC-02", True,
     ["Our organization has a disaster recovery plan",
      "Critical systems can be restored within an acceptable timeframe",
      "The plan has been reviewed in the past 12 months"]),
]


async def seed_required_evidence(session: AsyncSession) -> int:
    """Insert ControlRequiredEvidence for each row; return count inserted."""
    added = 0
    for (hipaa_control_id, artifact_name, artifact_type, required,
         hipaa_citation, has_template, template_control_id,
         is_self_attestable, attestation_checklist) in REQUIRED_EVIDENCE:

        control = (
            await session.execute(
                select(Control).where(Control.hipaa_control_id == hipaa_control_id).limit(1)
            )
        ).scalar_one_or_none()

        if not control:
            print(f"  Skip {hipaa_control_id} / {artifact_name}: no control with hipaa_control_id={hipaa_control_id}")
            continue

        existing = (
            await session.execute(
                select(ControlRequiredEvidence).where(
                    ControlRequiredEvidence.control_id == control.id,
                    ControlRequiredEvidence.artifact_name == artifact_name,
                )
            )
        ).scalar_one_or_none()

        if existing:
            continue

        session.add(ControlRequiredEvidence(
            control_id=str(control.id),
            artifact_name=artifact_name,
            artifact_type=artifact_type,
            required=required,
            hipaa_citation=hipaa_citation,
            has_template=has_template,
            template_control_id=template_control_id,
            is_self_attestable=is_self_attestable,
            attestation_checklist=attestation_checklist,
        ))
        added += 1

    await session.commit()
    return added


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        n = await seed_required_evidence(session)
        print(f"ControlRequiredEvidence: {n} rows added.")


if __name__ == "__main__":
    asyncio.run(main())
