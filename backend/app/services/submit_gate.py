"""
Submit Gate (Gate 1) — per Validation_Rules_v1 spec section 5
Checks:
  1. answered_ratio >= 0.70
  2. All critical questions are answered (any value, not null)
  3. MFA and Encryption in transit cannot be N/A
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import Assessment, Answer, Question
from app.core.config import settings


# Critical question codes that MUST be answered (per spec)
# These map to question_codes seeded in Phase 1
CRITICAL_QUESTION_CODES = [
    "A1-Q1",   # Risk Analysis done?
    "A3-Q2",   # Access termination process?
    "C1-Q1",   # Unique user identification?
    "C4-Q1",   # Encryption in transit?
    "D1-Q2",   # BAAs executed?
    "C1-Q2",   # MFA enabled?
]

# Per spec: MFA and Encryption in transit — N/A is forbidden
NA_FORBIDDEN_CODES = {"C1-Q2", "C4-Q1"}


async def run_submit_gate(
    assessment: Assessment,
    db: AsyncSession,
) -> None:
    """
    Validates assessment completeness before submission.
    Raises HTTP 400 with structured payload if gate fails.
    Per spec: SubmitValidationError payload format.
    """
    # ── Count active questions for this framework ──────────────────────────────
    q_result = await db.execute(
        select(func.count()).select_from(Question).where(
            Question.framework_id == assessment.framework_id,
            Question.is_active == True,
        )
    )
    total_questions = q_result.scalar_one()

    if total_questions == 0:
        raise HTTPException(status_code=500, detail="No active questions found for framework")

    # ── Count answered questions for this assessment ───────────────────────────
    a_result = await db.execute(
        select(func.count()).select_from(Answer).where(
            Answer.assessment_id == assessment.id,
        )
    )
    answered_count = a_result.scalar_one()

    answered_ratio = answered_count / total_questions
    required_ratio = settings.SUBMIT_COMPLETENESS_THRESHOLD

    # ── Check critical questions ───────────────────────────────────────────────
    # Get all answers for critical question codes
    crit_result = await db.execute(
        select(Question.question_code, Answer.value)
        .join(Answer, Answer.question_id == Question.id)
        .where(
            Answer.assessment_id == assessment.id,
            Question.question_code.in_(CRITICAL_QUESTION_CODES),
        )
    )
    answered_critical = {row.question_code: row.value for row in crit_result.all()}

    missing_critical = []
    for code in CRITICAL_QUESTION_CODES:
        if code not in answered_critical:
            missing_critical.append(code)
        elif code in NA_FORBIDDEN_CODES:
            val = answered_critical[code]
            if val.get("choice") == "N/A":
                missing_critical.append(f"{code}:NA_FORBIDDEN")

    # ── Gate decision ──────────────────────────────────────────────────────────
    gate_passed = (
        answered_ratio >= required_ratio
        and len(missing_critical) == 0
    )

    if not gate_passed:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "ASSESSMENT_SUBMIT_VALIDATION_FAILED",
                "message": "Assessment is incomplete",
                "details": {
                    "answered_ratio": round(answered_ratio, 4),
                    "required_ratio": required_ratio,
                    "answered_count": answered_count,
                    "total_questions": total_questions,
                    "missing_question_count": total_questions - answered_count,
                    "missing_critical_questions": missing_critical,
                },
            }
        )
