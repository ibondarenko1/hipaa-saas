"""
Seed demo client: small practice with ~60% compliance.
Run after seed.py. From project root:
  docker compose exec backend python -m app.scripts.seed_demo_client
Or from backend directory: python -m app.scripts.seed_demo_client
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.seed_demo import run_seed_demo_client

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def main():
    async with SessionLocal() as db:
        result = await run_seed_demo_client(db)
        if result.get("error"):
            print(result["error"])
            return
        await db.commit()
        print("✅", result["message"])
        print(f"   Client login: {result['client_email']} / {result['client_password']}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Demo client seed failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
