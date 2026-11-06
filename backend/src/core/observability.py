"""Наблюдаемость: JSON-логи (собираются в Loki) и Prometheus-метрики (/metrics для Grafana)."""

import json
import logging
import re
import sys
import time
import uuid
from contextvars import ContextVar
from functools import lru_cache

from fastapi import FastAPI, Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_EXTRA_FIELDS = ("method", "path", "handler", "status", "duration_ms", "client")
_SKIP_PATHS = {"/metrics"}
_LATENCY_BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)

HTTP_REQUESTS = Counter(
    "http_requests_total",
    "Количество HTTP-запросов",
    ["method", "handler", "status"],
)
HTTP_LATENCY = Histogram(
    "http_request_duration_seconds",
    "Длительность обработки HTTP-запроса",
    ["method", "handler"],
    buckets=_LATENCY_BUCKETS,
)

access_logger = logging.getLogger("app.access")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(),
        }
        for field in _EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO") -> None:
    """Все логи (наши и uvicorn) пишутся в stdout одной JSON-строкой."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
    # access-лог пишет наш middleware, с request_id и длительностью
    logging.getLogger("uvicorn.access").disabled = True


@lru_cache(maxsize=256)
def _prefix_regex(route_pattern: str) -> re.Pattern:
    # path_regex роута без префикса роутера: "^/trips/(?P<trip_id>[^/]+)$" -> ловим префикс отдельно
    return re.compile("^(?P<_prefix>.*?)" + route_pattern.removeprefix("^"))


def _route_template(request: Request) -> str:
    """Полный шаблон пути (/api/trips/{trip_id}), а не реальный URL — чтобы не раздувать число метрик."""
    route = request.scope.get("route")
    template = getattr(route, "path_format", None) or getattr(route, "path", None)
    if not template:
        return "unmatched"
    path_regex = getattr(route, "path_regex", None)
    if path_regex is not None:
        match = _prefix_regex(path_regex.pattern).match(request.url.path)
        if match:
            return match.group("_prefix") + template
    return template


def setup_observability(app: FastAPI) -> None:
    @app.middleware("http")
    async def observe_request(request: Request, call_next):
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception:
            access_logger.exception(
                "unhandled exception",
                extra={"method": request.method, "path": request.url.path},
            )
            raise
        finally:
            duration = time.perf_counter() - started
            handler = _route_template(request)
            HTTP_REQUESTS.labels(request.method, handler, f"{status // 100}xx").inc()
            HTTP_LATENCY.labels(request.method, handler).observe(duration)

            if status >= 500:
                level = logging.ERROR
            elif status >= 400:
                level = logging.WARNING
            else:
                level = logging.INFO
            access_logger.log(
                level,
                f"{request.method} {request.url.path} -> {status}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "handler": handler,
                    "status": status,
                    "duration_ms": round(duration * 1000, 1),
                    "client": request.client.host if request.client else None,
                },
            )
            request_id_var.reset(token)

    # /metrics наружу не проксируется nginx — его читает только Prometheus внутри сети compose
    async def metrics_endpoint() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.add_api_route("/metrics", metrics_endpoint, methods=["GET"], include_in_schema=False)
