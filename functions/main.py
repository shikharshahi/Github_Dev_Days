from datetime import datetime, timezone

from firebase_functions import https_fn


@https_fn.on_call()
def health_check(_: https_fn.CallableRequest) -> dict[str, str | bool]:
    """Return a lightweight readiness response for the frontend."""
    return {
        "ok": True,
        "service": "firebase-functions",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@https_fn.on_request()
def health(_: https_fn.Request) -> https_fn.Response:
    """Expose a simple HTTP health check for operators and local probes."""
    return https_fn.Response(
        '{"ok":true,"service":"firebase-functions"}',
        status=200,
        content_type="application/json",
    )
