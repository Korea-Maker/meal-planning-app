"""Health check endpoint for deployment monitoring."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "healthy", "service": "meal-planning-api"}
