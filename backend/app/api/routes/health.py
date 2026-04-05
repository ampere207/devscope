from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Expose health status for orchestration and monitoring."""
    return {"status": "ok"}
