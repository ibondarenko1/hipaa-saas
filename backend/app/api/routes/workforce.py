"""
Workforce Compliance API — employees, CSV import/export, employee training assignments,
completion (certificate + EvidenceFile), certificates list/verify/download, stats.
"""
import csv
import hashlib
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Request
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Tenant, User, TenantMember, EvidenceFile
from app.models.training import TrainingModule
from app.models.workforce import Employee, EmployeeTrainingAssignment, TrainingCertificate, WorkforceImportLog
from app.core.auth import get_membership
from app.schemas.schemas import (
    CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeDTO,
    CreateEmployeeAssignmentRequest, EmployeeAssignmentDTO,
    CompleteEmployeeAssignmentRequest, TrainingCertificateDTO,
    CertificateVerifyResponse, WorkforceStatsDTO, WorkforceImportResultDTO,
    CertificateResponse,
)
from app.services.certificate_generator import generate_workforce_certificate_pdf
from app.services import storage

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["workforce"])

CERT_NUMBER_PREFIX = "WF-"
HIPAA_PR_06 = "HIPAA-PR-06"


async def _get_tenant(tenant_id: str, db: AsyncSession) -> Tenant:
    r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return t


async def _get_employee(employee_id: str, tenant_id: str, db: AsyncSession) -> Employee:
    r = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.tenant_id == tenant_id)
    )
    e = r.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return e


async def _get_assignment(assignment_id: str, tenant_id: str, db: AsyncSession) -> EmployeeTrainingAssignment:
    r = await db.execute(
        select(EmployeeTrainingAssignment)
        .where(
            EmployeeTrainingAssignment.id == assignment_id,
            EmployeeTrainingAssignment.tenant_id == tenant_id,
        )
        .options(
            selectinload(EmployeeTrainingAssignment.employee),
            selectinload(EmployeeTrainingAssignment.module),
        )
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


def _make_content_hash(employee_name: str, org_name: str, module_title: str, score: int, completed_at: datetime, cert_number: str) -> str:
    content = f"{employee_name}{org_name}{module_title}{score}{completed_at.isoformat()}{cert_number}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _gen_certificate_number() -> str:
    return f"{CERT_NUMBER_PREFIX}{uuid.uuid4().hex[:12].upper()}"


# ── Employees ─────────────────────────────────────────────────────────────────

@router.get("/workforce/employees", response_model=list[EmployeeDTO])
async def list_employees(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    r = await db.execute(
        select(Employee).where(Employee.tenant_id == tenant_id).order_by(Employee.last_name, Employee.first_name)
    )
    return [EmployeeDTO.model_validate(e) for e in r.scalars().all()]


@router.post("/workforce/employees", response_model=EmployeeDTO, status_code=201)
async def create_employee(
    tenant_id: str,
    body: CreateEmployeeRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    existing = await db.execute(
        select(Employee).where(Employee.tenant_id == tenant_id, Employee.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Employee with this email already exists")
    emp = Employee(
        tenant_id=tenant_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        department=body.department,
        role_title=body.role_title,
    )
    db.add(emp)
    await db.flush()
    return EmployeeDTO.model_validate(emp)


@router.get("/workforce/employees/{employee_id}", response_model=EmployeeDTO)
async def get_employee(
    tenant_id: str,
    employee_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    emp = await _get_employee(employee_id, tenant_id, db)
    return EmployeeDTO.model_validate(emp)


@router.put("/workforce/employees/{employee_id}", response_model=EmployeeDTO)
async def update_employee(
    tenant_id: str,
    employee_id: str,
    body: UpdateEmployeeRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    emp = await _get_employee(employee_id, tenant_id, db)
    if body.first_name is not None:
        emp.first_name = body.first_name
    if body.last_name is not None:
        emp.last_name = body.last_name
    if body.email is not None:
        emp.email = body.email
    if body.department is not None:
        emp.department = body.department
    if body.role_title is not None:
        emp.role_title = body.role_title
    if body.is_active is not None:
        emp.is_active = body.is_active
    await db.flush()
    return EmployeeDTO.model_validate(emp)


@router.delete("/workforce/employees/{employee_id}", status_code=204)
async def delete_employee(
    tenant_id: str,
    employee_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    emp = await _get_employee(employee_id, tenant_id, db)
    await db.delete(emp)
    await db.flush()


# ── CSV import / export / template ─────────────────────────────────────────────

CSV_TEMPLATE_HEADERS = ["email", "first_name", "last_name", "department", "role_title"]


@router.get("/workforce/csv-template", response_class=PlainTextResponse)
async def get_csv_template(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_TEMPLATE_HEADERS)
    w.writerow(["john.doe@example.com", "John", "Doe", "IT", "Developer"])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=workforce_template.csv"})


@router.post("/workforce/import-csv", response_model=WorkforceImportResultDTO)
async def import_csv(
    tenant_id: str,
    file: UploadFile,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or set(reader.fieldnames) < set(CSV_TEMPLATE_HEADERS):
        raise HTTPException(status_code=400, detail="CSV must include columns: email, first_name, last_name, department, role_title")
    created = updated = skipped = 0
    errors: list[dict] = []
    for i, row in enumerate(reader):
        row_num = i + 2
        email = (row.get("email") or "").strip()
        first_name = (row.get("first_name") or "").strip()
        last_name = (row.get("last_name") or "").strip()
        if not email or not first_name or not last_name:
            skipped += 1
            errors.append({"row": row_num, "error": "Missing email, first_name, or last_name"})
            continue
        existing = await db.execute(
            select(Employee).where(Employee.tenant_id == tenant_id, Employee.email == email)
        )
        emp = existing.scalar_one_or_none()
        if emp:
            emp.first_name = first_name
            emp.last_name = last_name
            emp.department = (row.get("department") or "").strip() or None
            emp.role_title = (row.get("role_title") or "").strip() or None
            updated += 1
        else:
            emp = Employee(
                tenant_id=tenant_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                department=(row.get("department") or "").strip() or None,
                role_title=(row.get("role_title") or "").strip() or None,
            )
            db.add(emp)
            created += 1
    await db.flush()
    log = WorkforceImportLog(
        tenant_id=tenant_id,
        imported_by=membership.user_id,
        filename=file.filename,
        total_rows=created + updated + skipped,
        created_count=created,
        updated_count=updated,
        skipped_count=skipped,
        errors=errors if errors else None,
    )
    db.add(log)
    await db.commit()
    return WorkforceImportResultDTO(
        total_rows=created + updated + skipped,
        created_count=created,
        updated_count=updated,
        skipped_count=skipped,
        errors={"rows": errors} if errors else None,
    )


@router.get("/workforce/export-csv", response_class=StreamingResponse)
async def export_csv(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    r = await db.execute(
        select(Employee).where(Employee.tenant_id == tenant_id).order_by(Employee.last_name, Employee.first_name)
    )
    employees = r.scalars().all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(CSV_TEMPLATE_HEADERS)
    for e in employees:
        w.writerow([e.email, e.first_name, e.last_name, e.department or "", e.role_title or ""])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=workforce_export.csv"},
    )


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/workforce/assignments", response_model=list[EmployeeAssignmentDTO])
async def list_assignments(
    tenant_id: str,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    q = select(EmployeeTrainingAssignment).where(EmployeeTrainingAssignment.tenant_id == tenant_id)
    if employee_id:
        q = q.where(EmployeeTrainingAssignment.employee_id == employee_id)
    if status:
        q = q.where(EmployeeTrainingAssignment.status == status)
    q = q.order_by(EmployeeTrainingAssignment.assigned_at.desc())
    r = await db.execute(q)
    return [EmployeeAssignmentDTO.model_validate(a) for a in r.scalars().all()]


@router.post("/workforce/assignments", response_model=EmployeeAssignmentDTO, status_code=201)
async def create_assignment(
    tenant_id: str,
    body: CreateEmployeeAssignmentRequest,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    await _get_employee(body.employee_id, tenant_id, db)
    mod = await db.execute(
        select(TrainingModule).where(
            TrainingModule.id == body.training_module_id,
            TrainingModule.tenant_id == tenant_id,
        )
    )
    module = mod.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Training module not found")
    assignment = EmployeeTrainingAssignment(
        tenant_id=tenant_id,
        employee_id=body.employee_id,
        training_module_id=body.training_module_id,
        assigned_by=membership.user_id,
        due_at=body.due_at,
    )
    db.add(assignment)
    await db.flush()
    return EmployeeAssignmentDTO.model_validate(assignment)


@router.post("/workforce/assignments/{assignment_id}/send-invite")
async def send_invite(
    tenant_id: str,
    assignment_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    a = await _get_assignment(assignment_id, tenant_id, db)
    a.invite_sent_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "message": "Invite sent (logged)"}


@router.post("/workforce/assignments/{assignment_id}/complete", response_model=EmployeeAssignmentDTO)
async def complete_assignment(
    tenant_id: str,
    assignment_id: str,
    body: CompleteEmployeeAssignmentRequest,
    request: Request,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _get_tenant(tenant_id, db)
    a = await _get_assignment(assignment_id, tenant_id, db)
    if a.completed_at:
        raise HTTPException(status_code=400, detail="Assignment already completed")
    employee = a.employee
    module = a.module
    completed_at = datetime.now(timezone.utc)
    score = max(0, min(100, body.score_percent))
    cert_number = _gen_certificate_number()
    content_hash = _make_content_hash(
        employee.full_name, tenant.name, module.title, score, completed_at, cert_number
    )

    pdf_bytes = generate_workforce_certificate_pdf(
        organization_name=tenant.name,
        employee_name=employee.full_name,
        module_title=module.title,
        completed_at=completed_at,
        score_percent=score,
        certificate_number=cert_number,
        content_hash=content_hash,
        module_version=getattr(module, "version", None),
    )
    storage_key = storage.generate_certificate_key(tenant_id, a.id)
    storage.upload_bytes(storage_key, pdf_bytes, "application/pdf")

    cert = TrainingCertificate(
        tenant_id=tenant_id,
        employee_id=employee.id,
        assignment_id=a.id,
        module_id=module.id,
        certificate_number=cert_number,
        employee_name=employee.full_name,
        organization_name=tenant.name,
        module_title=module.title,
        module_version=getattr(module, "version", None),
        score_percent=score,
        completed_at=completed_at,
        content_hash=content_hash,
        storage_key=storage_key,
        ip_address=body.ip_address or request.client.host if request.client else None,
        user_agent=body.user_agent or (request.headers.get("user-agent") if request else None),
    )
    db.add(cert)
    await db.flush()

    uploaded_by = a.assigned_by or membership.user_id
    evidence_file = EvidenceFile(
        tenant_id=tenant_id,
        uploaded_by_user_id=uploaded_by,
        file_name=f"workforce_cert_{cert_number}.pdf",
        content_type="application/pdf",
        size_bytes=len(pdf_bytes),
        storage_key=storage_key,
        tags=["workforce-certificate", HIPAA_PR_06],
    )
    db.add(evidence_file)
    await db.flush()
    cert.evidence_file_id = evidence_file.id

    a.status = "completed"
    a.completed_at = completed_at
    a.score_percent = score
    a.certificate_id = cert.id
    await db.commit()
    await db.refresh(a)
    return EmployeeAssignmentDTO.model_validate(a)


# ── Certificates ──────────────────────────────────────────────────────────────

@router.get("/workforce/certificates", response_model=list[TrainingCertificateDTO])
async def list_certificates(
    tenant_id: str,
    employee_id: Optional[str] = None,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    q = select(TrainingCertificate).where(TrainingCertificate.tenant_id == tenant_id)
    if employee_id:
        q = q.where(TrainingCertificate.employee_id == employee_id)
    q = q.order_by(TrainingCertificate.completed_at.desc())
    r = await db.execute(q)
    return [TrainingCertificateDTO.model_validate(c) for c in r.scalars().all()]


@router.get("/workforce/certificates/verify", response_model=CertificateVerifyResponse)
async def verify_certificate(
    tenant_id: str,
    number: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    r = await db.execute(
        select(TrainingCertificate).where(
            TrainingCertificate.tenant_id == tenant_id,
            TrainingCertificate.certificate_number == number.strip(),
        )
    )
    cert = r.scalar_one_or_none()
    if not cert:
        return CertificateVerifyResponse(valid=False, message="Certificate not found")
    expected = _make_content_hash(
        cert.employee_name, cert.organization_name, cert.module_title,
        cert.score_percent, cert.completed_at, cert.certificate_number,
    )
    if expected != cert.content_hash:
        return CertificateVerifyResponse(valid=False, message="Certificate integrity check failed")
    return CertificateVerifyResponse(valid=True, certificate=TrainingCertificateDTO.model_validate(cert))


@router.get("/workforce/certificates/{certificate_id}/download", response_model=CertificateResponse)
async def download_certificate(
    tenant_id: str,
    certificate_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    r = await db.execute(
        select(TrainingCertificate).where(
            TrainingCertificate.id == certificate_id,
            TrainingCertificate.tenant_id == tenant_id,
        )
    )
    cert = r.scalar_one_or_none()
    if not cert or not cert.storage_key:
        raise HTTPException(status_code=404, detail="Certificate not found")
    url = storage.create_presigned_download_url(
        cert.storage_key,
        file_name=f"certificate_{cert.certificate_number}.pdf",
    )
    expires_at = storage.get_presign_expiry_datetime()
    return CertificateResponse(download_url=url, expires_at=expires_at)


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/workforce/stats", response_model=WorkforceStatsDTO)
async def get_stats(
    tenant_id: str,
    membership: TenantMember = Depends(get_membership),
    db: AsyncSession = Depends(get_db),
):
    await _get_tenant(tenant_id, db)
    emp_total = await db.scalar(select(func.count()).select_from(Employee).where(Employee.tenant_id == tenant_id))
    emp_active = await db.scalar(
        select(func.count()).select_from(Employee).where(Employee.tenant_id == tenant_id, Employee.is_active.is_(True))
    )
    asn_total = await db.scalar(
        select(func.count()).select_from(EmployeeTrainingAssignment).where(EmployeeTrainingAssignment.tenant_id == tenant_id)
    )
    asn_completed = await db.scalar(
        select(func.count()).select_from(EmployeeTrainingAssignment).where(
            EmployeeTrainingAssignment.tenant_id == tenant_id,
            EmployeeTrainingAssignment.completed_at.isnot(None),
        )
    )
    asn_overdue = await db.scalar(
        select(func.count()).select_from(EmployeeTrainingAssignment).where(
            EmployeeTrainingAssignment.tenant_id == tenant_id,
            EmployeeTrainingAssignment.due_at.isnot(None),
            EmployeeTrainingAssignment.due_at < datetime.now(timezone.utc),
            EmployeeTrainingAssignment.completed_at.is_(None),
        )
    )
    cert_count = await db.scalar(
        select(func.count()).select_from(TrainingCertificate).where(TrainingCertificate.tenant_id == tenant_id)
    )
    return WorkforceStatsDTO(
        total_employees=emp_total or 0,
        active_employees=emp_active or 0,
        total_assignments=asn_total or 0,
        completed_assignments=asn_completed or 0,
        overdue_assignments=asn_overdue or 0,
        certificates_issued=cert_count or 0,
    )
