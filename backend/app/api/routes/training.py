"""
Training API — modules, assignments, complete (score + certificate to MinIO), certificate download.
GET  /api/v1/tenants/{id}/training/modules
POST /api/v1/tenants/{id}/training/modules
GET  /api/v1/tenants/{id}/training/assignments
POST /api/v1/tenants/{id}/training/assignments
POST /api/v1/tenants/{id}/training/assignments/{id}/complete
GET  /api/v1/tenants/{id}/training/assignments/{id}/certificate
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Tenant, User, TenantMember
from app.models.training import TrainingModule, TrainingAssignment, TrainingQuestion, TrainingCompletion
from app.core.auth import get_current_user, get_membership
from app.schemas.schemas import (
    CreateTrainingModuleRequest, TrainingModuleDTO,
    TrainingQuestionDTO,
    CreateTrainingAssignmentRequest, TrainingAssignmentDTO,
    CompleteAssignmentRequest, CertificateResponse,
    DownloadUrlResponse,
)
from app.services.certificate_generator import generate_certificate_pdf
from app.services import storage

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["training"])


async def _get_tenant(tenant_id: str, db: AsyncSession):
    r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return t


async def _get_module(module_id: str, tenant_id: str, db: AsyncSession) -> TrainingModule:
    r = await db.execute(
        select(TrainingModule)
        .where(TrainingModule.id == module_id, TrainingModule.tenant_id == tenant_id)
    )
    m = r.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Training module not found")
    return m


async def _get_assignment(assignment_id: str, tenant_id: str, db: AsyncSession) -> TrainingAssignment:
    r = await db.execute(
        select(TrainingAssignment)
        .where(TrainingAssignment.id == assignment_id, TrainingAssignment.tenant_id == tenant_id)
        .options(selectinload(TrainingAssignment.module))
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


@router.get("/training/modules", response_model=list[TrainingModuleDTO])
async def list_modules(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    result = await db.execute(
        select(TrainingModule)
        .where(TrainingModule.tenant_id == tenant_id)
        .order_by(TrainingModule.sort_order, TrainingModule.created_at)
    )
    return [TrainingModuleDTO.model_validate(m) for m in result.scalars().all()]


@router.post("/training/modules", response_model=TrainingModuleDTO, status_code=201)
async def create_module(
    tenant_id: str,
    body: CreateTrainingModuleRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    mod = TrainingModule(
        tenant_id=tenant_id,
        title=body.title,
        description=body.description,
        sort_order=body.sort_order or 0,
    )
    db.add(mod)
    await db.flush()
    return TrainingModuleDTO.model_validate(mod)


@router.get("/training/modules/{module_id}/questions", response_model=list[TrainingQuestionDTO])
async def list_module_questions(
    tenant_id: str,
    module_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_module(module_id, tenant_id, db)
    result = await db.execute(
        select(TrainingQuestion)
        .where(TrainingQuestion.training_module_id == module_id)
        .order_by(TrainingQuestion.sort_order, TrainingQuestion.created_at)
    )
    return [TrainingQuestionDTO.model_validate(q) for q in result.scalars().all()]


@router.get("/training/assignments", response_model=list[TrainingAssignmentDTO])
async def list_assignments(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    result = await db.execute(
        select(TrainingAssignment)
        .where(TrainingAssignment.tenant_id == tenant_id)
        .order_by(TrainingAssignment.assigned_at.desc())
    )
    return [TrainingAssignmentDTO.model_validate(a) for a in result.scalars().all()]


@router.post("/training/assignments", response_model=TrainingAssignmentDTO, status_code=201)
async def create_assignment(
    tenant_id: str,
    body: CreateTrainingAssignmentRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    await _get_module(body.training_module_id, tenant_id, db)
    assignment = TrainingAssignment(
        tenant_id=tenant_id,
        user_id=body.user_id,
        training_module_id=body.training_module_id,
        due_at=body.due_at,
    )
    db.add(assignment)
    await db.flush()
    return TrainingAssignmentDTO.model_validate(assignment)


@router.post("/training/assignments/{assignment_id}/complete", response_model=TrainingAssignmentDTO)
async def complete_assignment(
    tenant_id: str,
    assignment_id: str,
    body: CompleteAssignmentRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    assignment = await _get_assignment(assignment_id, tenant_id, db)
    if assignment.completed_at:
        raise HTTPException(status_code=400, detail="Assignment already completed")

    score = max(0, min(100, body.score_percent))
    assignment.score_percent = score
    assignment.completed_at = datetime.now(timezone.utc)

    # User name for certificate
    user_result = await db.execute(select(User).where(User.id == assignment.user_id))
    user = user_result.scalar_one_or_none()
    user_name = (user.full_name or user.email) if user else "Participant"

    pdf_bytes = generate_certificate_pdf(
        module_title=assignment.module.title,
        user_name=user_name,
        completed_at=assignment.completed_at,
        score_percent=score,
    )
    storage_key = storage.generate_certificate_key(tenant_id, assignment.id)
    storage.upload_bytes(storage_key, pdf_bytes, "application/pdf")
    assignment.certificate_storage_key = storage_key
    await db.flush()
    return TrainingAssignmentDTO.model_validate(assignment)


@router.get("/training/assignments/{assignment_id}/certificate", response_model=CertificateResponse)
async def get_certificate_url(
    tenant_id: str,
    assignment_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    assignment = await _get_assignment(assignment_id, tenant_id, db)
    if not assignment.certificate_storage_key:
        raise HTTPException(status_code=404, detail="Certificate not generated")
    url = storage.create_presigned_download_url(
        assignment.certificate_storage_key,
        file_name=f"certificate_{assignment_id}.pdf",
    )
    expires_at = storage.get_presign_expiry_datetime()
    return CertificateResponse(download_url=url, expires_at=expires_at)
