"""
Workforce Compliance — Employee registry, employee-level training assignments,
immutable certificates, CSV import log.
Separate from portal User accounts; employees may or may not have portal access.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


def gen_uuid():
    return str(uuid.uuid4())


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role_title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assignments: Mapped[list["EmployeeTrainingAssignment"]] = relationship(
        "EmployeeTrainingAssignment", back_populates="employee", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TrainingCertificate(Base):
    """Immutable completion certificate — audit-grade record. Hash ensures integrity."""
    __tablename__ = "training_certificates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    assignment_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("employee_training_assignments.id", ondelete="SET NULL"), nullable=True)
    module_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("training_modules.id", ondelete="SET NULL"), nullable=True)

    certificate_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    employee_name: Mapped[str] = mapped_column(Text, nullable=False)
    organization_name: Mapped[str] = mapped_column(Text, nullable=False)
    module_title: Mapped[str] = mapped_column(Text, nullable=False)
    module_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    score_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    storage_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_file_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("evidence_files.id", ondelete="SET NULL"), nullable=True)

    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmployeeTrainingAssignment(Base):
    """Assignment of a training module to a specific employee."""
    __tablename__ = "employee_training_assignments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    training_module_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("training_modules.id", ondelete="CASCADE"), nullable=False)

    assigned_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    invite_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_reminder_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[str] = mapped_column(Text, default="not_started", nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    score_percent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    certificate_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("training_certificates.id", ondelete="SET NULL"), nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="assignments")
    module: Mapped["TrainingModule"] = relationship("TrainingModule", foreign_keys=[training_module_id])
    certificate: Mapped[Optional["TrainingCertificate"]] = relationship(
        "TrainingCertificate", foreign_keys=[certificate_id], lazy="select"
    )


class WorkforceImportLog(Base):
    __tablename__ = "workforce_import_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    imported_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False)
    created_count: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_count: Mapped[int] = mapped_column(Integer, nullable=False)
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False)
    errors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


