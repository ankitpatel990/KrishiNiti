"""
Request ID Middleware

Attaches a unique request ID to every incoming request so that all
log lines and error responses can be correlated.  The ID is set on
``request.state.request_id`` and returned in the ``X-Request-ID``
response header.
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.utils.helpers import generate_request_id


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject a unique request ID into every request/response cycle."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Prefer a client-supplied header; fall back to generated ID.
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
