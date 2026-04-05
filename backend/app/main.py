from fastapi import FastAPI

from app.api.router import api_router
from app.utils.config import get_settings


def create_app() -> FastAPI:
    """Create and configure the FastAPI app.

    Using an app factory keeps startup behavior explicit and test-friendly.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )

    @app.get("/")
    async def root() -> dict[str, str]:
        """Provide a simple root endpoint for uptime checks."""
        return {"message": "DevScope API"}

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
