# GCP Cloud Run Multi-Service Deployment Guide

This guide explains how to deploy the application as a multi-service architecture on Google Cloud Platform using Cloud Run. The application is split into three main services:

1. **Backend API** - Node.js Express API service
2. **Frontend Editor** - React-based web editor interface
3. **Product1 Site** - Generated landing page hosting service

## Prerequisites

- Google Cloud Platform account
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
- Docker installed locally (for testing)
- Enable the following GCP services:
  - Cloud Build
  - Container Registry or Artifact Registry
  - Cloud Run
  - Cloud SQL (for PostgreSQL)

## Local Testing

1. Build the individual services:
   ```bash
   ./build-multi-service.sh
   ```

2. Build the Docker images locally:
   ```bash
   # Backend API
   docker build --target backend -t backend-api:local -f Dockerfile.multi-service .
   
   # Frontend Editor
   docker build --target frontend -t frontend-editor:local -f Dockerfile.multi-service .
   
   # Product1 Site
   docker build --target product1 -t product1-site:local -f Dockerfile.multi-service .
   ```

3. Run the services locally:
   ```bash
   # Create a Docker network for inter-service communication
   docker network create app-network
   
   # Run PostgreSQL (if needed)
   docker run --name pg-db --network app-network -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=appdb -p 5432:5432 -d postgres:16
   
   # Run Backend API
   docker run --name backend-api --network app-network -p 8080:8080 -e DATABASE_URL=postgres://postgres:postgres@pg-db:5432/appdb -e NODE_ENV=production -d backend-api:local
   
   # Run Frontend Editor
   docker run --name frontend-editor --network app-network -p 3000:80 -e BACKEND_API_URL=http://backend-api:8080 -d frontend-editor:local
   
   # Run Product1 Site
   docker run --name product1-site --network app-network -p 3001:80 -d product1-site:local
   ```

4. Access the services locally:
   - Backend API: http://localhost:8080
   - Frontend Editor: http://localhost:3000
   - Product1 Site: http://localhost:3001

## GCP Cloud Run Deployment

### Setting Up Cloud SQL PostgreSQL

1. Create a PostgreSQL instance:
   ```bash
   gcloud sql instances create landing-page-db \
     --database-version=POSTGRES_16 \
     --tier=db-f1-micro \
     --region=us-central1 \
     --root-password=[YOUR_SECURE_PASSWORD]
   ```

2. Create a database:
   ```bash
   gcloud sql databases create appdb --instance=landing-page-db
   ```

3. Create a user:
   ```bash
   gcloud sql users create app-user \
     --instance=landing-page-db \
     --password=[YOUR_SECURE_PASSWORD]
   ```

4. Get the connection string:
   ```
   postgres://app-user:[YOUR_SECURE_PASSWORD]@/appdb?host=/cloudsql/[YOUR_PROJECT_ID]:us-central1:landing-page-db
   ```

### Deploying with Cloud Build

1. Set up a Cloud Build trigger:
   - Go to Cloud Build in the GCP Console
   - Connect your repository
   - Configure a trigger to use the `cloudbuild.yaml` file

2. Add your Database URL as a substitution variable:
   - In the Cloud Build trigger settings, add `_DATABASE_URL` with your Cloud SQL connection string

3. Configure service-to-service communication:
   - In the Cloud Run settings for each service, set up the appropriate IAM permissions
   - Frontend needs to communicate with Backend API
   - Both services might need to communicate with Cloud SQL

4. Run the build:
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

## Environment Variables

### Backend API Service
- `NODE_ENV`: Set to "production"
- `PORT`: Set to 8080 (Cloud Run's default)
- `DATABASE_URL`: PostgreSQL connection string

### Frontend Editor Service
- `BACKEND_API_URL`: URL of the Backend API service

## Architecture Diagram

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│               │     │               │     │               │
│  Frontend     │────▶│  Backend      │────▶│  Cloud SQL    │
│  Editor       │     │  API          │     │  Database     │
│  (Cloud Run)  │◀────│  (Cloud Run)  │◀────│  (PostgreSQL) │
│               │     │               │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
        ▲                                            
        │                                            
        │                                            
┌───────────────┐                                   
│               │                                   
│  Product1     │                                   
│  Site         │                                   
│  (Cloud Run)  │                                   
│               │                                   
└───────────────┘                                   
```

## Scaling Configuration

Each service in Cloud Run can be configured with its own scaling parameters:

- Backend API: Min 1, Max 10 instances
- Frontend Editor: Min 1, Max 5 instances
- Product1 Site: Min 0, Max 5 instances (scales to zero when not in use)

## CI/CD Pipeline

The included `cloudbuild.yaml` file defines a complete CI/CD pipeline that:

1. Builds all three Docker images
2. Pushes them to Container Registry
3. Deploys each service to Cloud Run
4. Configures environment variables and service connections

## Service Communication

- Frontend Editor communicates with Backend API via the API's Cloud Run URL
- Backend API connects to Cloud SQL using the connection string
- Product1 Site operates independently as a static site hosting service

## Security Considerations

- Backend API service should be private and only accessible by the Frontend Editor
- Frontend Editor and Product1 Site can be public-facing
- Use IAM service accounts with minimal permissions
- Store sensitive configuration in Secret Manager