# backend/app/services/metrics.py
"""
Lightweight in-memory metrics tracking for API, DB, and HA calls.
Uses counters that reset periodically - no database overhead.
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from threading import Lock
from typing import Any

# Thread-safe lock for counter updates
_lock = Lock()

# Time window for metrics (5 minutes)
WINDOW_SECONDS = 300


@dataclass
class MetricsBucket:
    """Stores metrics for a time window."""
    start_time: datetime = field(default_factory=datetime.utcnow)
    api_requests: int = 0
    api_errors: int = 0
    db_queries: int = 0
    db_errors: int = 0
    ha_pushes: int = 0
    ha_push_errors: int = 0
    webhook_received: int = 0
    response_times: list = field(default_factory=list)

    # Per-endpoint tracking
    endpoint_counts: dict = field(default_factory=lambda: defaultdict(int))

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.start_time + timedelta(seconds=WINDOW_SECONDS)


# Current and previous buckets for comparison
_current_bucket = MetricsBucket()
_previous_bucket: MetricsBucket | None = None


def _rotate_if_needed():
    """Rotate buckets if current one expired."""
    global _current_bucket, _previous_bucket
    if _current_bucket.is_expired():
        _previous_bucket = _current_bucket
        _current_bucket = MetricsBucket()


def track_api_request(endpoint: str, success: bool = True, response_time_ms: float = 0):
    """Track an API request."""
    with _lock:
        _rotate_if_needed()
        _current_bucket.api_requests += 1
        if not success:
            _current_bucket.api_errors += 1
        if response_time_ms > 0:
            _current_bucket.response_times.append(response_time_ms)
        _current_bucket.endpoint_counts[endpoint] += 1


def track_db_query(success: bool = True):
    """Track a database query."""
    with _lock:
        _rotate_if_needed()
        _current_bucket.db_queries += 1
        if not success:
            _current_bucket.db_errors += 1


def track_ha_push(success: bool = True):
    """Track a Home Assistant webhook push."""
    with _lock:
        _rotate_if_needed()
        _current_bucket.ha_pushes += 1
        if not success:
            _current_bucket.ha_push_errors += 1


def track_webhook_received():
    """Track an incoming webhook from Enode."""
    with _lock:
        _rotate_if_needed()
        _current_bucket.webhook_received += 1


def get_metrics() -> dict[str, Any]:
    """Get current metrics snapshot."""
    with _lock:
        _rotate_if_needed()

        # Calculate averages
        avg_response_time = 0
        if _current_bucket.response_times:
            avg_response_time = sum(_current_bucket.response_times) / len(_current_bucket.response_times)

        # Calculate rates (per minute)
        elapsed = (datetime.utcnow() - _current_bucket.start_time).total_seconds()
        elapsed_min = max(elapsed / 60, 0.1)  # Avoid division by zero

        # Get top endpoints
        top_endpoints = sorted(
            _current_bucket.endpoint_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        current = {
            "window_start": _current_bucket.start_time.isoformat(),
            "window_seconds": int(elapsed),
            "api_requests": _current_bucket.api_requests,
            "api_errors": _current_bucket.api_errors,
            "api_requests_per_min": round(_current_bucket.api_requests / elapsed_min, 1),
            "db_queries": _current_bucket.db_queries,
            "db_errors": _current_bucket.db_errors,
            "db_queries_per_min": round(_current_bucket.db_queries / elapsed_min, 1),
            "ha_pushes": _current_bucket.ha_pushes,
            "ha_push_errors": _current_bucket.ha_push_errors,
            "webhook_received": _current_bucket.webhook_received,
            "webhook_per_min": round(_current_bucket.webhook_received / elapsed_min, 1),
            "avg_response_time_ms": round(avg_response_time, 1),
            "top_endpoints": [{"endpoint": e, "count": c} for e, c in top_endpoints],
        }

        # Add previous window comparison if available
        previous = None
        if _previous_bucket:
            prev_elapsed_min = WINDOW_SECONDS / 60
            previous = {
                "window_start": _previous_bucket.start_time.isoformat(),
                "api_requests": _previous_bucket.api_requests,
                "api_requests_per_min": round(_previous_bucket.api_requests / prev_elapsed_min, 1),
                "db_queries": _previous_bucket.db_queries,
                "ha_pushes": _previous_bucket.ha_pushes,
                "webhook_received": _previous_bucket.webhook_received,
            }

        return {
            "current": current,
            "previous": previous,
            "uptime_seconds": int((datetime.utcnow() - _current_bucket.start_time).total_seconds()),
        }
