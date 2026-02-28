# CURSOR SESSION 8 — AUDIT WORKFLOW ENGINE + SELF-ATTESTATION + COMPLIANCE TIMELINE
# Paste into Cursor Composer (Cmd+Shift+I)
#
# ЦЕЛЬ: Claude становится главным аудитором с обязательным роадмапом.
# Три новых системы:
#   1. AuditWorkflow — автоматический 5-шаговый процесс сбора данных
#   2. Self-Attestation — электронная подпись с PDF сертификатом
#   3. Compliance Timeline — история отчётов с диаграммой динамики
#
# ВСЕ имена из реального кода. Нет TODO.

---

## КОНТЕКСТ — ЧТО УЖЕ РАБОТАЕТ (НЕ ТРОГАТЬ)

- Sessions 1-7: все модели, API, Claude Analyst, report_generator, evidence_aggregator
- ControlResult: status (Pass|Partial|Fail|Unknown), severity, rationale
- Gap, Risk, RemediationAction: существуют, заполняются engine
- ClientNote, ClientTask: модели существуют (миграция 010)
- report_generator.py: generate_all_reports() → 5 артефактов
- ReportPackage: publish endpoint существует
- certificate_generator.py: генерирует PDF сертификаты (используем как основу)

---

## ПЕРЕД НАПИСАНИЕМ КОДА — ПРОЧИТАТЬ:

1. `backend/app/models/models.py` — Assessment, Tenant, Control, ControlResult
2. `backend/app/models/ai_evidence.py` — все AI модели
3. `backend/app/api/routes/reports.py` — publish endpoint (строки с /publish)
4. `backend/app/services/certificate_generator.py` — как генерируется PDF
5. `backend/app/services/template_generator.py` — шаблоны документов
6. `backend/app/api/routes/notifications.py` — как создаются уведомления
7. `backend/app/models/workforce.py` — Employee модель
8. `frontend/src/pages/client/Overview.tsx` — dashboard (куда добавим timeline)
9. `frontend/src/services/api.ts` — все API методы

---

## ЧАСТЬ 1 — BACKEND: НОВЫЕ МОДЕЛИ

### Миграция `012_audit_workflow.py`

Создать `backend/migrations/versions/012_audit_workflow.py`:

```python
"""
Audit Workflow Engine + Self-Attestation + Compliance Timeline

Revision ID: 012
Depends on: 011
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

def upgrade():

    # 1. Обязательные артефакты по контролам (справочник)
    op.create_table('control_required_evidence',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('control_id', UUID(as_uuid=True), sa.ForeignKey('controls.id'), nullable=False),
        sa.Column('artifact_name', sa.String(), nullable=False),
        sa.Column('artifact_type', sa.String(), nullable=False),
        # policy|procedure|log|certificate|list|report|screenshot
        sa.Column('required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('hipaa_citation', sa.String(), nullable=True),
        sa.Column('has_template', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('template_control_id', sa.String(), nullable=True),
        # ссылка на template_generator (например "HIPAA-GV-01")
        sa.Column('is_self_attestable', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('attestation_checklist', JSONB, nullable=True),
        # список пунктов для чекбоксов в модальном окне
    )
    op.create_index('ix_control_required_evidence_control',
                    'control_required_evidence', ['control_id'])

    # 2. Workflow состояние по assessment
    op.create_table('audit_workflow_states',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assessment_id', UUID(as_uuid=True),
                  sa.ForeignKey('assessments.id', ondelete='CASCADE'),
                  nullable=False, unique=True),
        sa.Column('tenant_id', UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        # active|waiting_client|completed|cancelled
        sa.Column('current_step', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('step_1_status', sa.String(), nullable=True),  # completed|gap_recorded
        sa.Column('step_1_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('step_2_status', sa.String(), nullable=True),
        sa.Column('step_2_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('step_3_status', sa.String(), nullable=True),
        sa.Column('step_3_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('step_4_status', sa.String(), nullable=True),
        sa.Column('step_4_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('step_5_status', sa.String(), nullable=True),
        sa.Column('step_5_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', JSONB, nullable=True),  # произвольные заметки по шагам
    )
    op.create_index('ix_audit_workflow_states_assessment',
                    'audit_workflow_states', ['assessment_id'])
    op.create_index('ix_audit_workflow_states_tenant',
                    'audit_workflow_states', ['tenant_id'])

    # 3. Чеклист артефактов (per assessment per control per artifact)
    op.create_table('audit_checklist_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assessment_id', UUID(as_uuid=True),
                  sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('control_id', UUID(as_uuid=True),
                  sa.ForeignKey('controls.id'), nullable=False),
        sa.Column('required_evidence_id', UUID(as_uuid=True),
                  sa.ForeignKey('control_required_evidence.id'), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        # pending|note_sent|uploaded|analyzed|validated|gap|self_attested
        sa.Column('evidence_file_id', UUID(as_uuid=True),
                  sa.ForeignKey('evidence_files.id'), nullable=True),
        sa.Column('client_note_id', UUID(as_uuid=True),
                  sa.ForeignKey('notifications.id'), nullable=True),
        sa.Column('client_response', sa.String(), nullable=True),
        # uploaded|no_document|self_attested|pending
        sa.Column('client_responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('gap_reason', sa.String(), nullable=True),
        sa.Column('self_attestation_id', UUID(as_uuid=True),
                  sa.ForeignKey('self_attestations.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_checklist_items_assessment',
                    'audit_checklist_items', ['assessment_id'])
    op.create_index('ix_audit_checklist_items_control',
                    'audit_checklist_items', ['assessment_id', 'control_id'])

    # 4. Self-Attestations (электронные подписи)
    op.create_table('self_attestations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assessment_id', UUID(as_uuid=True),
                  sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('control_id', UUID(as_uuid=True),
                  sa.ForeignKey('controls.id'), nullable=False),
        sa.Column('required_evidence_id', UUID(as_uuid=True),
                  sa.ForeignKey('control_required_evidence.id'), nullable=False),
        # Кто подписал
        sa.Column('attested_by_user_id', sa.String(), nullable=False),
        sa.Column('attested_by_name', sa.String(), nullable=False),
        sa.Column('attested_by_title', sa.String(), nullable=True),
        # Что подтверждено
        sa.Column('attestation_text', sa.Text(), nullable=False),
        # полный текст того что клиент подтвердил
        sa.Column('checklist_items_confirmed', JSONB, nullable=False),
        # список пунктов которые были отмечены галочками
        # Технические данные для неопровержимости
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('attested_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        # PDF сертификат
        sa.Column('certificate_storage_key', sa.String(), nullable=True),
        sa.Column('certificate_hash', sa.String(), nullable=True),
        # SHA-256 PDF для неизменяемости
        sa.Column('evidence_file_id', UUID(as_uuid=True),
                  sa.ForeignKey('evidence_files.id'), nullable=True),
        # ссылка на запись в Evidence Vault
    )
    op.create_index('ix_self_attestations_assessment',
                    'self_attestations', ['assessment_id'])
    op.create_index('ix_self_attestations_tenant',
                    'self_attestations', ['tenant_id'])

    # 5. Compliance Score History (точки на диаграмме)
    op.create_table('compliance_score_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('assessment_id', UUID(as_uuid=True),
                  sa.ForeignKey('assessments.id'), nullable=False),
        sa.Column('report_package_id', UUID(as_uuid=True),
                  sa.ForeignKey('report_packages.id'), nullable=False),
        # Метрики
        sa.Column('score_percent', sa.Float(), nullable=False),
        sa.Column('passed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('partial', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('gaps', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_controls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('self_attested_count', sa.Integer(), nullable=False, server_default='0'),
        # Динамика (vs предыдущая точка)
        sa.Column('delta_score', sa.Float(), nullable=True),
        # None для первого отчёта
        sa.Column('gaps_closed', sa.Integer(), nullable=True),
        sa.Column('gaps_new', sa.Integer(), nullable=True),
        sa.Column('gaps_persisting', sa.Integer(), nullable=True),
        # Текст от Claude (краткое summary изменений)
        sa.Column('claude_delta_summary', sa.Text(), nullable=True),
        # None для первого отчёта
        # Когда зафиксировано (только при publish)
        sa.Column('published_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_compliance_score_history_tenant_date',
                    'compliance_score_history', ['tenant_id', 'published_at'])

def downgrade():
    op.drop_table('compliance_score_history')
    op.drop_table('self_attestations')
    op.drop_table('audit_checklist_items')
    op.drop_table('audit_workflow_states')
    op.drop_table('control_required_evidence')
```

---

### Добавить модели в `backend/app/models/workflow.py` (СОЗДАТЬ НОВЫЙ ФАЙЛ)

```python
"""
Audit Workflow Models
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
from app.db.base import Base


class ControlRequiredEvidence(Base):
    __tablename__ = "control_required_evidence"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                             ForeignKey("controls.id"), nullable=False)
    artifact_name: Mapped[str] = mapped_column(String, nullable=False)
    artifact_type: Mapped[str] = mapped_column(String, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hipaa_citation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    has_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    template_control_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_self_attestable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    attestation_checklist: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    control = relationship("Control")


class AuditWorkflowState(Base):
    __tablename__ = "audit_workflow_states"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                ForeignKey("assessments.id", ondelete="CASCADE"),
                                                nullable=False, unique=True)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                            ForeignKey("tenants.id", ondelete="CASCADE"),
                                            nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    step_1_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    step_1_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    step_2_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    step_2_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    step_3_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    step_3_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    step_4_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    step_4_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    step_5_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    step_5_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=lambda: datetime.utcnow())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class AuditChecklistItem(Base):
    __tablename__ = "audit_checklist_items"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                ForeignKey("assessments.id", ondelete="CASCADE"),
                                                nullable=False)
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                            ForeignKey("tenants.id", ondelete="CASCADE"),
                                            nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                             ForeignKey("controls.id"), nullable=False)
    required_evidence_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                       ForeignKey("control_required_evidence.id"),
                                                       nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    evidence_file_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False),
                                                             ForeignKey("evidence_files.id"),
                                                             nullable=True)
    client_note_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False),
                                                           ForeignKey("notifications.id"),
                                                           nullable=True)
    client_response: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    client_responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    gap_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    self_attestation_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False),
                                                                ForeignKey("self_attestations.id"),
                                                                nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=lambda: datetime.utcnow())

    required_evidence = relationship("ControlRequiredEvidence")


class SelfAttestation(Base):
    __tablename__ = "self_attestations"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                            ForeignKey("tenants.id", ondelete="CASCADE"),
                                            nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                ForeignKey("assessments.id", ondelete="CASCADE"),
                                                nullable=False)
    control_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                             ForeignKey("controls.id"), nullable=False)
    required_evidence_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                       ForeignKey("control_required_evidence.id"),
                                                       nullable=False)
    attested_by_user_id: Mapped[str] = mapped_column(String, nullable=False)
    attested_by_name: Mapped[str] = mapped_column(String, nullable=False)
    attested_by_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    attestation_text: Mapped[str] = mapped_column(Text, nullable=False)
    checklist_items_confirmed: Mapped[list] = mapped_column(JSONB, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    attested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                   default=lambda: datetime.utcnow())
    certificate_storage_key: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    certificate_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    evidence_file_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False),
                                                             ForeignKey("evidence_files.id"),
                                                             nullable=True)


class ComplianceScoreHistory(Base):
    __tablename__ = "compliance_score_history"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True,
                                     default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                            ForeignKey("tenants.id", ondelete="CASCADE"),
                                            nullable=False)
    assessment_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                ForeignKey("assessments.id"), nullable=False)
    report_package_id: Mapped[str] = mapped_column(UUID(as_uuid=False),
                                                    ForeignKey("report_packages.id"),
                                                    nullable=False)
    score_percent: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    partial: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gaps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_controls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    self_attested_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delta_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gaps_closed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gaps_new: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gaps_persisting: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    claude_delta_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                    default=lambda: datetime.utcnow())
```

Импортировать в `backend/app/models/__init__.py` или `models.py`:
```python
from app.models.workflow import (
    ControlRequiredEvidence, AuditWorkflowState,
    AuditChecklistItem, SelfAttestation, ComplianceScoreHistory,
)
```

---

## ЧАСТЬ 2 — BACKEND: SEED ДАННЫХ (ControlRequiredEvidence)

Создать `backend/scripts/seed_required_evidence.py`:

```python
"""
Seed данные: обязательные артефакты по каждому HIPAA контролу.
Запускать после миграции 012: python -m scripts.seed_required_evidence
"""

# Формат: (control_code, artifact_name, artifact_type,
#           required, hipaa_citation, has_template,
#           template_control_id, is_self_attestable,
#           attestation_checklist)

REQUIRED_EVIDENCE = [
    # GOVERNANCE
    ("HIPAA-GV-01", "Security Officer Designation Letter", "policy",
     True, "164.308(a)(2)", True, "HIPAA-GV-01", True,
     ["Our organization has designated a Security Officer",
      "The Security Officer is responsible for HIPAA compliance",
      "I understand this role and accept the responsibility"]),

    ("HIPAA-GV-02", "Business Associate Agreement (BAA)", "contract",
     True, "164.308(b)(1)", True, "HIPAA-GV-02", False, None),

    ("HIPAA-GV-03", "Security Policies and Procedures", "policy",
     True, "164.316(a)", True, "HIPAA-GV-03", True,
     ["Our organization has security policies in place",
      "Policies are reviewed at least annually",
      "All staff are aware of security policies"]),

    ("HIPAA-GV-04", "Document Retention Schedule", "policy",
     False, "164.316(b)(2)", True, "HIPAA-GV-04", True,
     ["Our organization has a document retention policy",
      "Records are retained for the required period"]),

    # IDENTIFY
    ("HIPAA-ID-01", "Risk Analysis Report", "report",
     True, "164.308(a)(1)(ii)(A)", False, None, False, None),

    ("HIPAA-ID-02", "Risk Management Plan", "policy",
     True, "164.308(a)(1)(ii)(B)", True, "HIPAA-ID-02", True,
     ["Our organization has reviewed security risks",
      "We have a plan to address identified risks",
      "Risk management is an ongoing process"]),

    ("HIPAA-ID-03", "Sanction Policy", "policy",
     True, "164.308(a)(1)(ii)(C)", True, "HIPAA-ID-03", True,
     ["Our organization has a workforce sanction policy",
      "Violations of HIPAA policies result in sanctions",
      "The sanction policy has been communicated to staff"]),

    # PROTECT — Administrative
    ("HIPAA-PR-06", "HIPAA Security Training Records", "certificate",
     True, "164.308(a)(5)", False, None, False, None),

    ("HIPAA-PR-06", "Security Awareness Training Policy", "policy",
     True, "164.308(a)(5)(i)", True, "HIPAA-GV-03", True,
     ["Our organization provides HIPAA security training",
      "Training is provided to all new staff",
      "Training is repeated periodically (at least annually)"]),

    ("HIPAA-PR-08", "Password / Access Management Policy", "policy",
     True, "164.308(a)(5)(ii)(D)", True, "HIPAA-PR-08", True,
     ["Our organization has a password policy",
      "Passwords meet minimum complexity requirements",
      "Staff are trained on password security"]),

    # PROTECT — Physical
    ("HIPAA-PR-09", "Facility Access Control Policy", "policy",
     True, "164.310(a)(1)", True, "HIPAA-GV-03", True,
     ["Physical access to ePHI systems is restricted",
      "Visitors are escorted or logged",
      "Workstations are positioned to prevent unauthorized viewing"]),

    ("HIPAA-PR-11", "Visitor Log", "log",
     False, "164.310(a)(2)(ii)", True, "HIPAA-PR-11", True,
     ["Our facility maintains a visitor log",
      "Visitors are required to sign in and out"]),

    ("HIPAA-PR-12", "Workstation Use Policy", "policy",
     True, "164.310(b)", True, "HIPAA-PR-12", True,
     ["Our organization has a workstation use policy",
      "Workstations with ePHI access have physical safeguards",
      "Auto-lock is enabled on all workstations"]),

    ("HIPAA-PR-14", "Media Disposal / Destruction Log", "log",
     False, "164.310(d)(1)", True, "HIPAA-PR-14", True,
     ["Our organization has a media disposal procedure",
      "Hardware containing ePHI is securely wiped or destroyed",
      "Disposal is documented"]),

    # PROTECT — Technical
    ("HIPAA-PR-16", "Unique User Account List", "list",
     True, "164.312(a)(2)(i)", False, None, True,
     ["All staff have unique user accounts",
      "Shared accounts are not used for ePHI access",
      "User accounts are reviewed periodically"]),

    ("HIPAA-PR-19", "Encryption Policy / Evidence", "policy",
     True, "164.312(a)(2)(iv)", True, "HIPAA-GV-03", True,
     ["ePHI at rest is encrypted where feasible",
      "ePHI in transit is encrypted (TLS/HTTPS)",
      "Encryption keys are managed securely"]),

    ("HIPAA-PR-22", "Transmission Security Policy", "policy",
     True, "164.312(e)(1)", True, "HIPAA-GV-03", True,
     ["ePHI is only transmitted over secure channels",
      "Email containing ePHI is encrypted",
      "Remote access uses VPN or equivalent"]),

    # DETECT
    ("HIPAA-DE-01", "System Activity Review Log / Report", "log",
     True, "164.308(a)(1)(ii)(D)", False, None, True,
     ["Our organization reviews system activity logs",
      "Suspicious activity is investigated",
      "Log reviews occur at least quarterly"]),

    ("HIPAA-DE-03", "Audit Log Evidence / Screenshots", "log",
     True, "164.312(b)", False, None, True,
     ["Audit logging is enabled on systems containing ePHI",
      "Logs are retained for the required period",
      "Logs are reviewed regularly"]),

    # RESPOND
    ("HIPAA-RS-01", "Incident Response Plan", "policy",
     True, "164.308(a)(6)(i)", True, "HIPAA-RS-01", True,
     ["Our organization has an incident response plan",
      "Staff know how to report a potential breach",
      "The plan has been tested or reviewed"]),

    ("HIPAA-RS-02", "Breach Notification Policy", "policy",
     True, "164.408", True, "HIPAA-GV-03", True,
     ["Our organization has a breach notification procedure",
      "We understand the 60-day notification requirement",
      "We know who to notify (HHS, patients, media if applicable)"]),

    # RECOVER
    ("HIPAA-RC-01", "Data Backup Policy and Backup Logs", "policy",
     True, "164.308(a)(7)(ii)(A)", True, "HIPAA-RC-01", True,
     ["Our organization performs regular data backups",
      "Backups are tested periodically",
      "Backup copies are stored securely (offsite or cloud)"]),

    ("HIPAA-RC-02", "Disaster Recovery Plan", "policy",
     True, "164.308(a)(7)(ii)(B)", True, "HIPAA-RC-02", True,
     ["Our organization has a disaster recovery plan",
      "Critical systems can be restored within an acceptable timeframe",
      "The plan has been reviewed in the past 12 months"]),
]


async def seed_required_evidence(db):
    """
    Для каждого артефакта:
    1. Найти Control по control_code в БД
    2. Проверить что запись не существует (idempotent)
    3. Создать ControlRequiredEvidence
    """
    from sqlalchemy import select
    from app.models.models import Control
    from app.models.workflow import ControlRequiredEvidence

    for (control_code, artifact_name, artifact_type, required,
         hipaa_citation, has_template, template_control_id,
         is_self_attestable, attestation_checklist) in REQUIRED_EVIDENCE:

        # Найти контрол по control_code
        control = (await db.execute(
            select(Control).where(Control.control_code == control_code)
        )).scalar_one_or_none()

        if not control:
            print(f"WARNING: Control {control_code} not found, skipping")
            continue

        # Проверить дубликат
        existing = (await db.execute(
            select(ControlRequiredEvidence).where(
                ControlRequiredEvidence.control_id == control.id,
                ControlRequiredEvidence.artifact_name == artifact_name,
            )
        )).scalar_one_or_none()

        if existing:
            continue

        db.add(ControlRequiredEvidence(
            control_id=str(control.id),
            artifact_name=artifact_name,
            artifact_type=artifact_type,
            required=required,
            hipaa_citation=hipaa_citation,
            has_template=has_template,
            template_control_id=template_control_id,
            is_self_attestable=is_self_attestable,
            attestation_checklist=attestation_checklist,
        ))

    await db.commit()
    print("ControlRequiredEvidence seeded successfully")
```

---

## ЧАСТЬ 3 — BACKEND: СЕРВИСЫ

### `backend/app/services/audit_workflow.py` — СОЗДАТЬ

```python
"""
Audit Workflow Engine
Автоматически запускается при создании assessment.
Ведёт клиента через 5 шагов сбора данных.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Assessment, Control, ControlResult
from app.models.workflow import (
    AuditWorkflowState, AuditChecklistItem, ControlRequiredEvidence
)
from app.models.ingest import IngestReceipt


async def initialize_workflow(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> AuditWorkflowState:
    """
    Вызывается автоматически при создании/активации assessment.
    Создаёт AuditWorkflowState и AuditChecklistItem для каждого
    требуемого артефакта по всем контролам.
    """
    # Проверить что workflow ещё не создан
    existing = (await db.execute(
        select(AuditWorkflowState).where(
            AuditWorkflowState.assessment_id == assessment_id
        )
    )).scalar_one_or_none()
    if existing:
        return existing

    # Создать workflow state
    workflow = AuditWorkflowState(
        assessment_id=assessment_id,
        tenant_id=tenant_id,
        status="active",
        current_step=1,
        started_at=datetime.now(timezone.utc),
    )
    db.add(workflow)

    # Получить все ControlRequiredEvidence
    all_required = (await db.execute(
        select(ControlRequiredEvidence)
    )).scalars().all()

    # Создать AuditChecklistItem для каждого
    for req in all_required:
        db.add(AuditChecklistItem(
            assessment_id=assessment_id,
            tenant_id=tenant_id,
            control_id=str(req.control_id),
            required_evidence_id=str(req.id),
            status="pending",
        ))

    await db.commit()
    await db.refresh(workflow)
    return workflow


async def advance_workflow(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> AuditWorkflowState:
    """
    Проверяет текущий шаг и переходит к следующему если условия выполнены.
    Вызывается:
    - после получения данных агента
    - после ответа клиента на Note
    - после загрузки/анализа документа
    - вручную через API
    """
    workflow = (await db.execute(
        select(AuditWorkflowState).where(
            AuditWorkflowState.assessment_id == assessment_id
        )
    )).scalar_one_or_none()

    if not workflow or workflow.status == "completed":
        return workflow

    now = datetime.now(timezone.utc)

    # STEP 1: Agent Data
    if workflow.current_step == 1 and not workflow.step_1_status:
        has_agent_data = (await db.execute(
            select(IngestReceipt).where(
                IngestReceipt.client_org_id == tenant_id,
                IngestReceipt.status == "accepted",
            )
        )).scalar_one_or_none()

        if has_agent_data:
            workflow.step_1_status = "completed"
        else:
            workflow.step_1_status = "gap_recorded"
            # GAP: нет данных агента — фиксируем, продолжаем

        workflow.step_1_completed_at = now
        workflow.current_step = 2

    # STEP 2: SRA Questionnaire
    elif workflow.current_step == 2 and not workflow.step_2_status:
        control_results = (await db.execute(
            select(ControlResult).where(
                ControlResult.assessment_id == assessment_id
            )
        )).scalars().all()

        total_controls = (await db.execute(
            select(Control)
        )).scalars().all()

        answered_count = len(control_results)
        total_count = len(total_controls)

        if answered_count >= total_count:
            workflow.step_2_status = "completed"
        elif answered_count > 0:
            workflow.step_2_status = "partial_completed"
            # Частично — продолжаем, недостающие = GAP
        else:
            workflow.step_2_status = "gap_recorded"

        workflow.step_2_completed_at = now
        workflow.current_step = 3

    # STEP 3: Evidence Checklist
    elif workflow.current_step == 3 and not workflow.step_3_status:
        checklist_items = (await db.execute(
            select(AuditChecklistItem).where(
                AuditChecklistItem.assessment_id == assessment_id
            )
        )).scalars().all()

        pending_required = [
            item for item in checklist_items
            if item.status == "pending"
        ]

        if not pending_required:
            workflow.step_3_status = "completed"
            workflow.step_3_completed_at = now
            workflow.current_step = 4
        else:
            # Есть pending items — ждём или отправляем Notes
            workflow.status = "waiting_client"
            # advance_workflow будет вызван снова когда клиент ответит

    # STEP 4: Workforce
    elif workflow.current_step == 4 and not workflow.step_4_status:
        from app.models.workforce import Employee
        from app.models.training import TrainingAssignment

        employee_count = (await db.execute(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.status == "active",
            )
        )).scalars().all()

        if not employee_count:
            workflow.step_4_status = "gap_recorded"
        else:
            # Проверить тренинги
            all_have_training = all(
                any(
                    a.completed_at for a in
                    (await db.execute(
                        select(TrainingAssignment).where(
                            TrainingAssignment.employee_id == emp.id
                        )
                    )).scalars().all()
                )
                for emp in employee_count
            )
            workflow.step_4_status = "completed" if all_have_training else "partial_completed"

        workflow.step_4_completed_at = now
        workflow.current_step = 5

    # STEP 5: Ready for Final Analysis
    elif workflow.current_step == 5 and not workflow.step_5_status:
        workflow.step_5_status = "completed"
        workflow.step_5_completed_at = now
        workflow.status = "completed"
        workflow.completed_at = now

    await db.commit()
    await db.refresh(workflow)
    return workflow


async def get_workflow_status(
    assessment_id: str,
    db: AsyncSession,
) -> dict:
    """Возвращает текущий статус workflow для UI."""
    workflow = (await db.execute(
        select(AuditWorkflowState).where(
            AuditWorkflowState.assessment_id == assessment_id
        )
    )).scalar_one_or_none()

    if not workflow:
        return {"status": "not_started", "current_step": 0}

    checklist = (await db.execute(
        select(AuditChecklistItem).where(
            AuditChecklistItem.assessment_id == assessment_id
        )
    )).scalars().all()

    total = len(checklist)
    completed = sum(1 for i in checklist
                    if i.status in ("validated", "self_attested", "gap"))
    pending = sum(1 for i in checklist if i.status == "pending")
    waiting = sum(1 for i in checklist if i.status == "note_sent")

    return {
        "status": workflow.status,
        "current_step": workflow.current_step,
        "steps": {
            1: {"name": "Agent Data", "status": workflow.step_1_status},
            2: {"name": "Questionnaire", "status": workflow.step_2_status},
            3: {"name": "Evidence", "status": workflow.step_3_status},
            4: {"name": "Workforce", "status": workflow.step_4_status},
            5: {"name": "Final Analysis", "status": workflow.step_5_status},
        },
        "checklist": {
            "total": total,
            "completed": completed,
            "pending": pending,
            "waiting_client": waiting,
        },
        "ready_for_report": workflow.status == "completed",
    }
```

### `backend/app/services/self_attestation_service.py` — СОЗДАТЬ

```python
"""
Self-Attestation Service
Обрабатывает электронную подпись клиента.
Генерирует PDF сертификат и добавляет в Evidence Vault.
"""
import hashlib
import io
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.workflow import SelfAttestation, AuditChecklistItem, ControlRequiredEvidence
from app.models.models import EvidenceFile, Control, Tenant
from app.services.storage import StorageService
from app.core.config import settings

# ReportLab imports (уже установлен)
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle


async def create_self_attestation(
    tenant_id: str,
    assessment_id: str,
    control_id: str,
    required_evidence_id: str,
    attested_by_user_id: str,
    attested_by_name: str,
    attested_by_title: str | None,
    checklist_items_confirmed: list[str],
    ip_address: str | None,
    user_agent: str | None,
    db: AsyncSession,
) -> SelfAttestation:
    """
    1. Создаёт SelfAttestation запись
    2. Генерирует PDF сертификат
    3. Сохраняет в MinIO
    4. Создаёт EvidenceFile запись
    5. Обновляет AuditChecklistItem
    """
    now = datetime.now(timezone.utc)

    # Получить данные для сертификата
    tenant = (await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )).scalar_one()

    control = (await db.execute(
        select(Control).where(Control.id == control_id)
    )).scalar_one()

    req_evidence = (await db.execute(
        select(ControlRequiredEvidence).where(
            ControlRequiredEvidence.id == required_evidence_id
        )
    )).scalar_one()

    # Текст аттестации
    attestation_text = (
        f"I, {attested_by_name}"
        f"{f', {attested_by_title},' if attested_by_title else ','} "
        f"on behalf of {tenant.name}, hereby attest that the following "
        f"statements regarding {req_evidence.artifact_name} "
        f"({control.control_code} — {control.title}) are true and accurate "
        f"as of {now.strftime('%B %d, %Y')}:\n\n"
        + "\n".join(f"• {item}" for item in checklist_items_confirmed)
    )

    # Создать запись SelfAttestation
    attestation = SelfAttestation(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        control_id=control_id,
        required_evidence_id=required_evidence_id,
        attested_by_user_id=attested_by_user_id,
        attested_by_name=attested_by_name,
        attested_by_title=attested_by_title,
        attestation_text=attestation_text,
        checklist_items_confirmed=checklist_items_confirmed,
        ip_address=ip_address,
        user_agent=user_agent,
        attested_at=now,
    )
    db.add(attestation)
    await db.flush()  # получить id

    # Генерировать PDF
    pdf_bytes = _generate_attestation_pdf(
        attestation_id=str(attestation.id),
        tenant_name=tenant.name,
        control_code=control.control_code,
        control_name=control.title,
        artifact_name=req_evidence.artifact_name,
        hipaa_citation=req_evidence.hipaa_citation,
        attested_by_name=attested_by_name,
        attested_by_title=attested_by_title,
        checklist_items=checklist_items_confirmed,
        attested_at=now,
    )

    # SHA-256 хэш PDF
    cert_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # Сохранить в MinIO
    storage = StorageService()
    safe_name = f"{control.control_code}_{req_evidence.artifact_name}".replace(" ", "_")
    storage_key = f"attestations/{tenant_id}/{assessment_id}/{safe_name}_{str(attestation.id)[:8]}.pdf"
    await storage.upload_file(
        key=storage_key,
        data=pdf_bytes,
        content_type="application/pdf",
    )

    # Создать EvidenceFile
    evidence_file = EvidenceFile(
        tenant_id=tenant_id,
        filename=f"Self_Attestation_{safe_name}.pdf",
        storage_key=storage_key,
        file_size=len(pdf_bytes),
        mime_type="application/pdf",
        status="self_attested",
        uploaded_by=attested_by_user_id,
        control_tag=control.control_code,
        source="self_attestation",
        notes=(
            f"Self-attested by {attested_by_name}"
            f"{f', {attested_by_title}' if attested_by_title else ''}. "
            f"Attestation ID: {attestation.id}. "
            f"Hash: {cert_hash[:16]}..."
        ),
    )
    db.add(evidence_file)
    await db.flush()

    # Обновить attestation с ссылками
    attestation.certificate_storage_key = storage_key
    attestation.certificate_hash = cert_hash
    attestation.evidence_file_id = str(evidence_file.id)

    # Обновить AuditChecklistItem
    checklist_item = (await db.execute(
        select(AuditChecklistItem).where(
            AuditChecklistItem.assessment_id == assessment_id,
            AuditChecklistItem.required_evidence_id == required_evidence_id,
        )
    )).scalar_one_or_none()

    if checklist_item:
        checklist_item.status = "self_attested"
        checklist_item.evidence_file_id = str(evidence_file.id)
        checklist_item.self_attestation_id = str(attestation.id)
        checklist_item.client_response = "self_attested"
        checklist_item.client_responded_at = now
        checklist_item.updated_at = now

    await db.commit()

    # Audit log
    from app.services.audit import log_event
    await log_event(
        db=db,
        tenant_id=tenant_id,
        user_id=attested_by_user_id,
        event_type="self_attestation_created",
        entity_type="self_attestation",
        entity_id=str(attestation.id),
        payload={
            "control_code": control.control_code,
            "artifact_name": req_evidence.artifact_name,
            "attestation_id": str(attestation.id),
            "certificate_hash": cert_hash[:16],
        },
    )

    return attestation


def _generate_attestation_pdf(
    attestation_id: str,
    tenant_name: str,
    control_code: str,
    control_name: str,
    artifact_name: str,
    hipaa_citation: str | None,
    attested_by_name: str,
    attested_by_title: str | None,
    checklist_items: list[str],
    attested_at: datetime,
) -> bytes:
    """Генерирует PDF сертификат самоаттестации."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            rightMargin=inch, leftMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()
    story = []

    navy = colors.HexColor("#1A3A5C")
    amber = colors.HexColor("#E67E22")

    title_style = ParagraphStyle("T", parent=styles["Title"],
                                  fontSize=18, textColor=navy, spaceAfter=4)
    sub_style = ParagraphStyle("S", parent=styles["Normal"],
                                fontSize=10, textColor=colors.HexColor("#555555"),
                                spaceAfter=4)
    body_style = ParagraphStyle("B", parent=styles["Normal"],
                                 fontSize=10, leading=16, spaceAfter=8)
    small_style = ParagraphStyle("Sm", parent=styles["Normal"],
                                  fontSize=8, textColor=colors.HexColor("#888888"))

    story.append(Paragraph("SELF-ATTESTATION CERTIFICATE", title_style))
    story.append(Paragraph("HIPAA Security Rule Compliance", sub_style))
    story.append(Paragraph(f"Issued by Summit Range Consulting HIPAA Portal", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=navy))
    story.append(Spacer(1, 12))

    # Watermark notice
    story.append(Paragraph(
        "⚠ SELF-ATTESTATION — This document represents an organizational "
        "self-declaration, not an independent audit finding. "
        "It is recorded as evidence of organizational attestation.",
        ParagraphStyle("W", parent=styles["Normal"], fontSize=9,
                       textColor=amber, backColor=colors.HexColor("#FEF9E7"),
                       borderPad=6, spaceAfter=12)
    ))

    # Details table
    details = [
        ["Organization:", tenant_name],
        ["Control:", f"{control_code} — {control_name}"],
        ["Requirement:", artifact_name],
        ["HIPAA Citation:", hipaa_citation or "—"],
        ["Attested By:", attested_by_name + (f", {attested_by_title}" if attested_by_title else "")],
        ["Date & Time:", attested_at.strftime("%B %d, %Y at %H:%M UTC")],
        ["Certificate ID:", attestation_id],
    ]
    detail_table = Table(details, colWidths=[1.8 * inch, 4.7 * inch])
    detail_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1),
         [colors.HexColor("#EBF5FB"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Attestation Statements", ParagraphStyle(
        "H", parent=styles["Heading2"], fontSize=12, textColor=navy, spaceAfter=8
    )))
    story.append(Paragraph(
        f"The undersigned hereby attests that the following statements are "
        f"true and accurate as of the date above:", body_style
    ))

    for item in checklist_items:
        story.append(Paragraph(f"☑ {item}", ParagraphStyle(
            "Item", parent=styles["Normal"], fontSize=10,
            leading=14, spaceAfter=4, leftIndent=20
        )))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1,
                             color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"This attestation was electronically executed via the Summit Range Consulting "
        f"HIPAA Readiness Portal. The organization assumes full responsibility for the "
        f"accuracy of the statements above. This document is tamper-evident and "
        f"timestamped. Independent documentation is recommended for formal audit purposes.",
        small_style
    ))
    story.append(Paragraph(
        f"Attestation ID: {attestation_id} | "
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        small_style
    ))

    doc.build(story)
    return buf.getvalue()
```

### `backend/app/services/compliance_history.py` — СОЗДАТЬ

```python
"""
Compliance Score History Service
Фиксирует точку на timeline при публикации отчёта.
"""
import anthropic
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.models import Assessment, Tenant, ControlResult
from app.models.workflow import ComplianceScoreHistory, SelfAttestation
from app.models.ai_evidence import ControlEvidenceAggregate
from app.core.config import settings


async def record_published_score(
    tenant_id: str,
    assessment_id: str,
    report_package_id: str,
    db: AsyncSession,
) -> ComplianceScoreHistory:
    """
    Вызывается из publish endpoint в reports.py.
    Фиксирует точку на compliance timeline.
    """
    # Текущие результаты
    control_results = (await db.execute(
        select(ControlResult).where(
            ControlResult.assessment_id == assessment_id
        )
    )).scalars().all()

    passed = sum(1 for r in control_results if r.status == "Pass")
    partial = sum(1 for r in control_results if r.status == "Partial")
    failed = sum(1 for r in control_results if r.status in ("Fail", "Unknown"))
    total = len(control_results)
    score = round(passed / total * 100) if total else 0

    # Self-attestations count
    self_attested = (await db.execute(
        select(SelfAttestation).where(
            SelfAttestation.assessment_id == assessment_id
        )
    )).scalars().all()

    # Предыдущая точка на timeline (для delta)
    previous_point = (await db.execute(
        select(ComplianceScoreHistory).where(
            ComplianceScoreHistory.tenant_id == tenant_id,
        ).order_by(desc(ComplianceScoreHistory.published_at)).limit(1)
    )).scalar_one_or_none()

    delta_score = None
    gaps_closed = None
    gaps_new = None
    gaps_persisting = None
    claude_delta_summary = None

    if previous_point:
        delta_score = round(score - previous_point.score_percent, 1)
        gaps_closed = max(0, previous_point.gaps - failed)
        gaps_new = max(0, failed - previous_point.gaps)
        gaps_persisting = min(previous_point.gaps, failed)

        # Генерировать delta summary через Claude (короткий)
        if settings.LLM_ENABLED and settings.ANTHROPIC_API_KEY:
            claude_delta_summary = await _generate_delta_summary(
                tenant_id=tenant_id,
                current_score=score,
                previous_score=previous_point.score_percent,
                delta=delta_score,
                gaps_closed=gaps_closed,
                gaps_new=gaps_new,
                db=db,
            )

    history_point = ComplianceScoreHistory(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        report_package_id=report_package_id,
        score_percent=float(score),
        passed=passed,
        partial=partial,
        gaps=failed,
        total_controls=total,
        self_attested_count=len(self_attested),
        delta_score=delta_score,
        gaps_closed=gaps_closed,
        gaps_new=gaps_new,
        gaps_persisting=gaps_persisting,
        claude_delta_summary=claude_delta_summary,
        published_at=datetime.now(timezone.utc),
    )
    db.add(history_point)
    await db.commit()
    return history_point


async def get_compliance_timeline(
    tenant_id: str,
    db: AsyncSession,
) -> list[dict]:
    """Возвращает все точки timeline для диаграммы."""
    points = (await db.execute(
        select(ComplianceScoreHistory).where(
            ComplianceScoreHistory.tenant_id == tenant_id,
        ).order_by(ComplianceScoreHistory.published_at)
    )).scalars().all()

    return [
        {
            "id": str(p.id),
            "assessment_id": str(p.assessment_id),
            "report_package_id": str(p.report_package_id),
            "score_percent": p.score_percent,
            "passed": p.passed,
            "partial": p.partial,
            "gaps": p.gaps,
            "total_controls": p.total_controls,
            "self_attested_count": p.self_attested_count,
            "delta_score": p.delta_score,
            "gaps_closed": p.gaps_closed,
            "gaps_new": p.gaps_new,
            "gaps_persisting": p.gaps_persisting,
            "claude_delta_summary": p.claude_delta_summary,
            "published_at": p.published_at.isoformat(),
        }
        for p in points
    ]


async def _generate_delta_summary(
    tenant_id: str, current_score: float,
    previous_score: float, delta: float,
    gaps_closed: int, gaps_new: int, db: AsyncSession,
) -> str | None:
    """Claude генерирует 2-3 предложения об изменениях (для tooltip на диаграмме)."""
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        sign = "+" if delta >= 0 else ""
        prompt = (
            f"Write 2-3 concise sentences summarizing a HIPAA compliance score change. "
            f"Score changed from {previous_score}% to {current_score}% ({sign}{delta}%). "
            f"Gaps closed: {gaps_closed}. New gaps: {gaps_new}. "
            f"Be factual and professional. No headers, just narrative text."
        )
        message = client.messages.create(
            model=settings.LLM_MODEL,
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception:
        return None
```

---

## ЧАСТЬ 4 — BACKEND: НОВЫЕ API РОУТЫ

### `backend/app/api/routes/workflow.py` — СОЗДАТЬ

```python
"""
Audit Workflow API
Prefix: /api/v1/tenants/{tenant_id}/assessments/{assessment_id}/workflow
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.core.auth import require_auth
from app.models.workflow import AuditChecklistItem, ControlRequiredEvidence
from app.services.audit_workflow import (
    initialize_workflow, advance_workflow, get_workflow_status
)
from app.services.self_attestation_service import create_self_attestation

router = APIRouter(
    prefix="/tenants/{tenant_id}/assessments/{assessment_id}/workflow",
    tags=["workflow"]
)


@router.get("/status")
async def get_status(
    tenant_id: str, assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Текущий статус workflow и checklist."""
    return await get_workflow_status(assessment_id, db)


@router.post("/advance")
async def advance(
    tenant_id: str, assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Принудительно продвинуть workflow (для internal admin)."""
    workflow = await advance_workflow(assessment_id, tenant_id, db)
    return await get_workflow_status(assessment_id, db)


@router.get("/checklist")
async def get_checklist(
    tenant_id: str, assessment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Полный чеклист артефактов с прогрессом."""
    items = (await db.execute(
        select(AuditChecklistItem, ControlRequiredEvidence)
        .join(ControlRequiredEvidence,
              ControlRequiredEvidence.id == AuditChecklistItem.required_evidence_id)
        .where(AuditChecklistItem.assessment_id == assessment_id)
        .order_by(AuditChecklistItem.control_id)
    )).all()

    return {
        "assessment_id": assessment_id,
        "items": [
            {
                "id": str(item.id),
                "control_id": str(item.control_id),
                "artifact_name": req.artifact_name,
                "artifact_type": req.artifact_type,
                "required": req.required,
                "hipaa_citation": req.hipaa_citation,
                "has_template": req.has_template,
                "template_control_id": req.template_control_id,
                "is_self_attestable": req.is_self_attestable,
                "attestation_checklist": req.attestation_checklist,
                "status": item.status,
                "client_response": item.client_response,
                "client_responded_at": item.client_responded_at.isoformat()
                                       if item.client_responded_at else None,
                "gap_reason": item.gap_reason,
                "evidence_file_id": item.evidence_file_id,
            }
            for item, req in items
        ]
    }


class ClientResponseRequest(BaseModel):
    response: str  # "no_document" — клиент нажал "We don't have this"
    reason: str | None = None


@router.post("/checklist/{item_id}/respond")
async def client_respond(
    tenant_id: str, assessment_id: str, item_id: str,
    body: ClientResponseRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """
    Клиент нажал "We don't have this" в уведомлении.
    Фиксируем как GAP и продвигаем workflow.
    """
    item = (await db.execute(
        select(AuditChecklistItem).where(
            AuditChecklistItem.id == item_id,
            AuditChecklistItem.assessment_id == assessment_id,
        )
    )).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    if body.response == "no_document":
        item.status = "gap"
        item.client_response = "no_document"
        item.gap_reason = body.reason or "Client indicated document is not available"
        item.client_responded_at = now
        item.updated_at = now
        await db.commit()

        # Попробовать продвинуть workflow
        await advance_workflow(assessment_id, tenant_id, db)

    return {"status": "recorded", "item_id": item_id}


class SelfAttestRequest(BaseModel):
    control_id: str
    required_evidence_id: str
    attested_by_name: str
    attested_by_title: str | None = None
    checklist_items_confirmed: list[str]


@router.post("/self-attest")
async def self_attest(
    tenant_id: str, assessment_id: str,
    body: SelfAttestRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """
    Клиент нажал "I Confirm and Take Responsibility".
    Создаёт attestation, генерирует PDF, добавляет в Evidence Vault.
    """
    attestation = await create_self_attestation(
        tenant_id=tenant_id,
        assessment_id=assessment_id,
        control_id=body.control_id,
        required_evidence_id=body.required_evidence_id,
        attested_by_user_id=str(current_user.id),
        attested_by_name=body.attested_by_name,
        attested_by_title=body.attested_by_title,
        checklist_items_confirmed=body.checklist_items_confirmed,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        db=db,
    )

    # Продвинуть workflow
    await advance_workflow(assessment_id, tenant_id, db)

    return {
        "attestation_id": str(attestation.id),
        "certificate_hash": attestation.certificate_hash[:16] + "...",
        "evidence_file_id": attestation.evidence_file_id,
        "attested_at": attestation.attested_at.isoformat(),
    }
```

### Добавить GET timeline в reports.py

В `backend/app/api/routes/reports.py` добавить эндпоинт:

```python
from app.services.compliance_history import get_compliance_timeline

@router.get("/compliance-timeline")
async def get_timeline(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """История compliance score для диаграммы. Только опубликованные отчёты."""
    return {
        "tenant_id": tenant_id,
        "timeline": await get_compliance_timeline(tenant_id, db)
    }
```

### Подключить record_published_score в publish endpoint

В `reports.py` найти publish endpoint и добавить в конце:

```python
from app.services.compliance_history import record_published_score

# После успешной публикации (статус пакета изменился на published):
await record_published_score(
    tenant_id=str(tenant_id),
    assessment_id=str(package.assessment_id),
    report_package_id=str(package.id),
    db=db,
)
```

### Подключить initialize_workflow при создании assessment

Найти endpoint создания assessment (POST /assessments) и добавить:

```python
from app.services.audit_workflow import initialize_workflow

# После commit нового assessment:
await initialize_workflow(
    assessment_id=str(new_assessment.id),
    tenant_id=str(tenant_id),
    db=db,
)
```

Зарегистрировать в `backend/app/main.py`:
```python
from app.api.routes.workflow import router as workflow_router
app.include_router(workflow_router, prefix="/api/v1")
```

---

## ЧАСТЬ 5 — FRONTEND

### 5A. Типы в `frontend/src/types/index.ts`

```typescript
export interface WorkflowStatus {
  status: 'active' | 'waiting_client' | 'completed' | 'not_started'
  current_step: number
  steps: Record<number, { name: string; status: string | null }>
  checklist: {
    total: number
    completed: number
    pending: number
    waiting_client: number
  }
  ready_for_report: boolean
}

export interface ChecklistItem {
  id: string
  control_id: string
  artifact_name: string
  artifact_type: string
  required: boolean
  hipaa_citation?: string
  has_template: boolean
  template_control_id?: string
  is_self_attestable: boolean
  attestation_checklist?: string[]
  status: 'pending' | 'note_sent' | 'uploaded' | 'analyzed' |
          'validated' | 'gap' | 'self_attested'
  client_response?: string
  gap_reason?: string
  evidence_file_id?: string
}

export interface ComplianceTimelinePoint {
  id: string
  assessment_id: string
  report_package_id: string
  score_percent: number
  passed: number
  partial: number
  gaps: number
  total_controls: number
  self_attested_count: number
  delta_score?: number
  gaps_closed?: number
  gaps_new?: number
  claude_delta_summary?: string
  published_at: string
}
```

### 5B. API методы в `frontend/src/services/api.ts`

```typescript
export const workflowApi = {
  getStatus: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/workflow/status`),

  getChecklist: (tenantId: string, assessmentId: string) =>
    api.get(`/tenants/${tenantId}/assessments/${assessmentId}/workflow/checklist`),

  respondNoDocument: (tenantId: string, assessmentId: string, itemId: string, reason?: string) =>
    api.post(`/tenants/${tenantId}/assessments/${assessmentId}/workflow/checklist/${itemId}/respond`,
      { response: 'no_document', reason }),

  selfAttest: (tenantId: string, assessmentId: string, payload: {
    control_id: string
    required_evidence_id: string
    attested_by_name: string
    attested_by_title?: string
    checklist_items_confirmed: string[]
  }) => api.post(`/tenants/${tenantId}/assessments/${assessmentId}/workflow/self-attest`, payload),
}

export const reportsApi = {
  // ... существующие методы ...
  getTimeline: (tenantId: string) =>
    api.get(`/tenants/${tenantId}/compliance-timeline`),
}
```

### 5C. Compliance Timeline в Dashboard

В `frontend/src/pages/client/Overview.tsx` добавить секцию с диаграммой.
Использовать `recharts` (уже доступен):

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { ComplianceTimelinePoint } from '@/types'

// State:
const [timeline, setTimeline] = useState<ComplianceTimelinePoint[]>([])

useEffect(() => {
  reportsApi.getTimeline(tenantId)
    .then(res => setTimeline(res.data.timeline))
    .catch(() => {})
}, [tenantId])

// Custom tooltip для точки на графике:
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const point: ComplianceTimelinePoint = payload[0].payload

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-xs">
      <p className="font-bold text-gray-900 text-lg">{point.score_percent}%</p>
      <p className="text-xs text-gray-400 mb-2">
        {new Date(point.published_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })}
      </p>
      <div className="flex gap-3 text-xs mb-2">
        <span className="text-green-600">✓ {point.passed} passed</span>
        <span className="text-red-500">✗ {point.gaps} gaps</span>
        {point.self_attested_count > 0 && (
          <span className="text-yellow-600">⚡ {point.self_attested_count} attested</span>
        )}
      </div>
      {point.delta_score != null && (
        <p className={`text-xs font-medium ${point.delta_score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {point.delta_score >= 0 ? '↑' : '↓'} {Math.abs(point.delta_score)}% from previous
          {point.gaps_closed != null && ` · ${point.gaps_closed} gaps closed`}
        </p>
      )}
      {point.claude_delta_summary && (
        <p className="text-xs text-gray-600 mt-2 leading-relaxed border-t pt-2">
          {point.claude_delta_summary}
        </p>
      )}
    </div>
  )
}

// В JSX Dashboard — добавить после stats row:
{timeline.length > 0 && (
  <div className="card mt-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Compliance Progress</h2>
        <p className="text-sm text-gray-500">Published assessment history</p>
      </div>
      {timeline.length >= 2 && (() => {
        const latest = timeline[timeline.length - 1]
        const delta = latest.delta_score
        return delta != null ? (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            delta >= 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% since last report
          </div>
        ) : null
      })()}
    </div>

    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={timeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="published_at"
          tickFormatter={v => new Date(v).toLocaleDateString('en-US', {
            month: 'short', year: '2-digit'
          })}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          width={40}
        />
        <ReferenceLine y={80} stroke="#10B981" strokeDasharray="4 4"
                       label={{ value: "Target 80%", position: "right",
                                fontSize: 10, fill: "#10B981" }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score_percent"
          stroke="#1A3A5C"
          strokeWidth={2.5}
          dot={{ fill: "#1A3A5C", r: 5, strokeWidth: 2, stroke: "white" }}
          activeDot={{ r: 7, fill: "#2980B9" }}
        />
      </LineChart>
    </ResponsiveContainer>

    {timeline.length === 1 && (
      <p className="text-xs text-center text-gray-400 mt-2">
        Complete and publish your next assessment to see progress over time
      </p>
    )}
  </div>
)}
```

### 5D. Self-Attestation Modal

Создать `frontend/src/components/SelfAttestationModal.tsx`:

```tsx
interface SelfAttestationModalProps {
  item: ChecklistItem
  tenantId: string
  assessmentId: string
  currentUser: { name: string; title?: string }
  onSuccess: () => void
  onClose: () => void
}

export const SelfAttestationModal = ({
  item, tenantId, assessmentId, currentUser, onSuccess, onClose
}: SelfAttestationModalProps) => {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const allChecked = checkedItems.size === (item.attestation_checklist?.length || 0)

  const handleSubmit = async () => {
    if (!allChecked) return
    setIsSubmitting(true)
    try {
      await workflowApi.selfAttest(tenantId, assessmentId, {
        control_id: item.control_id,
        required_evidence_id: item.id,
        attested_by_name: currentUser.name,
        attested_by_title: currentUser.title,
        checklist_items_confirmed: item.attestation_checklist!.filter(
          (_, i) => checkedItems.has(i)
        ),
      })
      toast.success('Attestation recorded. Certificate saved to Evidence Vault.')
      onSuccess()
    } catch {
      toast.error('Failed to submit attestation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // Full screen modal overlay
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Self-Attestation</h2>
            <p className="text-sm text-gray-500 mt-0.5">{item.artifact_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-800">
            ⚠ By confirming, your organization takes formal responsibility for
            these statements. This attestation will be digitally recorded with
            your name, timestamp, and IP address, and included in your compliance record.
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          {item.attestation_checklist?.map((statement, i) => (
            <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
              checkedItems.has(i)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={checkedItems.has(i)}
                onChange={e => {
                  const next = new Set(checkedItems)
                  e.target.checked ? next.add(i) : next.delete(i)
                  setCheckedItems(next)
                }}
                className="mt-0.5 w-4 h-4 text-blue-600 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">{statement}</span>
            </label>
          ))}
        </div>

        {/* Signer info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p className="font-medium text-gray-700">Will be signed as:</p>
          <p className="text-gray-600 mt-1">
            {currentUser.name}{currentUser.title ? `, ${currentUser.title}` : ''}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric'
            })}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!allChecked || isSubmitting}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Recording...'
              : 'I Confirm and Take Responsibility'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## DONE CRITERIA ДЛЯ SESSION 8

**Миграция и модели:**
- [ ] Миграция 012 создана и применена (`alembic upgrade head`)
- [ ] Все 5 моделей в `workflow.py` созданы и импортированы
- [ ] `seed_required_evidence.py` запущен — данные по ~23 артефактам загружены

**Workflow Engine:**
- [ ] `audit_workflow.py` создан
- [ ] При создании assessment → `initialize_workflow()` вызывается автоматически
- [ ] `AuditWorkflowState` создаётся с current_step=1
- [ ] `AuditChecklistItem` создаётся для каждого требуемого артефакта
- [ ] `advance_workflow()` переходит между шагами 1→2→3→4→5
- [ ] GET /workflow/status возвращает текущее состояние

**Self-Attestation:**
- [ ] `self_attestation_service.py` создан
- [ ] POST /workflow/self-attest создаёт SelfAttestation запись
- [ ] PDF сертификат генерируется с watermark "SELF-ATTESTATION"
- [ ] PDF сохраняется в MinIO, EvidenceFile создаётся в Evidence Vault
- [ ] SHA-256 хэш PDF сохраняется в `certificate_hash`
- [ ] AuditLog запись создаётся (event_type: self_attestation_created)
- [ ] POST /workflow/checklist/{id}/respond фиксирует "no_document" как GAP

**Compliance Timeline:**
- [ ] `compliance_history.py` создан
- [ ] `record_published_score()` вызывается из publish endpoint
- [ ] `ComplianceScoreHistory` запись создаётся только при publish
- [ ] Delta (delta_score, gaps_closed, gaps_new) вычисляется vs предыдущая точка
- [ ] Claude генерирует 2-3 предложения summary при наличии delta
- [ ] GET /compliance-timeline возвращает все точки

**Frontend:**
- [ ] Типы WorkflowStatus, ChecklistItem, ComplianceTimelinePoint добавлены
- [ ] workflowApi и reportsApi.getTimeline добавлены в api.ts
- [ ] Dashboard показывает Compliance Progress диаграмму (recharts LineChart)
- [ ] Tooltip на точке диаграммы показывает: score, delta, gaps closed, Claude summary
- [ ] Reference line на 80% ("Target")
- [ ] SelfAttestationModal компонент создан
- [ ] Все чекбоксы должны быть отмечены перед подтверждением
- [ ] После success → toast + Evidence Vault обновляется

**Проверка end-to-end:**
- [ ] Создать assessment → workflow автоматически создаётся (current_step=1)
- [ ] Опубликовать отчёт → точка появляется на диаграмме
- [ ] Опубликовать второй отчёт → delta показывается на диаграмме и в tooltip
- [ ] Self-attest → PDF в Evidence Vault с пометкой "Self-Attestation"
- [ ] "We don't have this" → item переходит в status=gap, workflow продвигается
