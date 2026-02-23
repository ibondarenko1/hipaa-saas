from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, tenants, frameworks, audit, assessments, answers, evidence, engine, reports

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:5173",
        "http://127.0.0.1:3000", "http://127.0.0.1:5173",
        "http://0.0.0.0:5173",
        "http://192.168.40.189:5173",
    ],
    allow_origin_regex=r"(http://192\.168\.\d+\.\d+:5173|https://[a-z0-9-]+\.loca\.lt)",  # LAN + localtunnel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(frameworks.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")

# Phase 2
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(answers.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")

# Phase 3
app.include_router(engine.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
