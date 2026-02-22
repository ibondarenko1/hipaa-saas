"""
Compliance Mapping Engine — v1
Deterministic, rules-based. Per spec: Блок 2.2 — Rule Patterns v1.

Patterns:
  PATTERN_1_BINARY_FAIL        — Yes/No → No=Fail
  PATTERN_2_PARTIAL            — Yes/No/Partial → Partial=Partial, No=Fail
  PATTERN_3_DATE               — date answer, time-bound validity (12 months)
  PATTERN_4_EVIDENCE_DEPENDENT — Yes without evidence → Partial
  PATTERN_5_NA_VALID           — N/A eligible controls → Pass on N/A
  PATTERN_6_TIME_BOUND         — alias for PATTERN_3
  PATTERN_7_COMPOUND           — multiple questions, compound logic (v1: first Q drives result)

Output per run:
  control_results — one per control in controlset_version
  gaps            — one per non-Pass control result
  risks           — 1:1 with gaps
  remediation_actions — 1+ per gap

Per spec: replace outputs on re-run (idempotent).
Per spec: all controls must have a result, every non-Pass must have gap+risk+remediation.
"""

import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.models import (
    Assessment, Answer, Question, Control, Rule,
    EvidenceLink, ControlResult, Gap, Risk, RemediationAction
)


# ── Severity priority (for downgrade logic) ───────────────────────────────────
SEVERITY_ORDER = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
SEVERITY_DOWN = {"Critical": "High", "High": "Medium", "Medium": "Low", "Low": "Low"}


# ── Remediation templates (per spec: rule has template_id → description) ──────
# In v1: embedded in engine. Phase 4+ can move to DB.
REMEDIATION_TEMPLATES: dict[str, dict] = {
    "TMPL_RISK_ANALYSIS": {
        "description": "Conduct a formal HIPAA Security Risk Analysis. Document all ePHI assets, threats, vulnerabilities, and controls. Update annually or after significant changes.",
        "type": "Process",
        "effort": "L",
    },
    "TMPL_RISK_MGMT_PLAN": {
        "description": "Develop and document a Risk Management Plan that tracks identified risks and assigns remediation owners and timelines.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_SECURITY_OFFICER": {
        "description": "Formally designate a HIPAA Security Officer. Document the assignment in writing and communicate responsibilities to the workforce.",
        "type": "Policy",
        "effort": "S",
    },
    "TMPL_POLICIES": {
        "description": "Develop and formalize HIPAA security policies and procedures covering all required safeguards. Store in a version-controlled repository.",
        "type": "Policy",
        "effort": "L",
    },
    "TMPL_POLICY_REVIEW": {
        "description": "Establish an annual policy review cycle. Assign an owner and calendar reminders for each policy document.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_WORKFORCE_AUTH": {
        "description": "Implement a formal access request and approval workflow for all new hires and role changes. Tie to HR onboarding process.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_OFFBOARDING": {
        "description": "Implement same-day access termination on employee exit. Create a checklist: disable accounts, revoke VPN, collect devices. Test quarterly.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_RBAC": {
        "description": "Implement Role-Based Access Control for all systems containing ePHI. Define roles and map to minimum necessary access.",
        "type": "Technical",
        "effort": "L",
    },
    "TMPL_LEAST_PRIV": {
        "description": "Review and reduce user privileges to the minimum required. Conduct quarterly access reviews. Remove excessive permissions.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_TRAINING": {
        "description": "Implement annual HIPAA security awareness training for all workforce members. Use an LMS to track completion.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_TRAINING_RECORDS": {
        "description": "Maintain training completion records for at least 6 years. Export from LMS and store in a compliance folder.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_IRP": {
        "description": "Document a formal Incident Response Plan covering detection, containment, eradication, recovery, and post-incident review.",
        "type": "Policy",
        "effort": "M",
    },
    "TMPL_BREACH_NOTIF": {
        "description": "Establish a HIPAA breach notification procedure with defined timelines (60-day OCR notification, individual notification). Assign responsible parties.",
        "type": "Policy",
        "effort": "M",
    },
    "TMPL_INCIDENT_LOG": {
        "description": "Create an incident log/register. Assign an incident coordinator. Track all security events, even minor ones.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_BACKUP": {
        "description": "Implement automated encrypted backups of all ePHI. Test restore quarterly. Store backups offsite or in a separate cloud region.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_DR": {
        "description": "Develop a Disaster Recovery Plan covering RTO/RPO targets, recovery procedures, and contact lists. Test annually.",
        "type": "Process",
        "effort": "L",
    },
    "TMPL_EMERGENCY_MODE": {
        "description": "Define emergency mode operating procedures for maintaining access to ePHI during system outages.",
        "type": "Policy",
        "effort": "M",
    },
    "TMPL_PHYSICAL_ACCESS": {
        "description": "Restrict physical access to server rooms and workstations with ePHI using key cards, locks, or equivalent. Log access.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_VISITOR_CTRL": {
        "description": "Implement visitor sign-in log for areas with ePHI systems. Require escort for non-authorized visitors.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_WORKSTATION_POLICY": {
        "description": "Document a workstation use policy covering acceptable use, screen lock requirements, and prohibited activities.",
        "type": "Policy",
        "effort": "S",
    },
    "TMPL_SCREEN_LOCK": {
        "description": "Configure all workstations with ePHI access to auto-lock after 10 minutes of inactivity. Enforce via GPO or MDM.",
        "type": "Technical",
        "effort": "S",
    },
    "TMPL_DEVICE_INVENTORY": {
        "description": "Create and maintain a device inventory listing all devices that access ePHI. Include device type, owner, OS, and encryption status.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_DEVICE_DISPOSAL": {
        "description": "Document a device disposal procedure requiring data wiping (NIST 800-88 or equivalent) before retirement or reuse.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_DEVICE_LOST": {
        "description": "Create a lost/stolen device response procedure: remote wipe capability, incident report, OCR notification assessment.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_UNIQUE_IDS": {
        "description": "Eliminate shared accounts on all ePHI systems. Assign unique user IDs to each workforce member. Audit immediately.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_MFA": {
        "description": "Enable Multi-Factor Authentication on all systems accessing ePHI. Prioritize: EHR, email, remote access, cloud storage.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_EMERGENCY_ACCESS": {
        "description": "Define an emergency access procedure for ePHI systems when primary authentication is unavailable. Document break-glass credentials securely.",
        "type": "Policy",
        "effort": "S",
    },
    "TMPL_AUDIT_LOGS": {
        "description": "Enable audit logging on all systems processing or storing ePHI. Capture login, access, modification, and deletion events.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_LOG_RETENTION": {
        "description": "Define and implement a log retention policy (minimum 6 years per HIPAA). Configure log archiving to a WORM-compliant storage.",
        "type": "Policy",
        "effort": "S",
    },
    "TMPL_LOG_REVIEW": {
        "description": "Establish a monthly audit log review process. Assign a reviewer. Document anomalies and follow-up actions.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_INTEGRITY": {
        "description": "Implement controls to prevent unauthorized alteration of ePHI: file integrity monitoring, access controls, and database audit trails.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_MALWARE": {
        "description": "Deploy endpoint protection (AV/EDR) on all devices accessing ePHI. Enable real-time scanning and automatic updates.",
        "type": "Technical",
        "effort": "S",
    },
    "TMPL_ENCRYPTION_TRANSIT": {
        "description": "Enforce TLS 1.2+ for all ePHI transmitted over networks. Disable unencrypted protocols (HTTP, FTP, Telnet). Include email encryption for ePHI.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_VPN": {
        "description": "Implement VPN or equivalent secure remote access for all workforce members accessing ePHI remotely. Enforce MFA on VPN.",
        "type": "Technical",
        "effort": "M",
    },
    "TMPL_PASSWORD_POLICY": {
        "description": "Enforce a password policy: minimum 12 characters, complexity requirements, no reuse of last 12 passwords. Enforce via GPO or IdP.",
        "type": "Technical",
        "effort": "S",
    },
    "TMPL_ACCOUNT_LOCKOUT": {
        "description": "Configure account lockout after 5 failed login attempts. Set lockout duration to 30 minutes or require admin unlock.",
        "type": "Technical",
        "effort": "S",
    },
    "TMPL_BA_INVENTORY": {
        "description": "Create a Business Associate inventory listing all vendors with access to ePHI. Include contact, services, and BAA status.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_BAA": {
        "description": "Execute signed Business Associate Agreements with all applicable vendors before granting ePHI access. Review annually.",
        "type": "Policy",
        "effort": "M",
    },
    "TMPL_VENDOR_DD": {
        "description": "Implement vendor security due diligence: security questionnaire, SOC 2 review, or equivalent before onboarding vendors with ePHI access.",
        "type": "Process",
        "effort": "M",
    },
    "TMPL_VENDOR_REVIEW": {
        "description": "Conduct annual vendor access reviews. Confirm ePHI access is still necessary. Revoke access for inactive vendors.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_CLARIFY_UNKNOWN": {
        "description": "Investigate and document the current state of this control. Assign an owner to determine compliance status within 30 days.",
        "type": "Process",
        "effort": "S",
    },
    "TMPL_PROVIDE_EVIDENCE": {
        "description": "Gather and upload supporting evidence for this control (policy document, screenshot, vendor certificate, or training record).",
        "type": "Process",
        "effort": "S",
    },
}

# ── Control → template mapping ────────────────────────────────────────────────
CONTROL_TEMPLATES: dict[str, str] = {
    "A1-01": "TMPL_RISK_ANALYSIS",
    "A1-02": "TMPL_RISK_MGMT_PLAN",
    "A2-03": "TMPL_SECURITY_OFFICER",
    "A2-04": "TMPL_POLICIES",
    "A2-05": "TMPL_POLICY_REVIEW",
    "A3-06": "TMPL_WORKFORCE_AUTH",
    "A3-07": "TMPL_OFFBOARDING",
    "A4-08": "TMPL_RBAC",
    "A4-09": "TMPL_LEAST_PRIV",
    "A5-10": "TMPL_TRAINING",
    "A5-11": "TMPL_TRAINING_RECORDS",
    "A6-12": "TMPL_IRP",
    "A6-13": "TMPL_BREACH_NOTIF",
    "A6-14": "TMPL_INCIDENT_LOG",
    "A7-15": "TMPL_BACKUP",
    "A7-16": "TMPL_DR",
    "A7-17": "TMPL_EMERGENCY_MODE",
    "B1-18": "TMPL_PHYSICAL_ACCESS",
    "B1-19": "TMPL_VISITOR_CTRL",
    "B2-20": "TMPL_WORKSTATION_POLICY",
    "B2-21": "TMPL_SCREEN_LOCK",
    "B3-22": "TMPL_DEVICE_INVENTORY",
    "B3-23": "TMPL_DEVICE_DISPOSAL",
    "B3-24": "TMPL_DEVICE_LOST",
    "C1-25": "TMPL_UNIQUE_IDS",
    "C1-26": "TMPL_MFA",
    "C1-27": "TMPL_EMERGENCY_ACCESS",
    "C2-28": "TMPL_AUDIT_LOGS",
    "C2-29": "TMPL_LOG_RETENTION",
    "C2-30": "TMPL_LOG_REVIEW",
    "C3-31": "TMPL_INTEGRITY",
    "C3-32": "TMPL_MALWARE",
    "C4-33": "TMPL_ENCRYPTION_TRANSIT",
    "C4-34": "TMPL_VPN",
    "C5-35": "TMPL_PASSWORD_POLICY",
    "C5-36": "TMPL_ACCOUNT_LOCKOUT",
    "D1-37": "TMPL_BA_INVENTORY",
    "D1-38": "TMPL_BAA",
    "D2-39": "TMPL_VENDOR_DD",
    "D2-40": "TMPL_VENDOR_REVIEW",
}


# ── Engine result dataclass ───────────────────────────────────────────────────

class ControlEvaluation:
    """Result of evaluating one control."""
    __slots__ = ("control_id", "control_code", "status", "severity", "rationale",
                 "has_gap", "template_id")

    def __init__(self, control_id: str, control_code: str, status: str,
                 severity: str, rationale: str, has_gap: bool, template_id: str):
        self.control_id = control_id
        self.control_code = control_code
        self.status = status
        self.severity = severity
        self.rationale = rationale
        self.has_gap = has_gap
        self.template_id = template_id


# ── Pattern evaluators ────────────────────────────────────────────────────────

def _apply_pattern_1(answer: Optional[dict], control: Control) -> tuple[str, str]:
    """PATTERN_1_BINARY_FAIL — Yes=Pass, No=Fail, missing=Unknown."""
    if not answer:
        return "Unknown", "No answer provided."
    choice = answer.get("choice", "")
    if choice == "Yes":
        return "Pass", "Control is in place."
    if choice == "No":
        return "Fail", "Control is not implemented."
    return "Unknown", f"Unrecognized answer: {choice!r}."


def _apply_pattern_2(answer: Optional[dict], control: Control) -> tuple[str, str]:
    """PATTERN_2_PARTIAL — Yes=Pass, Partial=Partial, No=Fail."""
    if not answer:
        return "Unknown", "No answer provided."
    choice = answer.get("choice", "")
    if choice == "Yes":
        return "Pass", "Control is fully implemented."
    if choice == "Partial":
        return "Partial", "Control is partially implemented."
    if choice == "No":
        return "Fail", "Control is not implemented."
    return "Unknown", f"Unrecognized answer: {choice!r}."


def _apply_pattern_3(answer: Optional[dict], logic: Optional[dict], control: Control) -> tuple[str, str]:
    """PATTERN_3_DATE / PATTERN_6_TIME_BOUND — date answer, time-bound validity."""
    if not answer:
        return "Unknown", "No answer provided."
    choice = answer.get("choice", "")
    # first check yes/no choice (some date controls have both)
    if choice == "No":
        return "Fail", "Control has not been performed."
    if choice == "Unknown":
        return "Unknown", "Status unknown — review required."

    date_str = answer.get("date")
    if not date_str:
        # answered Yes but no date — treat as Partial
        return "Partial", "Answered Yes but no date provided to verify recency."

    try:
        last_date = date.fromisoformat(date_str)
    except ValueError:
        return "Unknown", f"Invalid date format: {date_str!r}."

    max_age_days = (logic or {}).get("max_age_days", 365)
    age_days = (date.today() - last_date).days

    if age_days <= max_age_days:
        return "Pass", f"Performed {age_days} days ago (within {max_age_days}-day requirement)."
    else:
        return "Fail", f"Last performed {age_days} days ago — exceeds {max_age_days}-day requirement."


def _apply_pattern_4(
    answer: Optional[dict],
    has_evidence: bool,
    control: Control,
) -> tuple[str, str]:
    """PATTERN_4_EVIDENCE_DEPENDENT — Yes without evidence → Partial."""
    if not answer:
        return "Unknown", "No answer provided."
    choice = answer.get("choice", "")
    if choice == "No":
        return "Fail", "Control is not implemented."
    if choice == "Yes":
        if has_evidence:
            return "Pass", "Control is in place with supporting evidence."
        else:
            return "Partial", "Answered Yes but no supporting evidence uploaded."
    if choice == "Partial":
        return "Partial", "Control is partially implemented."
    return "Unknown", f"Unrecognized answer: {choice!r}."


def _apply_pattern_5(answer: Optional[dict], control: Control) -> tuple[str, str]:
    """PATTERN_5_NA_VALID — N/A is a valid Pass for na_eligible controls."""
    if not answer:
        return "Unknown", "No answer provided."
    choice = answer.get("choice", "")
    if choice == "N/A":
        if control.na_eligible:
            return "Pass", "Control marked as Not Applicable."
        else:
            return "Fail", "N/A is not allowed for this control."
    # Fall through to binary evaluation
    if choice == "Yes":
        return "Pass", "Control is in place."
    if choice == "No":
        return "Fail", "Control is not implemented."
    if choice == "Partial":
        return "Partial", "Control is partially implemented."
    return "Unknown", f"Unrecognized answer: {choice!r}."


def _evaluate_control(
    control: Control,
    rule: Optional[Rule],
    answer: Optional[dict],
    has_evidence: bool,
) -> tuple[str, str]:
    """
    Dispatch to the correct pattern evaluator.
    Returns (status, rationale).
    """
    if not rule:
        # No rule defined — default to Unknown
        return "Unknown", "No rule pattern defined for this control."

    pattern = rule.pattern
    logic = rule.logic or {}

    # N/A shortcut — check before pattern dispatch
    if answer and answer.get("choice") == "N/A":
        return _apply_pattern_5(answer, control)

    if pattern in ("PATTERN_1_BINARY_FAIL",):
        return _apply_pattern_1(answer, control)

    if pattern in ("PATTERN_2_PARTIAL",):
        return _apply_pattern_2(answer, control)

    if pattern in ("PATTERN_3_DATE", "PATTERN_6_TIME_BOUND"):
        return _apply_pattern_3(answer, logic, control)

    if pattern in ("PATTERN_4_EVIDENCE_DEPENDENT",):
        return _apply_pattern_4(answer, has_evidence, control)

    if pattern in ("PATTERN_5_NA_VALID",):
        return _apply_pattern_5(answer, control)

    if pattern in ("PATTERN_7_COMPOUND",):
        # v1: treat as binary (multi-question compound not yet fully implemented)
        return _apply_pattern_1(answer, control)

    # Fallback
    return "Unknown", f"Unknown pattern: {pattern!r}."


def _severity_to_priority(severity: str) -> str:
    """Map control severity to remediation priority."""
    return {
        "Critical": "Critical",
        "High": "High",
        "Medium": "Medium",
        "Low": "Low",
    }.get(severity, "Medium")


def _severity_to_effort(severity: str) -> str:
    """Heuristic: higher severity = more effort."""
    return {
        "Critical": "L",
        "High": "M",
        "Medium": "S",
        "Low": "S",
    }.get(severity, "M")


# ── Main engine function ──────────────────────────────────────────────────────

async def run_engine(
    assessment: Assessment,
    db: AsyncSession,
) -> dict:
    """
    Runs the compliance mapping engine for an assessment.
    Replaces all existing outputs (idempotent re-run).

    Returns:
        {
            "pass": int, "partial": int, "fail": int, "unknown": int,
            "gaps": int, "risks": int, "remediations": int,
            "errors": list[str]
        }
    """
    now = datetime.now(timezone.utc)
    errors = []

    # ── 1. Delete existing outputs (replace mode) ──────────────────────────────
    await db.execute(
        delete(RemediationAction).where(RemediationAction.assessment_id == assessment.id)
    )
    await db.execute(
        delete(Risk).where(Risk.assessment_id == assessment.id)
    )
    await db.execute(
        delete(Gap).where(Gap.assessment_id == assessment.id)
    )
    await db.execute(
        delete(ControlResult).where(ControlResult.assessment_id == assessment.id)
    )
    await db.flush()

    # ── 2. Load all controls for this assessment's controlset ──────────────────
    ctrl_result = await db.execute(
        select(Control).where(
            Control.controlset_version_id == assessment.controlset_version_id
        )
    )
    controls = ctrl_result.scalars().all()

    # ── 3. Load all rules for this assessment's ruleset ────────────────────────
    rule_result = await db.execute(
        select(Rule).where(
            Rule.ruleset_version_id == assessment.ruleset_version_id
        )
    )
    rules_map: dict[str, Rule] = {r.control_id: r for r in rule_result.scalars().all()}

    # ── 4. Load all answers for this assessment (question → Answer) ────────────
    answers_result = await db.execute(
        select(Answer, Question)
        .join(Question, Question.id == Answer.question_id)
        .where(Answer.assessment_id == assessment.id)
    )
    # Build control_code → answer dict (one question per control in v1)
    control_answers: dict[str, dict] = {}
    for ans, question in answers_result.all():
        # Map via question.control_id
        control_answers[question.control_id] = ans.value

    # ── 5. Load evidence per control ───────────────────────────────────────────
    evidence_result = await db.execute(
        select(EvidenceLink.control_id).where(
            EvidenceLink.assessment_id == assessment.id,
            EvidenceLink.control_id.is_not(None),
        )
    )
    controls_with_evidence: set[str] = {row[0] for row in evidence_result.all()}

    # ── 6. Evaluate each control ───────────────────────────────────────────────
    stats = {"Pass": 0, "Partial": 0, "Fail": 0, "Unknown": 0}
    gap_count = 0
    risk_count = 0
    remediation_count = 0

    for control in controls:
        rule = rules_map.get(control.id)
        answer = control_answers.get(control.id)
        has_evidence = control.id in controls_with_evidence

        status, rationale = _evaluate_control(control, rule, answer, has_evidence)
        stats[status] = stats.get(status, 0) + 1

        # ── Write ControlResult ────────────────────────────────────────────────
        cr = ControlResult(
            tenant_id=assessment.tenant_id,
            assessment_id=assessment.id,
            control_id=control.id,
            status=status,
            severity=control.severity,
            rationale=rationale,
            calculated_at=now,
        )
        db.add(cr)
        await db.flush()  # get cr.id

        # ── Write Gap if status != Pass ────────────────────────────────────────
        if status != "Pass":
            template_id = CONTROL_TEMPLATES.get(control.control_code, "TMPL_CLARIFY_UNKNOWN")
            template = REMEDIATION_TEMPLATES.get(template_id, {})

            gap_desc = _build_gap_description(control, status, answer)
            gap = Gap(
                tenant_id=assessment.tenant_id,
                assessment_id=assessment.id,
                control_id=control.id,
                status_source=status,
                severity=control.severity,
                description=gap_desc,
                recommended_remediation=template.get("description", ""),
            )
            db.add(gap)
            await db.flush()
            gap_count += 1

            # ── Write Risk (1:1 with Gap) ──────────────────────────────────────
            risk = Risk(
                tenant_id=assessment.tenant_id,
                assessment_id=assessment.id,
                gap_id=gap.id,
                severity=control.severity,
                description=_build_risk_description(control, status),
                rationale=rationale,
            )
            db.add(risk)
            await db.flush()
            risk_count += 1

            # ── Write RemediationAction ────────────────────────────────────────
            remediation = RemediationAction(
                tenant_id=assessment.tenant_id,
                assessment_id=assessment.id,
                gap_id=gap.id,
                priority=_severity_to_priority(control.severity),
                effort=template.get("effort", _severity_to_effort(control.severity)),
                remediation_type=template.get("type", "Process"),
                description=template.get("description", f"Remediate {control.title}"),
                template_reference=template_id,
            )
            db.add(remediation)
            remediation_count += 1

    await db.flush()

    # ── 7. Consistency check (per spec: section 6.3) ──────────────────────────
    if len(controls) == 0:
        errors.append("No controls found in controlset_version — engine may have no data.")

    return {
        "pass": stats.get("Pass", 0),
        "partial": stats.get("Partial", 0),
        "fail": stats.get("Fail", 0),
        "unknown": stats.get("Unknown", 0),
        "total_controls": len(controls),
        "gaps": gap_count,
        "risks": risk_count,
        "remediations": remediation_count,
        "errors": errors,
    }


def _build_gap_description(control: Control, status: str, answer: Optional[dict]) -> str:
    choice = (answer or {}).get("choice", "not answered")
    if status == "Fail":
        return (
            f"{control.title} — HIPAA gap identified. "
            f"Control '{control.control_code}' evaluated as Fail "
            f"(answer: {choice}). Immediate remediation required."
        )
    if status == "Partial":
        return (
            f"{control.title} — partial compliance. "
            f"Control '{control.control_code}' is not fully implemented "
            f"(answer: {choice}). Improvement required."
        )
    if status == "Unknown":
        return (
            f"{control.title} — compliance status unknown. "
            f"Control '{control.control_code}' requires investigation "
            f"(answer: {choice or 'missing'}). Documentation needed."
        )
    return f"{control.title} — gap detected (status: {status})."


def _build_risk_description(control: Control, status: str) -> str:
    if status == "Fail":
        return (
            f"Risk: {control.title} is not implemented. "
            f"This creates a {control.severity}-severity HIPAA compliance risk "
            f"under category '{control.category}'."
        )
    if status == "Partial":
        return (
            f"Risk: {control.title} is only partially implemented. "
            f"Partial coverage creates a residual {control.severity}-severity risk."
        )
    return (
        f"Risk: Compliance status of '{control.title}' is unknown. "
        f"Unverified controls represent an unquantified {control.severity}-severity risk."
    )
