#!/usr/bin/env python3
"""
Redirect to app.scripts.seed_demo_client (run as module so 'app' is found).

Usage:
  docker compose exec backend python -m app.scripts.seed_demo_client
  or (from container with cwd=/app):
  python scripts/seed_demo_client.py
"""
import subprocess
import sys

sys.exit(
    subprocess.call(
        [sys.executable, "-m", "app.scripts.seed_demo_client"] + sys.argv[1:]
    )
)
