# Kubernetes Deployment Guide

> Complete Kubernetes setup for production deployment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        INGRESS NGINX                                │    │
│  │                    (External LoadBalancer)                          │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                  │                                           │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ Pantry API  │         │ Pantry API  │         │ Pantry API  │           │
│  │  (Pod 1)    │         │  (Pod 2)    │         │  (Pod N)    │           │
│  │  3000       │         │  3000       │         │  3000       │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│         │                        │                        │                 │
│         └────────────────────────┼────────────────────────┘                 │
│                                  │                                           │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │  PostgreSQL │         │    Redis    │         │ Monitoring  │           │
│  │  (StatefulSet)        │ (Deployment)│         │   Stack     │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
devops/k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── api-deployment.yaml
│   ├── api-service.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── ingress.yaml
├── overlays/
│   ├── dev/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── hpa.yaml
│       └── pdb.yaml
└── monitoring/
    ├── prometheus-values.yaml
    └── service-monitor.yaml
```

---

## Base Manifests

### Namespace

```yaml
# devops/k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pantry
  labels:
    name: pantry
```

### ConfigMap

```yaml
# devops/k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pantry-config
  namespace: pantry
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
```

### Secrets (Template)

```yaml
# devops/k8s/base/secrets.yaml
# In production, use External Secrets or Sealed Secrets
apiVersion: v1
kind: Secret
metadata:
  name: pantry-secrets
  namespace: pantry
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/pantry"
  JWT_SECRET: "your-jwt-secret"
  JWT_REFRESH_SECRET: "your-refresh-secret"
  AZURE_CLIENT_ID: ""
  AZURE_CLIENT_SECRET: ""
  AZURE_TENANT_ID: ""
  GOOGLE_CLIENT_ID: ""
  GOOGLE_CLIENT_SECRET: ""
```

### API Deployment

```yaml
# devops/k8s/base/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pantry-api
  namespace: pantry
  labels:
    app: pantry-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pantry-api
  template:
    metadata:
      labels:
        app: pantry-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: api
          image: pantry-api:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
          envFrom:
            - configMapRef:
                name: pantry-config
            - secretRef:
                name: pantry-secrets
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
      terminationGracePeriodSeconds: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: pantry-api
                topologyKey: kubernetes.io/hostname
```

### API Service

```yaml
# devops/k8s/base/api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: pantry-api
  namespace: pantry
  labels:
    app: pantry-api
spec:
  type: ClusterIP
  selector:
    app: pantry-api
  ports:
    - name: http
      port: 80
      targetPort: 3000
```

### PostgreSQL StatefulSet

```yaml
# devops/k8s/base/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: pantry
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: pantry
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-premium
        resources:
          requests:
            storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: pantry
spec:
  type: ClusterIP
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

### Redis Deployment

```yaml
# devops/k8s/base/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: pantry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
            - --maxmemory
            - 256mb
            - --maxmemory-policy
            - allkeys-lru
            - --appendonly
            - "yes"
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          volumeMounts:
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: pantry
spec:
  type: ClusterIP
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

### Ingress

```yaml
# devops/k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pantry-ingress
  namespace: pantry
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.pantry.example.com
      secretName: pantry-tls
  rules:
    - host: api.pantry.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: pantry-api
                port:
                  number: 80
```

---

## Production Overlays

### Horizontal Pod Autoscaler

```yaml
# devops/k8s/overlays/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pantry-api-hpa
  namespace: pantry
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pantry-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

### Pod Disruption Budget

```yaml
# devops/k8s/overlays/production/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: pantry-api-pdb
  namespace: pantry
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: pantry-api
```

### Kustomization

```yaml
# devops/k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: pantry

resources:
  - ../../base
  - hpa.yaml
  - pdb.yaml

images:
  - name: pantry-api
    newName: myregistry.azurecr.io/pantry-api
    newTag: v1.2.3

patches:
  - patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
    target:
      kind: Deployment
      name: pantry-api

configMapGenerator:
  - name: pantry-config
    behavior: merge
    literals:
      - LOG_LEVEL=warn
```

---

## Deployment Commands

```bash
# Apply to development
kubectl apply -k devops/k8s/overlays/dev

# Apply to production
kubectl apply -k devops/k8s/overlays/production

# Check rollout status
kubectl rollout status deployment/pantry-api -n pantry

# Rollback if needed
kubectl rollout undo deployment/pantry-api -n pantry

# View pods
kubectl get pods -n pantry -w

# View logs
kubectl logs -f -l app=pantry-api -n pantry

# Port forward for debugging
kubectl port-forward svc/pantry-api 3000:80 -n pantry
```

---

## Next Steps

- [CI/CD Pipeline](./04-ci-cd.md)
- [Monitoring Setup](../monitoring/01-observability.md)
