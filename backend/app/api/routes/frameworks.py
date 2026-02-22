from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Framework, Control, Question, ControlsetVersion
from app.core.auth import get_current_user
from app.models.models import User
from app.schemas.schemas import FrameworkDTO, ControlDTO, QuestionDTO

router = APIRouter(prefix="/frameworks", tags=["frameworks"])


@router.get("", response_model=list[FrameworkDTO])
async def list_frameworks(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Framework))
    return [FrameworkDTO.model_validate(f) for f in result.scalars().all()]


@router.get("/{framework_id}/controls", response_model=list[ControlDTO])
async def list_controls(
    framework_id: str,
    version: str = Query(default=None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Control).where(Control.framework_id == framework_id)

    if version:
        result = await db.execute(
            select(ControlsetVersion).where(
                ControlsetVersion.framework_id == framework_id,
                ControlsetVersion.version == version,
            )
        )
        csv = result.scalar_one_or_none()
        if csv:
            query = query.where(Control.controlset_version_id == csv.id)
    else:
        # Default to active version
        result = await db.execute(
            select(ControlsetVersion).where(
                ControlsetVersion.framework_id == framework_id,
                ControlsetVersion.is_active == True,
            )
        )
        csv = result.scalar_one_or_none()
        if csv:
            query = query.where(Control.controlset_version_id == csv.id)

    query = query.order_by(Control.control_code)
    result = await db.execute(query)
    return [ControlDTO.model_validate(c) for c in result.scalars().all()]


@router.get("/{framework_id}/questions", response_model=list[QuestionDTO])
async def list_questions(
    framework_id: str,
    active: bool = Query(default=True),
    control_id: str = Query(default=None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Question).where(Question.framework_id == framework_id)
    if active:
        query = query.where(Question.is_active == True)
    if control_id:
        query = query.where(Question.control_id == control_id)

    query = query.order_by(Question.question_code)
    result = await db.execute(query)
    return [QuestionDTO.model_validate(q) for q in result.scalars().all()]
