"""
Rate Limiting Middleware

Uses an in-memory sliding-window counter per client IP.
Suitable for single-process deployments.  For multi-process or
distributed setups, replace the in-memory store with Redis.

When the limit is exceeded, a 429 response is returned with a
``Retry-After`` header indicating when the client may retry.
"""

import time
import logging
from collections import defaultdict
from typing import Dict, List

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.utils.helpers import build_error_response

logger = logging.getLogger("farmhelp.ratelimit")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter keyed by client IP address.

    Args:
        app: The ASGI application.
        max_requests: Maximum number of requests allowed per window.
        window_seconds: Duration of the sliding window in seconds.
        exclude_paths: URL path prefixes exempt from rate limiting
                       (e.g. health checks, docs).
    """

    def __init__(
        self,
        app,
        max_requests: int = 60,
        window_seconds: int = 60,
        exclude_paths: tuple = ("/docs", "/redoc", "/openapi.json", "/health"),
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exclude_paths = exclude_paths
        # ip -> list of request timestamps
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def _cleanup(self, ip: str, now: float) -> None:
        """Remove timestamps outside the current window."""
        cutoff = now - self.window_seconds
        self._requests[ip] = [
            ts for ts in self._requests[ip] if ts > cutoff
        ]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Skip rate limiting for excluded paths
        if any(path.startswith(prefix) for prefix in self.exclude_paths):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        self._cleanup(client_ip, now)

        current_count = len(self._requests[client_ip])
        remaining = max(0, self.max_requests - current_count)

        if current_count >= self.max_requests:
            # Calculate retry-after based on earliest timestamp in window
            earliest = self._requests[client_ip][0] if self._requests[client_ip] else now
            retry_after = int(self.window_seconds - (now - earliest)) + 1

            request_id = getattr(request.state, "request_id", None)
            logger.warning(
                "Rate limit exceeded | request_id=%s client=%s count=%s",
                request_id,
                client_ip,
                current_count,
            )

            body = build_error_response(
                error_code="RATE_LIMIT_EXCEEDED",
                message="Too many requests. Please try again later.",
                status_code=429,
                detail=f"Limit: {self.max_requests} requests per {self.window_seconds}s",
                request_id=request_id,
            )
            response = JSONResponse(status_code=429, content=body)
            response.headers["Retry-After"] = str(retry_after)
            response.headers["X-RateLimit-Limit"] = str(self.max_requests)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(int(earliest + self.window_seconds))
            return response

        # Record the request
        self._requests[client_ip].append(now)

        response = await call_next(request)

        # Attach rate-limit info headers
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining - 1 if remaining > 0 else 0)
        return response
