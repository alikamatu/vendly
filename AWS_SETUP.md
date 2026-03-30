# Vendly AWS Hosting Setup Guide

## Architecture Summary

| Layer | Service | Why |
|---|---|---|
| Web (Next.js) | AWS Amplify | Native Next.js support, auto CI/CD, free SSL |
| API (NestJS) | AWS App Runner | Managed containers, autoscale, no EC2 to babysit |
| Database | Amazon RDS (PostgreSQL 16) | Managed Postgres, automated backups |
| Cache | Amazon ElastiCache (Redis 7) | Drop-in replacement for your current Redis setup |
| Container registry | Amazon ECR | Stores Docker images for App Runner |
| Secrets | AWS Secrets Manager | Stores env vars securely (never in code) |

---

## Step 1 — Create a VPC

RDS and ElastiCache must be inside a private VPC so they're never exposed to the internet.

1. Go to **VPC → Create VPC**
2. Select **VPC and more** (creates subnets + route tables automatically)
3. Name: `vendly-vpc`
4. CIDR: `10.0.0.0/16`
5. Create **2 private subnets** (for RDS + ElastiCache) and **2 public subnets** (for App Runner egress)
6. Enable **DNS hostnames** ✓

---

## Step 2 — Create Amazon RDS (PostgreSQL)

1. Go to **RDS → Create database**
2. Engine: **PostgreSQL 16**
3. Template: **Free tier** (dev) or **Production** (prod)
4. DB instance identifier: `vendly-db`
5. Master username: `vendly_user`
6. Master password: generate a strong password and save it in Secrets Manager
7. Instance: `db.t3.micro` (dev) / `db.t3.small` (prod)
8. Storage: 20 GB gp3, enable autoscaling
9. **Connectivity**:
   - VPC: `vendly-vpc`
   - Public access: **No** (private only)
   - Create a security group: `vendly-rds-sg`
     - Inbound: PostgreSQL (5432) from App Runner security group only
10. Database name: `vendly`
11. Create and copy the endpoint — goes into `DATABASE_URL`

---

## Step 3 — Create Amazon ElastiCache (Redis)

1. Go to **ElastiCache → Create cluster**
2. Choose **Redis OSS**
3. Cluster mode: **Disabled** (simpler, sufficient for Vendly's load)
4. Name: `vendly-cache`
5. Node type: `cache.t3.micro`
6. Replicas: 0 (dev) / 1 (prod)
7. **Subnet group**: create one using your private subnets from Step 1
8. **Security group**: `vendly-redis-sg`
   - Inbound: Redis (6379) from App Runner security group only
9. Enable **encryption in transit** (TLS) — this is why the URL uses `rediss://`
10. Copy the **Primary Endpoint** — goes into `REDIS_URL`

Your existing `app.module.ts` already uses `cache-manager-redis-yet` with `redisStore` — no code changes needed, just update `REDIS_URL`.

---

## Step 4 — Push Docker image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name vendly-api --region eu-west-1

# Authenticate Docker to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com

# Build and push
cd apps/api
docker build -t vendly-api .
docker tag vendly-api:latest YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/vendly-api:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/vendly-api:latest
```

---

## Step 5 — Deploy API on App Runner

1. Go to **App Runner → Create service**
2. Source: **Container registry → Amazon ECR**
3. Select your `vendly-api` image
4. Deployment trigger: **Automatic** (re-deploys on new ECR push)
5. Service name: `vendly-api-service`
6. Port: `1000`
7. CPU: 1 vCPU / Memory: 2 GB
8. **Environment variables** — add all variables from `.env.aws.example`
9. **Networking**:
   - Enable **VPC connector** pointing to your `vendly-vpc` private subnets
   - Assign `vendly-apprunner-sg` security group
   - This allows App Runner to reach RDS and ElastiCache privately
10. Create service and copy the App Runner URL → goes into `BACKEND_URL`

---

## Step 6 — Deploy Web on Amplify

1. Go to **Amplify → New app → Host web app**
2. Connect your GitHub repo
3. Select the `main` branch
4. **Build settings**:
   - Root directory: `apps/web`
   - Build command: `npm run build`
   - Output directory: `.next`
5. **Environment variables**:
   ```
   NEXT_PUBLIC_API_URL = https://your-app-runner-url.awsapprunner.com
   ```
6. Deploy — Amplify gives you a free `*.amplifyapp.com` URL with HTTPS

---

## Step 7 — GitHub Actions CI/CD

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key (deploy-only permissions) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `APP_RUNNER_ROLE_ARN` | ARN of the App Runner ECR access role |

The workflow in `.github/workflows/deploy-api.yml` will then:
1. Build the Docker image on every push to `main` (inside `apps/api/`)
2. Push it to ECR
3. Trigger a new App Runner deployment automatically

---

## Security group rules summary

| SG | Inbound rule | Source |
|---|---|---|
| `vendly-rds-sg` | TCP 5432 | `vendly-apprunner-sg` |
| `vendly-redis-sg` | TCP 6379 | `vendly-apprunner-sg` |
| `vendly-apprunner-sg` | TCP 443 (HTTPS) | `0.0.0.0/0` |

---

## Estimated monthly cost (eu-west-1, minimal setup)

| Service | Tier | Est. cost |
|---|---|---|
| App Runner | 1 vCPU / 2 GB, ~1M requests | ~$25/mo |
| RDS PostgreSQL | db.t3.micro, 20 GB | ~$15/mo |
| ElastiCache | cache.t3.micro | ~$13/mo |
| ECR | <1 GB storage | ~$0.10/mo |
| Amplify | Build + hosting | ~$5/mo |
| **Total** | | **~$58/mo** |

Costs scale with traffic. App Runner scales to zero when idle (no requests = no compute charges).
