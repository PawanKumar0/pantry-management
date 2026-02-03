# Grafana Dashboards

> Visualization and dashboard configuration.

---

## Access

```bash
# Port forward to Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Default credentials
# Username: admin
# Password: prom-operator (or check: kubectl get secret prometheus-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d)
```

---

## Key Dashboards

### API Overview

| Panel              | Query                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| Request Rate       | `rate(http_requests_total[5m])`                                            |
| Error Rate         | `rate(http_requests_total{status=~"5.."}[5m])`                             |
| P95 Latency        | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| Active Connections | `pg_stat_activity_count`                                                   |

### Resource Usage

| Panel     | Query                                           |
| --------- | ----------------------------------------------- |
| CPU Usage | `rate(container_cpu_usage_seconds_total[5m])`   |
| Memory    | `container_memory_working_set_bytes`            |
| Pod Count | `count(kube_pod_status_phase{phase="Running"})` |

---

## Dashboard JSON

Import the following dashboard ID from Grafana.com:

- **Node.js**: 11159
- **PostgreSQL**: 9628
- **Redis**: 11835
- **Kubernetes**: 315

---

## Next Steps

- [Alerting](./04-alerting.md)
- [Observability Overview](./01-observability.md)
