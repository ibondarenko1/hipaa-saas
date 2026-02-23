"""
Reports routes — Phase 3/4
POST /tenants/{tenant_id}/assessments/{assessment_id}/reports/packages   — create package
POST /tenants/{tenant_id}/reports/packages/{package_id}/generate          — generate files
GET  /tenants/{tenant_id}/reports/packages/{package_id}                   — get package
POST /tenants/{tenant_id}/reports/packages/{package_id}/publish           — publish (internal)
GET  /tenants/{tenant_id}/reports/packages/{package_id}/download          — ZIP download URL
GET  /tenants/{tenant_id}/reports/files/{file_id}/download-url            — single file URL

Per spec:
  - client_user sees only published packages
  - internal_user sees all statuses
  - publish = immutable
  - all downloads logged to audit_events
"""
import io
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import (
    Assessment, Tenant, ReportPackage, ReportFile,
    ControlResult, Gap, Risk, RemediationAction,
    TenantMember
)
from app.core.auth import get_current_user, get_membership, require_internal
from app.models.models import User
from app.schemas.schemas import (
    CreateReportPackageRequest, ReportPackageDTO, ReportFileDTO,
    GenerateReportPackageRequest, GenerateReportPackageResponse, ReportFileItem,
    PublishReportPackageRequest, PublishReportPackageResponse,
    DownloadUrlResponse,
)
from app.services.audit import log_event
from app.services import storage
from app.services.report_generator import generate_all_reports

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["reports"])

# File type → format mapping
REQUIRED_FILE_TYPES = {
    "executive_summary": "PDF",
    "gap_register": "XLSX",
    "risk_register": "XLSX",
    "roadmap": "XLSX",
    "evidence_checklist": "XLSX",
}

CONTENT_TYPES = {
    "PDF": "application/pdf",
    "XLSX": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

FILE_EXTENSIONS = {"PDF": "pdf", "XLSX": "xlsx", "DOCX": "docx"}


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


async def _get_package_or_404(package_id: str, tenant_id: str, db: AsyncSession) -> ReportPackage:
    result = await db.execute(
        select(ReportPackage).where(
            ReportPackage.id == package_id,
            ReportPackage.tenant_id == tenant_id,
        )
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Report package not found")
    return pkg


async def _get_tenant_or_404(tenant_id: str, db: AsyncSession) -> Tenant:
    from app.models.models import Tenant as TenantModel
    result = await db.execute(
        select(TenantModel).where(TenantModel.id == tenant_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return t


# ── Create Report Package ──────────────────────────────────────────────────────

@router.post(
    "/assessments/{assessment_id}/reports/packages",
    response_model=ReportPackageDTO,
    status_code=201,
)
async def create_report_package(
    tenant_id: str,
    assessment_id: str,
    body: CreateReportPackageRequest,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)

    assessment = await _get_assessment_or_404(assessment_id, tenant_id, db)

    # Must have engine outputs
    cr_count = await db.execute(
        select(func.count()).select_from(ControlResult).where(
            ControlResult.assessment_id == assessment_id
        )
    )
    if cr_count.scalar_one() == 0:
        raise HTTPException(
            status_code=422,
            detail="No engine results found. Run the compliance engine before creating a report package."
        )

    # Auto-increment package version
    max_ver = await db.execute(
        select(func.max(ReportPackage.package_version)).where(
            ReportPackage.assessment_id == assessment_id
        )
    )
    next_version = (max_ver.scalar_one() or 0) + 1

    pkg = ReportPackage(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        package_version=next_version,
        status="draft",
        generated_by_user_id=current_user.id,
        notes=body.notes,
    )
    db.add(pkg)
    await db.flush()

    await log_event(
        db, "report_package_created",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="report_package", entity_id=pkg.id,
        payload={"package_version": next_version, "assessment_id": assessment_id},
    )

    return ReportPackageDTO.model_validate(pkg)


# ── Generate Files ─────────────────────────────────────────────────────────────

@router.post(
    "/reports/packages/{package_id}/generate",
    response_model=GenerateReportPackageResponse,
)
async def generate_report_package(
    tenant_id: str,
    package_id: str,
    body: GenerateReportPackageRequest,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)

    pkg = await _get_package_or_404(package_id, tenant_id, db)

    if pkg.status == "published":
        raise HTTPException(
            status_code=409,
            detail="Cannot regenerate a published report package. Create a new package instead."
        )

    assessment = await _get_assessment_or_404(pkg.assessment_id, tenant_id, db)
    tenant = await _get_tenant_or_404(tenant_id, db)

    await log_event(
        db, "report_generation_started",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="report_package", entity_id=package_id,
        payload={"include_ai": body.include_ai_summary, "ai_tone": body.ai_tone},
    )

    try:
        # Delete existing files for this package (re-generate)
        existing_files = await db.execute(
            select(ReportFile).where(ReportFile.package_id == package_id)
        )
        for f in existing_files.scalars().all():
            storage.delete_object(f.storage_key)
            await db.delete(f)
        await db.flush()

        # Generate all artifacts
        report_bytes = await generate_all_reports(
            assessment=assessment,
            tenant=tenant,
            db=db,
            include_ai=body.include_ai_summary,
            ai_tone=body.ai_tone or "neutral",
        )

        now = datetime.now(timezone.utc)
        file_records = []

        for file_type, data in report_bytes.items():
            fmt = REQUIRED_FILE_TYPES.get(file_type, "XLSX")
            ext = FILE_EXTENSIONS[fmt]
            content_type = CONTENT_TYPES[fmt]
            file_name = f"{file_type}_{assessment.id[:8]}.{ext}"
            storage_key = storage.generate_report_key(
                tenant_id, pkg.assessment_id, file_type, fmt
            )

            # Upload to MinIO
            storage.upload_bytes(storage_key, data, content_type)

            rf = ReportFile(
                package_id=package_id,
                tenant_id=tenant_id,
                file_type=file_type,
                format=fmt,
                storage_key=storage_key,
                file_name=file_name,
                size_bytes=len(data),
            )
            db.add(rf)
            await db.flush()

            file_records.append(ReportFileItem(
                id=rf.id,
                file_type=file_type,
                format=fmt,
                file_name=file_name,
                size_bytes=len(data),
            ))

        # Validate required files present (per spec: Validation_Rules_v1 section 7.2)
        generated_types = {r.file_type for r in file_records}
        required_types = set(REQUIRED_FILE_TYPES.keys())
        missing = required_types - generated_types
        if missing:
            raise ValueError(f"Required file types not generated: {missing}")

        # Transition to generated
        pkg.status = "generated"
        pkg.updated_at = now

        await log_event(
            db, "report_generation_completed",
            tenant_id=tenant_id, user_id=current_user.id,
            entity_type="report_package", entity_id=package_id,
            payload={"file_count": len(file_records)},
        )

        return GenerateReportPackageResponse(
            report_package_id=package_id,
            status="generated",
            generated_at=now,
            files=file_records,
        )

    except Exception as e:
        await log_event(
            db, "report_generation_failed",
            tenant_id=tenant_id, user_id=current_user.id,
            entity_type="report_package", entity_id=package_id,
            payload={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")


# ── List Packages ──────────────────────────────────────────────────────────────

@router.get("/reports/packages", response_model=list[ReportPackageDTO])
async def list_report_packages(
    tenant_id: str,
    assessment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    q = select(ReportPackage).where(ReportPackage.tenant_id == tenant_id)
    if assessment_id:
        q = q.where(ReportPackage.assessment_id == assessment_id)
    if status:
        q = q.where(ReportPackage.status == status)
    if membership.role == "client_user":
        q = q.where(ReportPackage.status == "published")
    q = q.order_by(ReportPackage.package_version.desc())
    result = await db.execute(q)
    return [ReportPackageDTO.model_validate(p) for p in result.scalars().all()]


# ── Get Package ────────────────────────────────────────────────────────────────

@router.get("/reports/packages/{package_id}", response_model=ReportPackageDTO)
async def get_report_package(
    tenant_id: str,
    package_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    pkg = await _get_package_or_404(package_id, tenant_id, db)

    # client_user can only see published packages
    if membership.role == "client_user" and pkg.status != "published":
        raise HTTPException(status_code=404, detail="Report package not found")

    return ReportPackageDTO.model_validate(pkg)


# ── List files in package ─────────────────────────────────────────────────────

@router.get("/reports/packages/{package_id}/files", response_model=list[ReportFileDTO])
async def list_report_package_files(
    tenant_id: str,
    package_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    pkg = await _get_package_or_404(package_id, tenant_id, db)
    if membership.role == "client_user" and pkg.status != "published":
        raise HTTPException(status_code=404, detail="Report package not found")
    result = await db.execute(
        select(ReportFile).where(ReportFile.package_id == package_id).order_by(ReportFile.file_type)
    )
    return [ReportFileDTO.model_validate(f) for f in result.scalars().all()]


# ── Publish ────────────────────────────────────────────────────────────────────

@router.post(
    "/reports/packages/{package_id}/publish",
    response_model=PublishReportPackageResponse,
)
async def publish_report_package(
    tenant_id: str,
    package_id: str,
    body: PublishReportPackageRequest,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    require_internal(membership)

    pkg = await _get_package_or_404(package_id, tenant_id, db)

    if pkg.status == "published":
        raise HTTPException(status_code=409, detail="Package is already published.")

    if pkg.status != "generated":
        raise HTTPException(
            status_code=409,
            detail=f"Package must be in 'generated' status to publish. Current: '{pkg.status}'"
        )

    # Validate all required files exist
    files_result = await db.execute(
        select(ReportFile).where(ReportFile.package_id == package_id)
    )
    files = files_result.scalars().all()
    present_types = {f.file_type for f in files}
    missing = set(REQUIRED_FILE_TYPES.keys()) - present_types
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot publish: missing required files: {missing}"
        )

    now = datetime.now(timezone.utc)
    pkg.status = "published"
    pkg.published_at = now
    pkg.updated_at = now

    await log_event(
        db, "report_package_published",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="report_package", entity_id=package_id,
        payload={"publish_note": body.publish_note, "package_version": pkg.package_version},
    )

    return PublishReportPackageResponse(
        report_package_id=package_id,
        status="published",
        published_at=now,
    )


# ── Download Package (ZIP) ─────────────────────────────────────────────────────

@router.get(
    "/reports/packages/{package_id}/download",
    response_model=DownloadUrlResponse,
)
async def download_report_package(
    tenant_id: str,
    package_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    pkg = await _get_package_or_404(package_id, tenant_id, db)

    if membership.role == "client_user" and pkg.status != "published":
        raise HTTPException(status_code=403, detail="Only published packages can be downloaded.")

    # For v1: return presigned URL to the first file (executive summary) or a pre-built zip.
    # True ZIP streaming requires a separate job/endpoint; v1 returns executive summary URL.
    # TODO v2: generate ZIP in background, store in MinIO, return signed URL.
    files_result = await db.execute(
        select(ReportFile).where(
            ReportFile.package_id == package_id,
            ReportFile.file_type == "executive_summary",
        )
    )
    exec_file = files_result.scalar_one_or_none()
    if not exec_file:
        raise HTTPException(status_code=404, detail="No files found in this package.")

    # Build in-memory ZIP from all package files
    files_all = await db.execute(
        select(ReportFile).where(ReportFile.package_id == package_id)
    )
    all_files = files_all.scalars().all()

    zip_key = storage.generate_report_key(
        tenant_id, pkg.assessment_id, f"package_v{pkg.package_version}_bundle", "ZIP"
    ).replace(".zip", ".zip")

    # Generate presigned download for executive summary as primary download
    download_url = storage.create_presigned_download_url(
        exec_file.storage_key,
        file_name=exec_file.file_name,
    )
    expires_at = storage.get_presign_expiry_datetime()

    await log_event(
        db, "report_package_downloaded",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="report_package", entity_id=package_id,
        payload={"package_version": pkg.package_version, "assessment_id": pkg.assessment_id},
    )

    return DownloadUrlResponse(download_url=download_url, expires_at=expires_at)


# ── Download Single File ───────────────────────────────────────────────────────

@router.get(
    "/reports/files/{file_id}/download-url",
    response_model=DownloadUrlResponse,
)
async def download_report_file(
    tenant_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    file_result = await db.execute(
        select(ReportFile).where(
            ReportFile.id == file_id,
            ReportFile.tenant_id == tenant_id,
        )
    )
    report_file = file_result.scalar_one_or_none()
    if not report_file:
        raise HTTPException(status_code=404, detail="Report file not found")

    # Check package published if client
    pkg_result = await db.execute(
        select(ReportPackage).where(ReportPackage.id == report_file.package_id)
    )
    pkg = pkg_result.scalar_one_or_none()
    if membership.role == "client_user" and (not pkg or pkg.status != "published"):
        raise HTTPException(status_code=403, detail="Only files from published packages can be downloaded.")

    download_url = storage.create_presigned_download_url(
        report_file.storage_key,
        file_name=report_file.file_name,
    )
    expires_at = storage.get_presign_expiry_datetime()

    await log_event(
        db, "report_file_downloaded",
        tenant_id=tenant_id, user_id=current_user.id,
        entity_type="report_file", entity_id=file_id,
        payload={
            "file_type": report_file.file_type,
            "format": report_file.format,
            "assessment_id": pkg.assessment_id if pkg else None,
        },
    )

    return DownloadUrlResponse(download_url=download_url, expires_at=expires_at)
