"""
Email service — workforce invite and reminder.
MVP: log only; integrate with SendGrid/SES later.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_workforce_invite(
    to_email: str,
    employee_name: str,
    module_title: str,
    due_date: Optional[str] = None,
    invite_link: Optional[str] = None,
) -> None:
    """Send training assignment invite to employee. MVP: log only."""
    logger.info(
        "Workforce invite (logged): to=%s name=%s module=%s due=%s link=%s",
        to_email, employee_name, module_title, due_date, invite_link,
    )


async def send_workforce_reminder(
    to_email: str,
    employee_name: str,
    module_title: str,
    due_date: Optional[str] = None,
    assignment_id: Optional[str] = None,
) -> None:
    """Send overdue training reminder. MVP: log only."""
    logger.info(
        "Workforce reminder (logged): to=%s name=%s module=%s due=%s assignment_id=%s",
        to_email, employee_name, module_title, due_date, assignment_id,
    )
