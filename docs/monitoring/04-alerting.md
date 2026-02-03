# Alerting

> Alert rules, escalation, and on-call procedures.

---

## Alert Rules

```yaml
# prometheus-rules.yaml
groups:
  - name: pantry-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"

      - alert: APIDown
        expr: up{job="pantry-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API service is down"

  - name: pantry-warning
    rules:
      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 2 seconds"

      - alert: HighMemoryUsage
        expr: container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage above 85%"
```

---

## Severity Levels

| Severity | Response Time | Notification      |
| -------- | ------------- | ----------------- |
| Critical | Immediate     | PagerDuty + Slack |
| Warning  | 30 minutes    | Slack             |
| Info     | Next business | Email digest      |

---

## Alertmanager Config

```yaml
route:
  receiver: "default"
  routes:
    - match:
        severity: critical
      receiver: "pagerduty"
    - match:
        severity: warning
      receiver: "slack"

receivers:
  - name: "slack"
    slack_configs:
      - api_url: "https://hooks.slack.com/services/..."
        channel: "#alerts"

  - name: "pagerduty"
    pagerduty_configs:
      - service_key: "<key>"
```

---

## Next Steps

- [Observability Overview](./01-observability.md)
- [Troubleshooting](../guides/troubleshooting.md)
