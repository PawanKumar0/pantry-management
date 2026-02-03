# Cloud Provider Comparison

> Choosing the right cloud provider for Kubernetes deployment with free tier considerations.

---

## Quick Comparison

| Feature                 | Azure AKS         | AWS EKS                | Google GKE                 |
| ----------------------- | ----------------- | ---------------------- | -------------------------- |
| **Control Plane Cost**  | FREE              | $72/month              | FREE (Autopilot: $0.10/hr) |
| **Free Tier VMs**       | B1s (1 vCPU, 1GB) | t2.micro (1 vCPU, 1GB) | e2-micro (0.25 vCPU, 1GB)  |
| **Free Credits**        | $200 (30 days)    | None (Free tier)       | $300 (90 days)             |
| **Student Credits**     | $100/year         | $100 AWS Educate       | $300 + extras              |
| **Startup Program**     | Up to $120K       | Up to $100K            | Up to $200K                |
| **Min Production Cost** | ~$50/month        | ~$120/month            | ~$75/month                 |

---

## Azure Kubernetes Service (AKS)

### Free Tier Details

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AZURE FREE TIER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ✓ AKS Control Plane: FREE forever                                      │
│  ✓ B1s VM: 750 hours/month FREE (12 months)                             │
│  ✓ 5 GB Blob Storage                                                    │
│  ✓ 250 GB SQL Database (12 months)                                      │
│  ✓ 15 GB outbound data transfer                                         │
│                                                                          │
│  NEW ACCOUNT BONUS:                                                      │
│  • $200 credit (expires in 30 days)                                     │
│  • 12 months of popular services                                        │
│  • 55+ always-free services                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Setup for Free Tier

```yaml
# Azure AKS - Minimal Free Configuration
Cluster:
  - Control Plane: Free (always)
  - Node Pool: 2x B2s VMs ($15/month each)
  - Region: East US 2 (cheapest)

Storage:
  - Azure Disk: 32 GB Standard SSD
  - Blob Storage: 5 GB (for backups)

Database:
  - Azure Database for PostgreSQL (Burstable B1ms): ~$12/month
  - OR use PostgreSQL in cluster (free but less reliable)

Total: ~$45-50/month after free credits
```

### Azure Student/Startup Programs

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AZURE FOR STUDENTS                                                      │
│  • $100 credit (no credit card required)                                │
│  • Renewable each year while student                                    │
│  • https://azure.microsoft.com/free/students                           │
├─────────────────────────────────────────────────────────────────────────┤
│  MICROSOFT FOR STARTUPS                                                  │
│  • Up to $120,000 in credits                                            │
│  • Free developer tools (VS Enterprise, M365)                           │
│  • Technical support                                                    │
│  • https://startups.microsoft.com                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## AWS Elastic Kubernetes Service (EKS)

### Free Tier Details

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AWS FREE TIER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ✗ EKS Control Plane: $0.10/hour ($72/month) - NOT FREE                 │
│  ✓ EC2 t2.micro: 750 hours/month (12 months)                            │
│  ✓ RDS db.t2.micro: 750 hours/month (12 months)                         │
│  ✓ S3: 5 GB storage                                                     │
│  ✓ ElastiCache: 750 hours t2.micro (12 months)                          │
│  ✓ Lambda: 1 million requests/month                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cost-Effective Alternative: ECS/Fargate

```yaml
# AWS ECS Fargate - Pay per use
Configuration:
  - Task Definition: 0.25 vCPU, 0.5 GB RAM
  - Spot Instances: Up to 70% savings
  - Cost: ~$10-15/month for small workloads

# OR use EC2 directly (no Kubernetes)
EC2 Setup:
  - 1x t3.small: $15/month
  - Docker Compose for orchestration
  - Great for MVP/development
```

### AWS Activate for Startups

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AWS ACTIVATE                                                            │
│  Founders: $1,000 credit (self-serve)                                   │
│  Portfolio: $10,000-$100,000 (via accelerator/VC)                       │
│  https://aws.amazon.com/activate                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  AWS EDUCATE                                                             │
│  Students: $100 credit                                                  │
│  No credit card required                                                │
│  https://aws.amazon.com/education                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Google Kubernetes Engine (GKE)

### Free Tier Details

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GCP FREE TIER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ✓ GKE Autopilot: Control plane FREE (pay per pod)                      │
│  ✓ 1x e2-micro: Always FREE (0.25 vCPU, 1GB)                            │
│  ✓ Cloud SQL: $0 for 30 days trial                                      │
│  ✓ Cloud Storage: 5 GB                                                  │
│  ✓ Cloud Run: 2 million requests/month                                  │
│  ✓ BigQuery: 1 TB queries/month                                         │
│                                                                          │
│  NEW ACCOUNT:                                                            │
│  • $300 credit (expires in 90 days)                                     │
│  • No auto-charge after trial                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### GKE Autopilot (Recommended)

```yaml
# GKE Autopilot - Only pay for pods
Benefits:
  - No node management
  - Automatic scaling
  - Per-pod billing
  - Built-in security

Pricing:
  - vCPU: $0.0445/hour
  - Memory: $0.0049/GB/hour
  - Example: 1 pod (0.5 vCPU, 1GB) = ~$19/month
```

### Google Cloud for Startups

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GOOGLE CLOUD FOR STARTUPS                                               │
│  • Up to $200,000 in credits over 2 years                               │
│  • 24/7 technical support                                               │
│  • https://cloud.google.com/startup                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  GOOGLE CLOUD SKILLS BOOST / QWIKLABS                                    │
│  • Free hands-on labs                                                   │
│  • Monthly credits for practice                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Recommendation for Pantry System

### Phase 1: MVP/Development (FREE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OPTION A: Azure (Recommended)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  • Create free Azure account ($200 credit)                              │
│  • Or use Azure for Students ($100/year)                                │
│  • AKS with 2-node B2s pool                                             │
│  • PostgreSQL hosted in cluster                                         │
│  • Redis in cluster                                                     │
│                                                                          │
│  Cost: $0 for first month, ~$35/month after                             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  OPTION B: GCP ($300 credit for 90 days)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  • GKE Autopilot (pay per pod)                                          │
│  • Cloud SQL PostgreSQL                                                 │
│  • Memorystore Redis                                                    │
│                                                                          │
│  Cost: $0 for 90 days with credit                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Production

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AZURE PRODUCTION SETUP                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  AKS Cluster:                                                           │
│  • Control Plane: Free                                                  │
│  • 3x B2s nodes: $45/month                                              │
│  • Application Gateway: $20/month (or use NGINX Ingress - free)         │
│                                                                          │
│  Database:                                                              │
│  • Azure PostgreSQL Flexible (Burstable): $12/month                     │
│                                                                          │
│  Cache:                                                                 │
│  • Azure Cache for Redis (Basic C0): $16/month                          │
│                                                                          │
│  Storage:                                                               │
│  • Blob Storage: ~$2/month                                              │
│                                                                          │
│  TOTAL: ~$95/month                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Optimization Tips

### 1. Use Spot/Preemptible Instances

```yaml
# Save 60-80% on compute
Azure:  Spot VMs
AWS:    Spot Instances
GCP:    Preemptible VMs

# Works well for:
- Development environments
- Batch processing
- Stateless workloads with replicas
```

### 2. Right-Size Your Workloads

```yaml
# Start small, scale up
Initial:
  API Pod: 100m CPU, 256Mi RAM

Monitor and adjust based on actual usage: Prometheus → identify P99 usage → right-size
```

### 3. Use Reserved Instances for Steady Workloads

```
┌─────────────────────────────────────────────────────┐
│  RESERVED INSTANCE SAVINGS                          │
│                                                     │
│  Azure 1-year reserved: Up to 40% savings          │
│  Azure 3-year reserved: Up to 60% savings          │
│                                                     │
│  Best for: Production database, steady workloads   │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **[Free Tier Setup Guide](./02-free-tier-setup.md)** - Step-by-step Azure/GCP setup
2. **[Kubernetes Deployment](./03-kubernetes.md)** - K8s manifests and Helm charts
