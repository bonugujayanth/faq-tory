Monitoring and Alerting Setup for Dynamic FAQ Builder

This document describes the lightweight built-in monitoring, how to configure alert delivery to a DevOps webhook, and how to create a simple Grafana dashboard using the provided endpoints.

What the app provides

- In-memory AlertManager: stores recent alerts (last 100) and logs to console.
- 5xx spike detection: the app tracks recent HTTP responses and emits a critical alert when 5xx responses exceed a threshold within a sliding window.
- Rate limiter stats: available at `/api/monitor/rate` (admin only).
- 5xx stats and alerts: available at `/api/monitor/5xx` (admin only).

Configuration (environment variables)

- ALERT_WINDOW_SECONDS: integer number of seconds used as sliding window for 5xx spike detection (default: 60).
- ALERT_5XX_THRESHOLD: integer number of 5xx responses inside the window that triggers a critical alert (default: 10).
- DEVOPS_ALERT_WEBHOOK: optional HTTP(S) webhook URL where critical alerts will be POSTed. If set, the app will attempt to deliver JSON payloads to this URL when critical alerts are raised.

How 5xx spike detection works

- Every HTTP response is recorded in a short in-memory buffer.
- On each response finish the buffer is pruned to the configured window. If the number of 5xx responses in the window reaches the threshold and a recent alert hasn't been sent (cooldown == window), a critical alert is created.
- The alert contains: level (critical), source (`monitor.5xx`), message, and data with `count5xx` and `windowSeconds`.
- If `DEVOPS_ALERT_WEBHOOK` is configured (or a custom notifier is attached programmatically), the alert is delivered asynchronously.

DevOps webhook payload

The webhook receives a POST with a JSON body similar to:

{
  "alert": {
    "id": 123,
    "timestamp": "2025-11-17T...",
    "level": "critical",
    "source": "monitor.5xx",
    "message": "Spike in 5xx responses: 25 in the last 60s",
    "data": { "count5xx": 25, "windowSeconds": 60 }
  }
}

Security and delivery considerations

- The built-in notifier does not sign or authenticate requests — you should protect the webhook endpoint or put it behind a secure receiver (e.g., a gateway that validates a token).
- For high-traffic applications, replace the in-memory alert manager with a durable monitoring system (Prometheus + Alertmanager, Sentry, PagerDuty).

Suggested Grafana dashboard

1. Panel: Recent 5xx count (stat)
   - Query `/api/monitor/5xx` (proxy through a secure agent) and show `count5xx` and `windowSeconds`.
2. Panel: Rate limiter usage (table)
   - Query `/api/monitor/rate` and display per-client counts and lastSeen.
3. Panel: Recent Alerts (logs)
   - Query `/api/monitor/alerts` and show recent alerts by level and source.

Note: The app exposes simple JSON endpoints for monitoring. In production you'll likely want to export metrics in Prometheus format (an improvement candidate).

Testing alert delivery

- For development or CI, tests may attach a custom notifier function (programmatically) that records delivery attempts instead of performing network calls.
- When DEVOPS_ALERT_WEBHOOK is set, the app will try to POST alerts to that URL asynchronously.

Next steps / improvements

- Add a Prometheus metrics endpoint and exporters for 5xx count, request rate, and rate-limiter usage.
- Persist alerts to a durable store for long-term retention and auditing.
- Enhance webhook delivery with retries, signing headers, and backoff.

