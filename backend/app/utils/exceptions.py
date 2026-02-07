"""
Custom Exception Classes

Provides a structured exception hierarchy for the Farm Help API.
All custom exceptions derive from a single base class so that the
global error handler can distinguish application-level errors from
unexpected failures.
"""

from typing import Any, Dict, Optional


class AppException(Exception):
    """
    Base exception for all application-level errors.

    Attributes:
        status_code: HTTP status code to return.
        error_code: Machine-readable error identifier (e.g. "DISEASE_NOT_FOUND").
        message: Human-readable error description.
        detail: Optional additional context.
    """

    def __init__(
        self,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred.",
        detail: Optional[str] = None,
    ) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.detail = detail
        super().__init__(message)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "error_code": self.error_code,
            "message": self.message,
            "status_code": self.status_code,
        }
        if self.detail:
            payload["detail"] = self.detail
        return payload


class NotFoundError(AppException):
    """Resource not found (HTTP 404)."""

    def __init__(
        self,
        message: str = "Requested resource not found.",
        detail: Optional[str] = None,
        error_code: str = "NOT_FOUND",
    ) -> None:
        super().__init__(
            status_code=404,
            error_code=error_code,
            message=message,
            detail=detail,
        )


class ValidationError(AppException):
    """Input validation failure (HTTP 422)."""

    def __init__(
        self,
        message: str = "Input validation failed.",
        detail: Optional[str] = None,
        error_code: str = "VALIDATION_ERROR",
    ) -> None:
        super().__init__(
            status_code=422,
            error_code=error_code,
            message=message,
            detail=detail,
        )


class ExternalAPIError(AppException):
    """External API call failure (HTTP 503)."""

    def __init__(
        self,
        message: str = "External service is temporarily unavailable.",
        detail: Optional[str] = None,
        error_code: str = "EXTERNAL_API_ERROR",
    ) -> None:
        super().__init__(
            status_code=503,
            error_code=error_code,
            message=message,
            detail=detail,
        )


class RateLimitError(AppException):
    """Rate limit exceeded (HTTP 429)."""

    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        detail: Optional[str] = None,
        error_code: str = "RATE_LIMIT_EXCEEDED",
    ) -> None:
        super().__init__(
            status_code=429,
            error_code=error_code,
            message=message,
            detail=detail,
        )


class DatabaseError(AppException):
    """Database operation failure (HTTP 500)."""

    def __init__(
        self,
        message: str = "A database error occurred.",
        detail: Optional[str] = None,
        error_code: str = "DATABASE_ERROR",
    ) -> None:
        super().__init__(
            status_code=500,
            error_code=error_code,
            message=message,
            detail=detail,
        )
