# Deployment Guide

> Step-by-step deployment to Azure Kubernetes Service (AKS).

---

## Prerequisites

- Azure CLI installed and authenticated
- kubectl installed
- Docker installed
- GitHub repository with secrets configured

---

## 1. Azure Resource Setup

### Create Resource Group

```bash
az group create --name pantry-rg --location eastus
```

### Create AKS Cluster

```bash
az aks create \
  --resource-group pantry-rg \
  --name pantry-aks \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys
```

### Connect to Cluster

```bash
az aks get-credentials --resource-group pantry-rg --name pantry-aks
```

### Create Container Registry

```bash
az acr create --resource-group pantry-rg --name pantryacr --sku Basic
az aks update -n pantry-aks -g pantry-rg --attach-acr pantryacr
```

---

## 2. Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace pantry

# Create secrets
kubectl create secret generic pantry-secrets \
  --namespace pantry \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='your-secret' \
  --from-literal=REDIS_URL='redis://redis:6379'
```

---

## 3. Deploy Application

### Using Kustomize

```bash
# Deploy base + production overlays
kubectl apply -k devops/k8s/overlays/production
```

### Manual Deployment

```bash
# Apply manifests in order
kubectl apply -f devops/k8s/base/namespace.yaml
kubectl apply -f devops/k8s/base/configmap.yaml
kubectl apply -f devops/k8s/base/postgres.yaml
kubectl apply -f devops/k8s/base/redis.yaml
kubectl apply -f devops/k8s/base/api-deployment.yaml
kubectl apply -f devops/k8s/base/api-service.yaml
kubectl apply -f devops/k8s/base/ingress.yaml
```

---

## 4. Install Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

---

## 5. Install Cert-Manager (TLS)

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

Create ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

---

## 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n pantry

# Check services
kubectl get svc -n pantry

# Check ingress
kubectl get ingress -n pantry

# View logs
kubectl logs -n pantry -l app=pantry-api --tail=100
```

---

## 7. Database Migration

```bash
# Run migrations in a job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate
  namespace: pantry
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: pantryacr.azurecr.io/pantry-api:latest
          command: ['npx', 'prisma', 'migrate', 'deploy']
          envFrom:
            - secretRef:
                name: pantry-secrets
      restartPolicy: Never
EOF
```

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automates:

1. **Build & Test**: On every push
2. **Docker Build**: Push to ACR on main branch
3. **Deploy**: Automatic deployment to AKS

Required GitHub Secrets:

- `AZURE_CREDENTIALS`
- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`

---

## Rollback

```bash
# Check deployment history
kubectl rollout history deployment/pantry-api -n pantry

# Rollback to previous version
kubectl rollout undo deployment/pantry-api -n pantry

# Rollback to specific revision
kubectl rollout undo deployment/pantry-api -n pantry --to-revision=2
```

---

## Next Steps

- [Troubleshooting](./troubleshooting.md)
- [Monitoring](../monitoring/01-observability.md)
