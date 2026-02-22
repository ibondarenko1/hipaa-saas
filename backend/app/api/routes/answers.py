"""
Answers routes — Phase 2
PUT  /tenants/{tenant_id}/assessments/{assessment_id}/answers/{question_id}  — upsert
PATCH /tenants/{tenant_id}/assessments/{assessment_id}/answers/batch          — batch upsert
GET   /tenants/{tenant_id}/assessments/{assessment_id}/answers                — list
Per spec: Validation_Rules_v1 section 3 + API spec section 5
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Assessment, Answer, Question, TenantMember
from app.core.auth import get_current_user, get_membership
from app.models.models import User
from app.schemas.schemas import (
    UpsertAnswerRequest, BatchUpsertAnswersRequest,
    BatchUpsertAnswersResponse, AnswerDTO
)
from app.services.audit import log_event
from app.services.answer_validator import validate_answer_value

router = APIRouter(
    prefix="/tenants/{tenant_id}/assessments/{assessment_id}/answers",
    tags=["answers"],
)


async def _get_assessment_or_404(assessment_id: str, tenant_id: str, db: AsyncSession) -> Assessment:
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.tenant_id == tenant_id,
        )
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return a


def _check_editable(assessment: Assessment) -> None:
    """Per spec: answers only editable when status != completed."""
    if assessment.status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Assessment is completed. Answers are immutable."
        )


@router.get("", response_model=list[AnswerDTO])
async def list_answers(
    tenant_id: str,
    assessment_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)

    result = await db.execute(
        select(Answer).where(Answer.assessment_id == assessment_id)
        .order_by(Answer.created_at)
    )
    return [AnswerDTO.model_validate(a) for a in result.scalars().all()]


@router.put("/{question_id}", response_model=AnswerDTO)
async def upsert_answer(
    tenant_id: str,
    assessment_id: str,
    question_id: str,
    body: UpsertAnswerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    assessment = await _get_assessment_or_404(assessment_id, tenant_id, db)
    _check_editable(assessment)

    # Validate question exists and belongs to this framework
    q_result = await db.execute(
        select(Question).where(
            Question.id == question_id,
            Question.framework_id == assessment.framework_id,
        )
    )
    question = q_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found for this framework")
    if not question.is_active:
        raise HTTPException(status_code=400, detail="Question is inactive")

    # Validate value per answer_type
    value_dict = body.value.model_dump(exclude_none=True)
    validate_answer_value(question.answer_type, value_dict)

    # Validate select options
    if question.answer_type == "select" and question.options:
        choices = question.options.get("choices", [])
        if value_dict.get("choice") not in choices:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid choice. Allowed: {choices}"
            )

    # Upsert
    existing = await db.execute(
        select(Answer).where(
            Answer.assessment_id == assessment_id,
            Answer.question_id == question_id,
        )
    )
    answer = existing.scalar_one_or_none()

    if answer:
        answer.value = value_dict
        answer.updated_by_user_id = current_user.id
    else:
        answer = Answer(
            tenant_id=tenant_id,
            assessment_id=assessment_id,
            question_id=question_id,
            value=value_dict,
            updated_by_user_id=current_user.id,
        )
        db.add(answer)

    await db.flush()
    return AnswerDTO.model_validate(answer)


@router.patch("/batch", response_model=BatchUpsertAnswersResponse)
async def batch_upsert_answers(
    tenant_id: str,
    assessment_id: str,
    body: BatchUpsertAnswersRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch upsert — for UI form save.
    All items validated; fails fast on first invalid item.
    """
    assessment = await _get_assessment_or_404(assessment_id, tenant_id, db)
    _check_editable(assessment)

    if not body.answers:
        return BatchUpsertAnswersResponse(updated_count=0)

    # Load all questions for this framework at once
    q_ids = [item.question_id for item in body.answers]
    q_result = await db.execute(
        select(Question).where(
            Question.id.in_(q_ids),
            Question.framework_id == assessment.framework_id,
        )
    )
    questions_map = {q.id: q for q in q_result.scalars().all()}

    # Load existing answers
    existing_result = await db.execute(
        select(Answer).where(
            Answer.assessment_id == assessment_id,
            Answer.question_id.in_(q_ids),
        )
    )
    existing_map = {a.question_id: a for a in existing_result.scalars().all()}

    updated_count = 0
    for item in body.answers:
        question = questions_map.get(item.question_id)
        if not question:
            raise HTTPException(
                status_code=404,
                detail=f"Question '{item.question_id}' not found for this framework"
            )
        if not question.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Question '{item.question_id}' is inactive"
            )

        value_dict = item.value.model_dump(exclude_none=True)
        validate_answer_value(question.answer_type, value_dict)

        if question.answer_type == "select" and question.options:
            choices = question.options.get("choices", [])
            if value_dict.get("choice") not in choices:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid choice for question '{item.question_id}'. Allowed: {choices}"
                )

        existing = existing_map.get(item.question_id)
        if existing:
            existing.value = value_dict
            existing.updated_by_user_id = current_user.id
        else:
            new_answer = Answer(
                tenant_id=tenant_id,
                assessment_id=assessment_id,
                question_id=item.question_id,
                value=value_dict,
                updated_by_user_id=current_user.id,
            )
            db.add(new_answer)

        updated_count += 1

    await db.flush()

    await log_event(
        db, "answers_batch_upserted",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="assessment", entity_id=assessment_id,
        payload={"count": updated_count},
    )

    return BatchUpsertAnswersResponse(updated_count=updated_count)
