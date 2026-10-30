from collections.abc import Awaitable, Callable

from fastapi import Request, Response

from app.core.errors import error_response

UNSAFE_METHODS = {"POST", "PUT", "DELETE", "PATCH"}


async def origin_check(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if request.method in UNSAFE_METHODS:
        origin = request.headers.get("origin")
        if origin is not None and origin not in request.app.state.settings.allowed_origins_list:
            return error_response(403, "forbidden_origin", "Origin not allowed.")
    return await call_next(request)
