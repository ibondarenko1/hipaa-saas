"""
Workforce scheduler — check overdue assignments (for cron/celery).
Can call email_service.send_workforce_reminder for each overdue assignment.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workforce import EmployeeTrainingAssignment


async def check_overdue_assignments(db: AsyncSession) -> list[str]:
    """
    Find all overdue employee training assignments (due_at < now, not completed).
    Returns list of assignment IDs. Caller may send reminders via email_service.
    """
    now = datetime.now(timezone.utc)
    r = await db.execute(
        select(EmployeeTrainingAssignment.id).where(
            EmployeeTrainingAssignment.due_at.isnot(None),
            EmployeeTrainingAssignment.due_at < now,
            EmployeeTrainingAssignment.completed_at.is_(None),
        )
    )
    return [row[0] for row in r.all()]
