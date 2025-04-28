# Docker and GCP Deployment Guide

This guide provides instructions for deploying the AI Landing Page Generator application using Docker and Google Cloud Platform (GCP).

## Local Development with Docker

### Prerequisites
- Docker and Docker Compose installed on your machine
- Git repository cloned locally

### Building and Running Locally

1. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

3. **Stop the containers:**
   ```bash
   docker-compose down
   ```

## Deploying to Google Cloud Platform

### Prerequisites
- Google Cloud Platform account
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
- Enable the following GCP services:
  - Cloud Build
  - Container Registry
  - Cloud Run
  - Cloud SQL (for PostgreSQL)

### Creating a Cloud SQL PostgreSQL Instance

1. **Create a PostgreSQL instance:**
   ```bash
   gcloud sql instances create landing-page-db \
     --database-version=POSTGRES_16 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --root-password=[YOUR_SECURE_PASSWORD]
   ```

2. **Create a database:**
   ```bash
   gcloud sql databases create appdb --instance=landing-page-db
   ```

3. **Create a user:**
   ```bash
   gcloud sql users create app-user \
     --instance=landing-page-db \
     --password=[YOUR_SECURE_PASSWORD]
   ```

4. **Get the connection string:**
   - Note the connection string in the format: 
   ```
   postgres://app-user:[YOUR_SECURE_PASSWORD]@/appdb?host=/cloudsql/[YOUR_PROJECT_ID]:us-central1:landing-page-db
   ```

### Setting Up Cloud Build

1. **Connect your repository to Cloud Build:**
   - Go to Cloud Build in the GCP Console
   - Connect your repository
   - Create a trigger for the main branch

2. **Configure secrets:**
   - Set up your DATABASE_URL as a secret variable in Cloud Build

3. **Run the build:**
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

### Manual Deployment to Cloud Run

1. **Build the Docker image:**
   ```bash
   docker build -t gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest .
   ```

2. **Push to Container Registry:**
   ```bash
   docker push gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy ai-landing-page-generator \
     --image=gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest \
     --platform=managed \
     --region=us-central1 \
     --allow-unauthenticated \
     --port=5000 \
     --set-env-vars=DATABASE_URL=[YOUR_DATABASE_URL]
   ```

## Environment Variables

The following environment variables should be configured:

- `NODE_ENV`: Set to "production" for production deployments
- `DATABASE_URL`: PostgreSQL connection string
- Any other required API keys or secrets for the application

## Database Migrations

To run database migrations when deploying, you can add a migration step in your Dockerfile:

```
RUN npm run db:push
```

Or run it manually after deployment:

```bash
gcloud run jobs create db-migration \
  --image=gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest \
  --command="npm" \
  --args="run,db:push" \
  --set-env-vars=DATABASE_URL=[YOUR_DATABASE_URL]
```

## Scaling Configuration

To configure scaling parameters for Cloud Run:

```bash
gcloud run services update ai-landing-page-generator \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```