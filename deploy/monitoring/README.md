# Мониторинг Dotty

Grafana: `https://hack-kzn-11-vm1-5798eb.vm.prodcontest.com/grafana/` — дашборд **Dotty — обзор** открывается сразу, просмотр без логина.
Для редактирования — пользователь `admin`, пароль лежит на сервере в `~/app/grafana.env` (генерируется при первом деплое).

## Как устроено

| Компонент | Что делает |
|---|---|
| backend `/metrics` | `prometheus-fastapi-instrumentator`: RPS, статусы (2xx/4xx/5xx), латентность по ручкам. Наружу не открыт — nginx проксирует только `/api`. |
| backend логи | JSON в stdout: `level`, `msg`, `request_id`, `method`, `path`, `status`, `duration_ms`, трейсбек в `exc`. `X-Request-ID` возвращается в ответе. |
| Prometheus | Собирает метрики backend и сервера (node-exporter), хранит 7 дней, считает алерты из `prometheus/alerts.yml`. |
| Loki + Alloy | Alloy читает логи всех контейнеров через docker socket и шлёт в Loki с метками `service` и `level`. |
| Grafana | Источники данных и дашборд подключаются из файлов в `grafana/` при старте. |

## Алерты

BackendDown, High5xxRate (>5% ответов 5xx), HighLatencyP95 (>1 с), HostHighCPU, HostHighMemory, HostLowDisk. Видны в Grafana на дашборде (панель «Алерты») и в Explore по метрике `ALERTS`.

## Как искать причину ошибки

1. На дашборде растёт «Доля 5xx» или сработал алерт.
2. Панель «Ошибки backend» — строка с трейсбеком и `request_id`.
3. В Explore → Loki: `{service="backend"} |= "<request_id>"` — весь путь запроса.
