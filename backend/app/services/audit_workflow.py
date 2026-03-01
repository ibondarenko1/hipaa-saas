"""
Audit Workflow Engine — SESSION 8.
Initialized when an assessment is created. Advances through 5 steps (agent data, questionnaire,
evidence checklist, workforce, final analysis). Step 1 uses tenant.client_org_id for IngestReceipt;
step 4 uses Employee.is_active.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Assessment, Control, ControlResult, Tenant
from app.models.workflow import (
    AuditWorkflowState,
    AuditChecklistItem,
    ControlRequiredEvidence,
)
from app.models.ingest import IngestReceipt


async def initialize_workflow(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> AuditWorkflowState | None:
    """
    Called when an assessment is created. Creates AuditWorkflowState and
    AuditChecklistItem for each ControlRequiredEvidence.
    """
    existing = (
        await db.execute(
            select(AuditWorkflowState).where(
                AuditWorkflowState.assessment_id == assessment_id
            )
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    workflow = AuditWorkflowState(
        assessment_id=assessment_id,
        tenant_id=tenant_id,
        status="active",
        current_step=1,
        started_at=datetime.now(timezone.utc),
    )
    db.add(workflow)
    await db.flush()

    all_required = (
        await db.execute(select(ControlRequiredEvidence))
    ).scalars().all()

    for req in all_required:
        db.add(AuditChecklistItem(
            assessment_id=assessment_id,
            tenant_id=tenant_id,
            control_id=str(req.control_id),
            required_evidence_id=str(req.id),
            status="pending",
        ))

    await db.refresh(workflow)
    return workflow


async def advance_workflow(
    assessment_id: str,
    tenant_id: str,
    db: AsyncSession,
) -> AuditWorkflowState | None:
    """
    Evaluates the current step and advances to the next when conditions are met.
    Step 1: IngestReceipt by tenant.client_org_id, status ACCEPTED.
    Step 2: ControlResult count vs Control count (assessment's controlset_version_id).
    Step 4: Employee with is_active=True (simplified: at least one active employee).
    """
    workflow = (
        await db.execute(
            select(AuditWorkflowState).where(
                AuditWorkflowState.assessment_id == assessment_id
            )
        )
    ).scalar_one_or_none()

    if not workflow or workflow.status == "completed":
        return workflow

    now = datetime.now(timezone.utc)

    # Step 1: Agent data (by tenant.client_org_id, status ACCEPTED)
    if workflow.current_step == 1 and not workflow.step_1_status:
        tenant = (
            await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        ).scalar_one_or_none()
        client_org_id = (tenant.client_org_id or "").strip() if tenant else ""
        has_agent_data = False
        if client_org_id:
            has_agent_data = (
                await db.execute(
                    select(IngestReceipt).where(
                        IngestReceipt.client_org_id == client_org_id,
                        IngestReceipt.status == "ACCEPTED",
                    ).limit(1)
                )
            ).scalar_one_or_none() is not None
        workflow.step_1_status = "completed" if has_agent_data else "gap_recorded"
        workflow.step_1_completed_at = now
        workflow.current_step = 2

    # Step 2: Questionnaire (control results vs total controls for this assessment)
    elif workflow.current_step == 2 and not workflow.step_2_status:
        assessment = (
            await db.execute(
                select(Assessment).where(
                    Assessment.id == assessment_id,
                    Assessment.tenant_id == tenant_id,
                )
            )
        ).scalar_one_or_none()
        if not assessment:
            return workflow
        control_results = (
            await db.execute(
                select(ControlResult).where(
                    ControlResult.assessment_id == assessment_id
                )
            )
        ).scalars().all()
        total_controls = (
            await db.execute(
                select(Control).where(
                    Control.controlset_version_id == assessment.controlset_version_id
                )
            )
        ).scalars().all()
        answered_count = len(control_results)
        total_count = len(total_controls)
        if answered_count >= total_count and total_count > 0:
            workflow.step_2_status = "completed"
        elif answered_count > 0:
            workflow.step_2_status = "partial_completed"
        else:
            workflow.step_2_status = "gap_recorded"
        workflow.step_2_completed_at = now
        workflow.current_step = 3

    # Step 3: Evidence checklist
    elif workflow.current_step == 3 and not workflow.step_3_status:
        checklist_items = (
            await db.execute(
                select(AuditChecklistItem).where(
                    AuditChecklistItem.assessment_id == assessment_id
                )
            )
        ).scalars().all()
        pending_required = [i for i in checklist_items if i.status == "pending"]
        if not pending_required:
            workflow.step_3_status = "completed"
            workflow.step_3_completed_at = now
            workflow.current_step = 4
        else:
            workflow.status = "waiting_client"
            await db.flush()
            await db.refresh(workflow)
            return workflow

    # Step 4: Workforce (at least one active employee)
    elif workflow.current_step == 4 and not workflow.step_4_status:
        from app.models.workforce import Employee
        employee_count = (
            await db.execute(
                select(Employee).where(
                    Employee.tenant_id == tenant_id,
                    Employee.is_active.is_(True),
                )
            )
        ).scalars().all()
        if employee_count:
            workflow.step_4_status = "completed"
        else:
            workflow.step_4_status = "gap_recorded"
        workflow.step_4_completed_at = now
        workflow.current_step = 5

    # Step 5: Final analysis
    elif workflow.current_step == 5 and not workflow.step_5_status:
        workflow.step_5_status = "completed"
        workflow.step_5_completed_at = now
        workflow.status = "completed"
        workflow.completed_at = now

    await db.flush()
    await db.refresh(workflow)
    return workflow


async def get_workflow_status(
    assessment_id: str,
    db: AsyncSession,
) -> dict:
    """Returns workflow status and checklist summary for UI."""
    workflow = (
        await db.execute(
            select(AuditWorkflowState).where(
                AuditWorkflowState.assessment_id == assessment_id
            )
        )
    ).scalar_one_or_none()

    if not workflow:
        return {"status": "not_started", "current_step": 0, "steps": {}, "checklist": {}, "ready_for_report": False}

    checklist = (
        await db.execute(
            select(AuditChecklistItem).where(
                AuditChecklistItem.assessment_id == assessment_id
            )
        )
    ).scalars().all()

    total = len(checklist)
    completed = sum(
        1 for i in checklist
        if i.status in ("validated", "self_attested", "gap", "uploaded", "analyzed")
    )
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
