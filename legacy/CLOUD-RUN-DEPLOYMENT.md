# AI Landing Page Generator - Cloud Run Deployment

This document provides instructions for deploying the AI Landing Page Generator to Google Cloud Run using the provided Dockerfile.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Google Cloud SDK installed and configured
- Docker installed locally (for testing)
- The following APIs enabled in your GCP project:
  - Cloud Build
  - Cloud Run
  - Container Registry or Artifact Registry
  - Cloud SQL Admin (if using PostgreSQL)

## Local Testing

1. Build the Docker image locally:
   ```bash
   docker build -t ai-landing-page-generator:local .
   ```

2. Run the container locally:
   ```bash
   docker run -p 8080:8080 \
     -e DATABASE_URL="your-database-connection-string" \
     -e NODE_ENV=production \
     ai-landing-page-generator:local
   ```

3. Access the application at http://localhost:8080

## Deploying to Cloud Run

### Manual Deployment

1. Build and tag the image:
   ```bash
   docker build -t gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest .
   ```

2. Push to Container Registry:
   ```bash
   docker push gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy ai-landing-page-generator \
     --image gcr.io/[YOUR_PROJECT_ID]/ai-landing-page-generator:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --min-instances 1 \
     --max-instances 10 \
     --port 8080 \
     --set-env-vars DATABASE_URL="your-database-connection-string",NODE_ENV=production
   ```

### Automated CI/CD Deployment

1. Set up a Cloud Build trigger for your repository.

2. Configure the trigger to use the provided `cloudbuild-simple.yaml` file.

3. Set up the substitution variable `_DATABASE_URL` with your database connection string.

4. Push changes to your repository to trigger the build and deployment.

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to "production" for production deployments

## Database Setup

If using Cloud SQL for PostgreSQL:

1. Create a PostgreSQL instance:
   ```bash
   gcloud sql instances create landing-page-db \
     --database-version=POSTGRES_16 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. Create a database:
   ```bash
   gcloud sql databases create appdb --instance=landing-page-db
   ```

3. Configure the connection string:
   ```
   postgres://user:password@/appdb?host=/cloudsql/[YOUR_PROJECT_ID]:us-central1:landing-page-db
   ```

## Troubleshooting

- **Connection issues**: Ensure your service account has the necessary permissions to connect to Cloud SQL
- **Build failures**: Check the Cloud Build logs for details
- **Deployment failures**: Ensure the image was built successfully and pushed to Container Registry