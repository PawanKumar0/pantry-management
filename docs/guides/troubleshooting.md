# Troubleshooting Guide

> Common issues and solutions for the Pantry Management System.

---

## Quick Diagnosis

```bash
# Check pod status
kubectl get pods -n pantry

# Check events
kubectl get events -n pantry --sort-by='.lastTimestamp'

# Check logs
kubectl logs -n pantry -l app=pantry-api --tail=100 -f
```

---

## Common Issues

### 1. Pod CrashLoopBackOff

**Symptoms:** Pod repeatedly restarts

**Diagnosis:**

```bash
kubectl describe pod <pod-name> -n pantry
kubectl logs <pod-name> -n pantry --previous
```

**Common Causes:**

- Missing environment variables
- Database connection failure
- Invalid configuration

**Solution:**

```bash
# Check secrets are created
kubectl get secrets -n pantry

# Check environment
kubectl exec -it <pod-name> -n pantry -- env | grep DATABASE
```

---

### 2. Database Connection Refused

**Symptoms:** `ECONNREFUSED` errors in logs

**Diagnosis:**

```bash
# Check PostgreSQL pod
kubectl get pods -n pantry -l app=postgres

# Test connectivity from API pod
kubectl exec -it <api-pod> -n pantry -- nc -zv postgres 5432
```

**Solution:**

```bash
# Check PostgreSQL logs
kubectl logs -n pantry -l app=postgres

# Check service
kubectl get svc postgres -n pantry
```

---

### 3. 502 Bad Gateway

**Symptoms:** Ingress returns 502 errors

**Diagnosis:**

```bash
# Check nginx ingress logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Check service endpoints
kubectl get endpoints pantry-api -n pantry
```

**Solution:**

- Verify health check endpoint is working
- Check if pods are ready
- Verify service selector matches pod labels

---

### 4. TLS Certificate Issues

**Symptoms:** Certificate errors in browser

**Diagnosis:**

```bash
# Check certificate status
kubectl get certificate -n pantry

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

**Solution:**

```bash
# Force certificate renewal
kubectl delete certificate pantry-tls -n pantry
kubectl apply -f devops/k8s/base/ingress.yaml
```

---

### 5. Out of Memory (OOMKilled)

**Symptoms:** Pod killed with OOMKilled reason

**Diagnosis:**

```bash
kubectl describe pod <pod-name> -n pantry | grep -A5 "Last State"
```

**Solution:**

```yaml
# Increase memory limits in deployment
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"
```

---

### 6. Slow API Responses

**Symptoms:** Requests taking > 2 seconds

**Diagnosis:**

```bash
# Check database query logs
kubectl exec -it postgres-0 -n pantry -- psql -U pantry -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"
```

**Solutions:**

- Add missing database indexes
- Increase connection pool size
- Enable query caching in Redis

---

### 7. Redis Connection Issues

**Symptoms:** Cache misses, session errors

**Diagnosis:**

```bash
# Check Redis pod
kubectl get pods -n pantry -l app=redis

# Test Redis connection
kubectl exec -it <api-pod> -n pantry -- redis-cli -h redis ping
```

**Solution:**

```bash
# Check Redis logs
kubectl logs -n pantry -l app=redis

# Restart Redis
kubectl rollout restart deployment/redis -n pantry
```

---

## Health Checks

### API Health

```bash
curl https://api.your-domain.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-02-01T12:00:00Z",
  "checks": {
    "database": "fulfilled",
    "cache": "fulfilled"
  }
}
```

### Database Health

```bash
kubectl exec -it postgres-0 -n pantry -- psql -U pantry -c "SELECT 1"
```

### Redis Health

```bash
kubectl exec -it <redis-pod> -n pantry -- redis-cli ping
```

---

## Log Analysis

### Error Patterns

```bash
# Find 5xx errors
kubectl logs -n pantry -l app=pantry-api | grep -E "status.*5[0-9]{2}"

# Find slow queries
kubectl logs -n pantry -l app=pantry-api | grep "slow query"

# Find authentication failures
kubectl logs -n pantry -l app=pantry-api | grep "unauthorized"
```

### Structured Log Queries (Loki)

```logql
{app="pantry-api"} |= "error" | json | level="error"
```

---

## Recovery Procedures

### Database Recovery

```bash
# Restore from backup
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-restore
  namespace: pantry
spec:
  template:
    spec:
      containers:
        - name: restore
          image: postgres:16
          command: ['pg_restore', '-d', 'pantry', '/backup/latest.dump']
      restartPolicy: Never
EOF
```

### Full Cluster Recovery

```bash
# Redeploy everything
kubectl delete namespace pantry
kubectl apply -k devops/k8s/overlays/production
```

---

## Support

For additional help:

1. Check the [Monitoring Dashboard](../monitoring/01-observability.md)
2. Review [Deployment Guide](./deployment.md)
3. Contact the platform team
