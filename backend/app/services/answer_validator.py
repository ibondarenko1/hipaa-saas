"""
Answer validation — per Validation_Rules_v1 spec
Enforces answer_type normalization rules.
"""
from datetime import date, timedelta
from fastapi import HTTPException


ALLOWED_CHOICES = {
    "yes_no": {"Yes", "No"},
    "yes_no_partial": {"Yes", "No", "Partial"},
    "yes_no_unknown": {"Yes", "No", "Unknown"},
}


def validate_answer_value(answer_type: str, value: dict) -> None:
    """
    Raises HTTPException 422 if value does not match answer_type rules.
    Per spec: Validation_Rules_v1 section 3.2
    """
    if answer_type in ALLOWED_CHOICES:
        choice = value.get("choice")
        if not choice:
            raise HTTPException(
                status_code=422,
                detail=f"answer_type '{answer_type}' requires 'choice' field"
            )
        allowed = ALLOWED_CHOICES[answer_type]
        if choice not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid choice '{choice}' for answer_type '{answer_type}'. Allowed: {sorted(allowed)}"
            )

    elif answer_type == "select":
        # options validation happens in route (needs question.options)
        if not value.get("choice"):
            raise HTTPException(status_code=422, detail="select type requires 'choice' field")

    elif answer_type == "date":
        date_str = value.get("date")
        if not date_str:
            raise HTTPException(status_code=422, detail="date type requires 'date' field (YYYY-MM-DD)")
        try:
            parsed = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date format '{date_str}'. Expected YYYY-MM-DD")
        # date cannot be more than 1 day in future (per spec)
        if parsed > date.today() + timedelta(days=1):
            raise HTTPException(status_code=422, detail="Date cannot be more than 1 day in the future")

    else:
        raise HTTPException(status_code=422, detail=f"Unknown answer_type: {answer_type}")
