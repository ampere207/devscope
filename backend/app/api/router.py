from fastapi import APIRouter

from app.api.routes.analysis import router as analysis_router
from app.api.routes.github import router as github_router
from app.api.routes.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(analysis_router, tags=["analysis"])
api_router.include_router(github_router, tags=["github"])
