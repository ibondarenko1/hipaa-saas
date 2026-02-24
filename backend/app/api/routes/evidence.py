"""
Evidence routes — Phase 2
POST /tenants/{tenant_id}/evidence/upload-url     — presigned PUT URL
POST /tenants/{tenant_id}/evidence                 — register file in DB
GET  /tenants/{tenant_id}/evidence                 — list files
GET  /tenants/{tenant_id}/evidence/{id}/download-url — presigned GET URL
POST /tenants/{tenant_id}/assessments/{id}/evidence-links — link file to assessment
GET  /tenants/{tenant_id}/assessments/{id}/evidence-links — list links

Per spec: API_Endpoints_v1 section 6, Validation_Rules_v1 section 4
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import (
    Assessment, EvidenceFile, EvidenceLink,
    Control, Question, TenantMember
)
from app.core.auth import get_current_user, get_membership
from app.models.models import User
from app.schemas.schemas import (
    CreateUploadUrlRequest, CreateUploadUrlResponse,
    RegisterEvidenceFileRequest, EvidenceFileDTO,
    UpdateEvidenceRequest,
    CreateEvidenceLinkRequest, EvidenceLinkDTO,
    DownloadUrlResponse,
)
from app.services.audit import log_event
from app.services import storage
from app.core.config import settings

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["evidence"])


# ── Validation helpers ─────────────────────────────────────────────────────────

def _validate_content_type(content_type: str) -> None:
    if content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Content type '{content_type}' is not allowed. "
                   f"Allowed: {settings.ALLOWED_CONTENT_TYPES}"
        )


def _validate_size(size_bytes: int) -> None:
    if size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File size {size_bytes} bytes exceeds limit of {max_mb} MB"
        )


def _validate_tags(tags: list[str] | None) -> None:
    if tags:
        if len(tags) > 20:
            raise HTTPException(status_code=400, detail="Max 20 tags allowed")
        for tag in tags:
            if len(tag) > 50:
                raise HTTPException(status_code=400, detail=f"Tag '{tag}' exceeds 50 characters")


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


# ── Upload URL ────────────────────────────────────────────────────────────────

@router.post("/evidence/upload-url", response_model=CreateUploadUrlResponse)
async def create_upload_url(
    tenant_id: str,
    body: CreateUploadUrlRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a presigned PUT URL for direct client → MinIO upload.
    Client uploads to this URL, then calls POST /evidence to register.
    """
    _validate_content_type(body.content_type)
    _validate_size(body.size_bytes)

    storage_key = storage.generate_storage_key(tenant_id, body.file_name)
    upload_url = storage.create_presigned_upload_url(storage_key, body.content_type)
    expires_at = storage.get_presign_expiry_datetime()

    return CreateUploadUrlResponse(
        upload_url=upload_url,
        storage_key=storage_key,
        expires_at=expires_at,
    )


# ── Register evidence file ─────────────────────────────────────────────────────

@router.post("/evidence", response_model=EvidenceFileDTO, status_code=201)
async def register_evidence_file(
    tenant_id: str,
    body: RegisterEvidenceFileRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a file that was already uploaded to object storage.
    Called after successful PUT to the presigned URL.
    """
    _validate_content_type(body.content_type)
    _validate_size(body.size_bytes)
    _validate_tags(body.tags)

    if not body.file_name or not body.file_name.strip():
        raise HTTPException(status_code=400, detail="file_name cannot be empty")

    if not body.storage_key or not body.storage_key.strip():
        raise HTTPException(status_code=400, detail="storage_key cannot be empty")

    # storage_key must be scoped to this tenant (basic integrity check)
    if not body.storage_key.startswith(f"evidence/{tenant_id}/"):
        raise HTTPException(
            status_code=400,
            detail="storage_key does not belong to this tenant"
        )

    evidence = EvidenceFile(
        tenant_id=tenant_id,
        uploaded_by_user_id=current_user.id,
        file_name=body.file_name.strip(),
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        storage_key=body.storage_key,
        tags=body.tags or [],
    )
    db.add(evidence)
    await db.flush()

    await log_event(
        db, "evidence_uploaded",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="evidence_file", entity_id=evidence.id,
        payload={"file_name": body.file_name, "size_bytes": body.size_bytes},
        ip_address=request.client.host if request.client else None,
    )

    return EvidenceFileDTO.model_validate(evidence)


# ── List evidence files ────────────────────────────────────────────────────────

@router.get("/evidence", response_model=list[EvidenceFileDTO])
async def list_evidence_files(
    tenant_id: str,
    tag: str = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    query = select(EvidenceFile).where(EvidenceFile.tenant_id == tenant_id)

    if tag:
        # JSONB contains check for tag
        query = query.where(EvidenceFile.tags.contains([tag]))

    query = query.order_by(EvidenceFile.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return [EvidenceFileDTO.model_validate(f) for f in result.scalars().all()]


# ── Download URL ───────────────────────────────────────────────────────────────

@router.get("/evidence/{evidence_file_id}/download-url", response_model=DownloadUrlResponse)
async def get_evidence_download_url(
    tenant_id: str,
    evidence_file_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EvidenceFile).where(
            EvidenceFile.id == evidence_file_id,
            EvidenceFile.tenant_id == tenant_id,
        )
    )
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence file not found")

    download_url = storage.create_presigned_download_url(
        evidence.storage_key,
        file_name=evidence.file_name,
    )
    expires_at = storage.get_presign_expiry_datetime()

    await log_event(
        db, "evidence_file_downloaded",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="evidence_file", entity_id=evidence_file_id,
        payload={"file_name": evidence.file_name},
        ip_address=request.client.host if request.client else None,
    )

    return DownloadUrlResponse(download_url=download_url, expires_at=expires_at)


# ── Update evidence (admin comment / status) ───────────────────────────────────

@router.patch("/evidence/{evidence_file_id}", response_model=EvidenceFileDTO)
async def update_evidence_file(
    tenant_id: str,
    evidence_file_id: str,
    body: UpdateEvidenceRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EvidenceFile).where(
            EvidenceFile.id == evidence_file_id,
            EvidenceFile.tenant_id == tenant_id,
        )
    )
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence file not found")
    if body.admin_comment is not None:
        evidence.admin_comment = body.admin_comment
    if body.status is not None:
        evidence.status_updated_by = (current_user.email or str(current_user.id))
        if body.status == "accepted":
            evidence.admin_comment = None
    await db.flush()
    await log_event(
        db, "evidence_updated",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="evidence_file", entity_id=evidence_file_id,
        payload={"admin_comment": body.admin_comment is not None, "status": body.status},
        ip_address=request.client.host if request.client else None,
    )
    return EvidenceFileDTO.model_validate(evidence)


# ── Delete evidence ───────────────────────────────────────────────────────────

@router.delete("/evidence/{evidence_file_id}", status_code=204)
async def delete_evidence_file(
    tenant_id: str,
    evidence_file_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EvidenceFile).where(
            EvidenceFile.id == evidence_file_id,
            EvidenceFile.tenant_id == tenant_id,
        )
    )
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence file not found")
    file_name = evidence.file_name
    storage_key = evidence.storage_key
    await db.delete(evidence)
    await db.flush()
    storage.delete_object(storage_key)
    await log_event(
        db, "evidence_deleted",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="evidence_file", entity_id=evidence_file_id,
        payload={"file_name": file_name},
        ip_address=request.client.host if request.client else None,
    )


# ── Evidence Links ─────────────────────────────────────────────────────────────

@router.post(
    "/assessments/{assessment_id}/evidence-links",
    response_model=EvidenceLinkDTO,
    status_code=201,
)
async def create_evidence_link(
    tenant_id: str,
    assessment_id: str,
    body: CreateEvidenceLinkRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Link an uploaded evidence file to an assessment.
    Optionally link to a specific control and/or question.
    Per spec: Validation_Rules_v1 section 4.3
    """
    assessment = await _get_assessment_or_404(assessment_id, tenant_id, db)

    # Lock: cannot link to completed assessment
    if assessment.status == "completed":
        raise HTTPException(
            status_code=409,
            detail="Cannot link evidence to a completed assessment"
        )

    # Validate evidence file belongs to tenant
    ef_result = await db.execute(
        select(EvidenceFile).where(
            EvidenceFile.id == body.evidence_file_id,
            EvidenceFile.tenant_id == tenant_id,
        )
    )
    evidence_file = ef_result.scalar_one_or_none()
    if not evidence_file:
        raise HTTPException(status_code=404, detail="Evidence file not found in this tenant")

    # Validate optional control_id
    if body.control_id:
        ctrl_result = await db.execute(
            select(Control).where(Control.id == body.control_id)
        )
        if not ctrl_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Control not found")

    # Validate optional question_id
    if body.question_id:
        q_result = await db.execute(
            select(Question).where(Question.id == body.question_id)
        )
        if not q_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Question not found")

    link = EvidenceLink(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        evidence_file_id=body.evidence_file_id,
        control_id=body.control_id,
        question_id=body.question_id,
        note=body.note,
    )
    db.add(link)
    await db.flush()

    await log_event(
        db, "evidence_linked",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="evidence_link", entity_id=link.id,
        payload={
            "evidence_file_id": body.evidence_file_id,
            "control_id": body.control_id,
            "question_id": body.question_id,
            "assessment_id": assessment_id,
        },
        ip_address=request.client.host if request.client else None,
    )

    return EvidenceLinkDTO.model_validate(link)


@router.get(
    "/assessments/{assessment_id}/evidence-links",
    response_model=list[EvidenceLinkDTO],
)
async def list_evidence_links(
    tenant_id: str,
    assessment_id: str,
    control_id: str = Query(default=None),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_assessment_or_404(assessment_id, tenant_id, db)

    query = (
        select(EvidenceLink, Control.hipaa_control_id)
        .outerjoin(Control, Control.id == EvidenceLink.control_id)
        .where(
            EvidenceLink.assessment_id == assessment_id,
            EvidenceLink.tenant_id == tenant_id,
        )
    )
    if control_id:
        query = query.where(EvidenceLink.control_id == control_id)

    query = query.order_by(EvidenceLink.created_at.desc())
    result = await db.execute(query)
    out = []
    for link, hipaa_id in result.all():
        dto = EvidenceLinkDTO.model_validate(link)
        dto.hipaa_control_id = hipaa_id
        out.append(dto)
    return out
