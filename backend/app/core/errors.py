import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

_STATUS_CODES = {
    401: "not_authenticated",
    403: "forbidden_origin",
    404: "not_found",
    422: "validation_error",
}


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(
    status_code: int, code: str, message: str, details: list[Any] | None = None
) -> JSONResponse:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return JSONResponse(status_code=status_code, content={"error": body})


async def _app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def _validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    # Drop "input" and "ctx" so submitted values (e.g. passwords) are never echoed.
    details = [
        {"loc": list(e.get("loc", ())), "msg": e.get("msg", ""), "type": e.get("type", "")}
        for e in exc.errors()
    ]
    return error_response(422, "validation_error", "Request validation failed.", details)


async def _http_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _STATUS_CODES.get(exc.status_code)
    if code is None:
        code = "internal_error" if exc.status_code >= 500 else "validation_error"
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return error_response(exc.status_code, code, message)


async def _unhandled_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error", exc_info=exc)
    return error_response(500, "internal_error", "Internal server error.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_handler)
