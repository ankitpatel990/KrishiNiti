"""
Request / Response Logging Middleware

Logs every HTTP request with:
- Timestamp (UTC)
- Request ID
- HTTP method and path
- Client IP
- Response status code
- Processing time in milliseconds

Errors (5xx) are logged at ERROR level; client errors (4xx) at WARNING;
everything else at INFO.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("farmhelp.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured access logging for every request/response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()

        request_id = getattr(request.state, "request_id", "-")
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        query = str(request.url.query) if request.url.query else ""

        logger.info(
            "request_start | request_id=%s method=%s path=%s query=%s client=%s",
            request_id,
            method,
            path,
            query,
            client_ip,
        )

        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "request_error | request_id=%s method=%s path=%s time_ms=%s",
                request_id,
                method,
                path,
                elapsed_ms,
            )
            raise

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        status_code = response.status_code

        log_msg = (
            "request_end | request_id=%s method=%s path=%s "
            "status=%s time_ms=%s client=%s"
        )
        log_args = (request_id, method, path, status_code, elapsed_ms, client_ip)

        if status_code >= 500:
            logger.error(log_msg, *log_args)
        elif status_code >= 400:
            logger.warning(log_msg, *log_args)
        else:
            logger.info(log_msg, *log_args)

        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
        return response
