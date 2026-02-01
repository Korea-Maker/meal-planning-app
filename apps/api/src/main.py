from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.v1.router import api_router
from src.core.config import settings
from src.core.exceptions import AppException
from src.core.redis import redis_client
from src.middleware.error_handler import app_exception_handler, generic_exception_handler


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """보안 헤더를 추가하는 미들웨어"""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await redis_client.connect()
    yield
    await redis_client.disconnect()


app = FastAPI(
    title=settings.app_name,
    description="AI-powered family meal planning API",
    version="0.1.0",
    # 프로덕션에서는 API 문서 비활성화
    openapi_url=f"{settings.api_v1_prefix}/openapi.json" if settings.is_development else None,
    docs_url=f"{settings.api_v1_prefix}/docs" if settings.is_development else None,
    redoc_url=f"{settings.api_v1_prefix}/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# Security Headers 미들웨어 추가
app.add_middleware(SecurityHeadersMiddleware)

# CORS 설정 - 허용 메서드/헤더 제한
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
