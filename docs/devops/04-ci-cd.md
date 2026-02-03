# CI/CD Pipeline with GitHub Actions

> Automated build, test, and deployment pipeline.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CI/CD PIPELINE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Push/PR                                                                    │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐       │
│  │  Lint   │──▶│  Test   │──▶│  Build  │──▶│  Push   │──▶│ Deploy  │       │
│  │ & Scan  │   │ (Unit)  │   │ Docker  │   │  ACR    │   │  K8s    │       │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Triggers:                                                                  │
│  • main branch → Production                                                 │
│  • develop branch → Staging                                                 │
│  • Pull Requests → Test only                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Secrets Required

```yaml
# Repository Settings → Secrets → Actions
AZURE_CREDENTIALS: '{ "clientId": "...", "clientSecret": "...", ... }'
ACR_LOGIN_SERVER: myregistry.azurecr.io
ACR_USERNAME: serviceprinciple-id
ACR_PASSWORD: serviceprinciple-password
KUBE_CONFIG: base64-encoded kubeconfig
DATABASE_URL: postgresql://...
JWT_SECRET: your-secret
```

---

## Main CI/CD Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ${{ secrets.ACR_LOGIN_SERVER }}
  IMAGE_NAME: pantry-api

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # LINT & SECURITY SCAN
  # ═══════════════════════════════════════════════════════════════════════════
  lint:
    name: Lint & Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        working-directory: server
        run: npm ci

      - name: Run ESLint
        working-directory: server
        run: npm run lint

      - name: Run security audit
        working-directory: server
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Check TypeScript
        working-directory: server
        run: npx tsc --noEmit

  # ═══════════════════════════════════════════════════════════════════════════
  # UNIT TESTS
  # ═══════════════════════════════════════════════════════════════════════════
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: pantry_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        working-directory: server
        run: npm ci

      - name: Generate Prisma client
        working-directory: server
        run: npx prisma generate

      - name: Run migrations
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pantry_test
        run: npx prisma migrate deploy

      - name: Run tests
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/pantry_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret
          NODE_ENV: test
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: server/coverage/lcov.info
          fail_ci_if_error: false

  # ═══════════════════════════════════════════════════════════════════════════
  # BUILD DOCKER IMAGE
  # ═══════════════════════════════════════════════════════════════════════════
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'

    outputs:
      version: ${{ steps.meta.outputs.version }}

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: server
          file: devops/Dockerfile.server
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ═══════════════════════════════════════════════════════════════════════════
  # DEPLOY TO STAGING
  # ═══════════════════════════════════════════════════════════════════════════
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Set kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Deploy to staging
        working-directory: devops/k8s
        run: |
          kubectl apply -k overlays/staging
          kubectl set image deployment/pantry-api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build.outputs.version }} \
            -n pantry-staging
          kubectl rollout status deployment/pantry-api -n pantry-staging --timeout=300s

  # ═══════════════════════════════════════════════════════════════════════════
  # DEPLOY TO PRODUCTION
  # ═══════════════════════════════════════════════════════════════════════════
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Set kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Deploy to production
        working-directory: devops/k8s
        run: |
          kubectl apply -k overlays/production
          kubectl set image deployment/pantry-api \
            api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ needs.build.outputs.version }} \
            -n pantry
          kubectl rollout status deployment/pantry-api -n pantry --timeout=300s

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: "deployments"
          payload: |
            {
              "text": "🔴 Production deployment failed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployment of `${{ env.IMAGE_NAME }}:${{ needs.build.outputs.version }}` to production failed."
                  }
                }
              ]
            }
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_TOKEN }}

  # ═══════════════════════════════════════════════════════════════════════════
  # POST-DEPLOY VERIFICATION
  # ═══════════════════════════════════════════════════════════════════════════
  verify:
    name: Verify Deployment
    runs-on: ubuntu-latest
    needs: [deploy-staging, deploy-production]
    if: always() && (needs.deploy-staging.result == 'success' || needs.deploy-production.result == 'success')

    steps:
      - name: Health check
        run: |
          ENDPOINT="${{ github.ref == 'refs/heads/main' && 'https://api.pantry.example.com' || 'https://staging-api.pantry.example.com' }}"

          for i in {1..5}; do
            if curl -sf "$ENDPOINT/health" > /dev/null; then
              echo "✅ Health check passed"
              exit 0
            fi
            echo "Attempt $i failed, retrying..."
            sleep 10
          done

          echo "❌ Health check failed"
          exit 1
```

---

## Flutter App CI

```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI

on:
  push:
    paths:
      - "apps/pantry_app/**"
  pull_request:
    paths:
      - "apps/pantry_app/**"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.16.0"
          cache: true

      - name: Install dependencies
        working-directory: apps/pantry_app
        run: flutter pub get

      - name: Analyze
        working-directory: apps/pantry_app
        run: flutter analyze

      - name: Run tests
        working-directory: apps/pantry_app
        run: flutter test --coverage

      - name: Build APK
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        working-directory: apps/pantry_app
        run: flutter build apk --release

      - name: Upload APK
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: apps/pantry_app/build/app/outputs/flutter-apk/app-release.apk
```

---

## Setup Instructions

### 1. Azure Service Principal

```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-actions-pantry" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/pantry-rg \
  --sdk-auth

# Grant ACR push permission
az role assignment create \
  --assignee {service-principal-id} \
  --role AcrPush \
  --scope /subscriptions/{subscription-id}/resourceGroups/pantry-rg/providers/Microsoft.ContainerRegistry/registries/pantryacr
```

### 2. Get Kubeconfig

```bash
# Get kubeconfig and encode
az aks get-credentials --resource-group pantry-rg --name pantry-aks --file kubeconfig
cat kubeconfig | base64 -w 0  # Copy this to KUBE_CONFIG secret
```

### 3. Add Secrets to GitHub

```bash
# Using GitHub CLI
gh secret set ACR_LOGIN_SERVER --body "pantryacr.azurecr.io"
gh secret set ACR_USERNAME --body "$(az acr credential show --name pantryacr --query username -o tsv)"
gh secret set ACR_PASSWORD --body "$(az acr credential show --name pantryacr --query passwords[0].value -o tsv)"
gh secret set KUBE_CONFIG --body "$(cat kubeconfig | base64 -w 0)"
```

---

## Branch Protection Rules

```yaml
# Recommended settings for main branch
main:
  require_pull_request: true
  required_reviews: 1
  require_status_checks:
    - lint
    - test
  enforce_admins: true

develop:
  require_pull_request: true
  require_status_checks:
    - lint
    - test
```

---

## Next Steps

- [Kubernetes Deep Dive](./03-kubernetes.md)
- [Monitoring & Observability](../monitoring/01-observability.md)
