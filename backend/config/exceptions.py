from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled exception in view", exc_info=exc)
        return Response(
            {"error": "An unexpected error occurred. Please try again.", "code": "INTERNAL_ERROR"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Normalize DRF's varied error shapes into a consistent envelope
    data = response.data

    if isinstance(data, dict):
        if "detail" in data:
            response.data = {"error": str(data["detail"]), "code": _get_code(data)}
        elif any(isinstance(v, list) for v in data.values()):
            # Validation errors - field-level
            response.data = {
                "error": "Validation failed.",
                "code": "VALIDATION_ERROR",
                "fields": {k: v[0] if isinstance(v, list) else v for k, v in data.items()},
            }
    elif isinstance(data, list):
        response.data = {"error": data[0] if data else "Unknown error.", "code": "ERROR"}

    return response


def _get_code(data):
    code = data.get("detail", {})
    if hasattr(code, "code"):
        return code.code.upper()
    return "ERROR"
