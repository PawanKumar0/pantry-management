# DevOps

Infrastructure and deployment configurations for Pantry Management System.

## Structure

```
devops/
├── docker/                 # Docker configurations
│   ├── Dockerfile.server   # Node.js server image
│   ├── docker-compose.yml  # Local development cluster
│   └── docker-compose.prod.yml
│
├── k8s/                    # Kubernetes manifests
│   ├── base/               # Base configurations
│   ├── overlays/           # Environment-specific
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── scripts/
│
└── scripts/                # Helper scripts
    ├── setup.sh
    └── deploy.sh
```

## Local Development

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Services

| Service  | Port      | Description           |
| -------- | --------- | --------------------- |
| api      | 3000      | Node.js API server    |
| postgres | 5432      | PostgreSQL database   |
| redis    | 6379      | Redis cache           |
| minio    | 9000/9001 | S3-compatible storage |

## Cloud Deployment

### Azure Kubernetes Service (AKS)

```bash
# Create AKS cluster
az aks create -n pantry-cluster -g pantry-rg

# Deploy
kubectl apply -k k8s/overlays/prod
```

### AWS EKS

```bash
# Create EKS cluster
eksctl create cluster --name pantry-cluster

# Deploy
kubectl apply -k k8s/overlays/prod
```

## CI/CD

GitHub Actions workflows provided for:

- Build & test on PR
- Deploy to staging on merge
- Deploy to production on release
