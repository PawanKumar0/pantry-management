# Free Tier Setup Guide

> Step-by-step guide to deploy Pantry Management System on Azure Kubernetes Service (FREE).

---

## Prerequisites

- [ ] Azure account (free or student)
- [ ] Azure CLI installed
- [ ] kubectl installed
- [ ] Helm installed
- [ ] Docker installed (for local development)

---

## Step 1: Create Azure Free Account

### Option A: Standard Free Account ($200 credit)

1. **Go to**: https://azure.microsoft.com/free/
2. **Click**: "Start free"
3. **Sign in** with Microsoft account (or create one)
4. **Verify** identity with phone number
5. **Enter** credit card (won't be charged, just verification)
6. **Get**: $200 credit valid for 30 days

### Option B: Azure for Students ($100/year - No credit card!)

1. **Go to**: https://azure.microsoft.com/free/students/
2. **Click**: "Activate now"
3. **Verify** with school email (.edu address)
4. **Get**: $100 credit, renewable each year

### Option C: Microsoft for Startups (Up to $150K)

1. **Apply at**: https://startups.microsoft.com
2. **Requirements**:
   - Startup less than 7 years old
   - Less than $10M revenue
   - Not already in the program
3. **Benefits**:
   - Up to $150,000 Azure credits
   - Free GitHub Enterprise
   - Technical support

---

## Step 2: Install Azure CLI

```bash
# macOS
brew install azure-cli

# Windows (PowerShell as Admin)
winget install Microsoft.AzureCLI

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az --version

# Login to Azure
az login
# This opens a browser for authentication
```

---

## Step 3: Create Resource Group & AKS Cluster

```bash
# Set variables
RESOURCE_GROUP="pantry-rg"
CLUSTER_NAME="pantry-aks"
LOCATION="eastus2"  # Cheapest region

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create AKS cluster (minimal config for free tier)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --generate-ssh-keys \
  --network-plugin azure \
  --load-balancer-sku basic \
  --tier free

# This takes about 5-10 minutes

# Get credentials for kubectl
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify connection
kubectl get nodes
```

### Expected Output

```
NAME                                STATUS   ROLES   AGE   VERSION
aks-nodepool1-12345678-vmss000000   Ready    agent   5m    v1.28.3
aks-nodepool1-12345678-vmss000001   Ready    agent   5m    v1.28.3
```

---

## Step 4: Install NGINX Ingress Controller (FREE)

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=1 \
  --set controller.resources.requests.cpu=50m \
  --set controller.resources.requests.memory=90Mi

# Get external IP (may take 2-3 minutes)
kubectl get svc -n ingress-nginx
```

---

## Step 5: Deploy PostgreSQL (In-Cluster)

For free tier, we'll run PostgreSQL inside the cluster instead of using Azure Database.

```yaml
# devops/k8s/postgres.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
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
                  name: postgres-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

```bash
# Create secret for PostgreSQL
kubectl create secret generic postgres-secret \
  --from-literal=username=pantry_admin \
  --from-literal=password=$(openssl rand -base64 16)

# Deploy PostgreSQL
kubectl apply -f devops/k8s/postgres.yaml

# Verify
kubectl get pods -l app=postgres
```

---

## Step 6: Deploy Redis (In-Cluster)

```yaml
# devops/k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
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
            - 128mb
            - --maxmemory-policy
            - allkeys-lru
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

```bash
kubectl apply -f devops/k8s/redis.yaml
```

---

## Step 7: Build and Push Docker Image

```bash
# Create Azure Container Registry (ACR)
ACR_NAME="pantryacr$(date +%s)"  # Unique name

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic

# Attach ACR to AKS (allows pulling images)
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --attach-acr $ACR_NAME

# Login to ACR
az acr login --name $ACR_NAME

# Build and push server image
cd server
docker build -t $ACR_NAME.azurecr.io/pantry-server:latest -f ../devops/Dockerfile.server .
docker push $ACR_NAME.azurecr.io/pantry-server:latest
```

---

## Step 8: Deploy Application

```yaml
# devops/k8s/app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pantry-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pantry-api
  template:
    metadata:
      labels:
        app: pantry-api
    spec:
      containers:
        - name: api
          image: ${ACR_NAME}.azurecr.io/pantry-server:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
            - name: REDIS_URL
              value: redis://redis:6379
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: jwt-secret
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
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: pantry-api
spec:
  selector:
    app: pantry-api
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pantry-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: pantry-api
                port:
                  number: 80
```

```bash
# Create app secrets
kubectl create secret generic app-secrets \
  --from-literal=database-url="postgresql://pantry_admin:PASSWORD@postgres:5432/pantry" \
  --from-literal=jwt-secret=$(openssl rand -base64 32)

# Deploy application
kubectl apply -f devops/k8s/app.yaml

# Run database migrations
kubectl exec -it deploy/pantry-api -- npx prisma migrate deploy

# Check deployment
kubectl get pods,svc,ingress
```

---

## Step 9: Get Your App URL

```bash
# Get the external IP of the ingress
kubectl get ingress pantry-ingress

# Output:
# NAME             CLASS    HOSTS   ADDRESS         PORTS   AGE
# pantry-ingress   <none>   *       52.234.123.45   80      5m

# Your app is now available at:
# http://52.234.123.45/api/v1/health
```

---

## Cost Summary (Free Tier)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MONTHLY COSTS WITH FREE TIER                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  AKS Control Plane:           $0    (FREE forever)                      │
│  2x B2s Nodes (2 vCPU, 4GB):  $30   (covered by $200 credit first month)│
│  Azure Disk 32GB:             $3                                        │
│  Container Registry (Basic):  $5                                        │
│  Outbound Data (15GB free):   $0                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  TOTAL:                       $38/month after credits expire            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cleanup (Stop Charges)

```bash
# Delete everything when done testing
az group delete --name $RESOURCE_GROUP --yes --no-wait

# Or just stop the cluster (keeps config, stops billing for VMs)
az aks stop --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Start again later
az aks start --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME
```

---

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Database connection issues

```bash
kubectl exec -it deploy/pantry-api -- nc -zv postgres 5432
```

### Check resource usage

```bash
kubectl top nodes
kubectl top pods
```

---

## Next Steps

1. **[Kubernetes Deep Dive](./03-kubernetes.md)** - Helm charts, HPA, secrets
2. **[CI/CD Setup](./04-ci-cd.md)** - GitHub Actions pipeline
3. **[Monitoring](../monitoring/01-observability.md)** - Prometheus & Grafana
