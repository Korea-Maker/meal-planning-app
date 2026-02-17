from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from src.core.security import get_current_user_id

router = APIRouter()

ALLOWED_DOMAINS = {
    "www.themealdb.com",
    "themealdb.com",
    "img.spoonacular.com",
    "images.unsplash.com",
}


@router.get("/image")
async def proxy_image(
    url: str = Query(..., description="Image URL to proxy"),
    _user_id: str = Depends(get_current_user_id),
):
    """Proxy external images to bypass iOS native image loader issues."""
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_DOMAINS:
        return Response(status_code=403, content=b"Domain not allowed")

    async with httpx.AsyncClient(
        timeout=10.0, follow_redirects=True, max_redirects=3
    ) as client:
        try:
            resp = await client.get(url)
        except httpx.RequestError:
            return Response(status_code=502, content=b"Upstream fetch failed")

    if resp.status_code != 200:
        return Response(status_code=resp.status_code)

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )
