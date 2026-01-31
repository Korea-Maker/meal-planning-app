from fastapi import Request, status
from fastapi.responses import JSONResponse

from src.core.config import settings
from src.core.exceptions import AppException


def get_cors_headers(request: Request) -> dict[str, str]:
    """CORS 헤더를 반환합니다."""
    origin = request.headers.get("origin", "")
    if origin in settings.cors_origins_list:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "code": exc.code,
            "details": exc.details,
        },
        headers=get_cors_headers(request),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # 개발 환경에서는 실제 에러 메시지 표시
    error_message = str(exc) if settings.debug else "Internal server error"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": error_message,
            "code": "GENERAL_003",
        },
        headers=get_cors_headers(request),
    )
