"""
Reset admin user password to a known value.
Use when you cannot log in (e.g. wrong or forgotten password).

Run: docker compose exec backend python scripts/reset_admin_password.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.auth import hash_password
from app.models.models import User
from app.db.session import AsyncSessionLocal


async def main():
    admin_email = (os.getenv("ADMIN_EMAIL", "admin@summitrange.com") or "").strip().lower()
    new_password = os.getenv("ADMIN_PASSWORD", "Admin1234!")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"User not found: {admin_email}")
            print("Run seed first: python scripts/seed.py")
            return
        user.password_hash = hash_password(new_password)
        await db.commit()
        print(f"Password updated for: {admin_email}")
        print(f"Login with password: {new_password}")


if __name__ == "__main__":
    asyncio.run(main())
