# DeepSite - AI-Powered Landing Page Generator

## Overview

DeepSite is an advanced full-stack AI-powered landing page generator that leverages multiple AI technologies to create dynamic, context-aware landing pages. The application enables users to generate professional-quality landing pages using AI models like DeepSeek-V3-0324 and OpenAI, with features including real-time streaming generation, template customization, and one-click deployment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with Shadcn/UI components
- **Routing**: Wouter for client-side navigation
- **State Management**: React Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **API Integration**: Multiple AI providers (Jatevo, OpenAI, SambaNova)
- **File Storage**: Local file system with planned cloud storage support

### Database Schema
- **Users**: Email-based authentication, token usage tracking, generation count
- **Projects**: User-owned landing page projects with metadata
- **Templates**: Predefined templates for different categories
- **Deployments**: Published landing pages with slug-based routing

## Key Components

### AI Integration Layer
- **Primary Provider**: Jatevo (DeepSeek-V3-0324) with hardcoded API key for production reliability
- **Fallback Provider**: OpenAI GPT-4 for premium features
- **SambaNova**: Additional AI model support
- **Streaming**: Real-time AI response streaming with typewriter effect

### Code Editor
- **Enhanced Editor**: Monaco-based code editor with syntax highlighting
- **Real-time Preview**: Live HTML/CSS preview with responsive design testing
- **Minimap**: Code navigation with scroll synchronization
- **Export Options**: HTML/CSS download and deployment capabilities

### Template System
- **Categories**: Education, Portfolio, Finance, Marketplace, General
- **Customization**: Color schemes, fonts, layouts
- **UMKM Focus**: Indonesian small/medium enterprise templates

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Email-based**: Primary identifier is email address
- **Protected Routes**: Frontend route protection with context-based state management
- **Session Management**: Persistent login with localStorage

## Data Flow

1. **User Authentication**: Email/password → JWT token → Protected routes
2. **Project Creation**: User input → AI processing → HTML/CSS generation
3. **AI Generation**: Prompt → AI API → Streaming response → Real-time editor updates
4. **Template Selection**: Category → Template → Settings → Customized output
5. **Deployment**: Project → Validation → File generation → Public URL

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL (Neon serverless recommended)
- **AI Services**: Jatevo API, OpenAI API, SambaNova API
- **Authentication**: JWT for token management
- **UI Components**: Radix UI primitives via Shadcn/UI

### Development Dependencies
- **TypeScript**: Type safety across full stack
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Server-side bundling for production
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server + Express API server
- **Database**: PostgreSQL with Drizzle ORM migrations
- **Environment Variables**: API keys, database URLs, JWT secrets

### Production Deployment
- **Single Container**: Unified build process combining frontend and backend
- **Multi-Service**: Optional separation into backend API, frontend editor, and static site services
- **Cloud Run**: Google Cloud Run deployment with Docker support
- **Database**: Production PostgreSQL with connection pooling

### Container Configuration
- **Base Image**: Node.js 18 Alpine
- **Build Process**: Vite frontend build + ESBuild backend bundle
- **Port**: 8080 (configurable)
- **Health Checks**: Basic HTTP endpoint monitoring

## Changelog

- July 04, 2025. Initial setup
- July 04, 2025. Cloned deepsite-v2 from Hugging Face (https://huggingface.co/spaces/enzostvs/deepsite) into source/deepsite-v2 folder for future integration with the editor
- September 07, 2025. Removed conversation/follow-up functionality:
  - Removed ConversationPanel component and conversation history features
  - Simplified API to focus on single-prompt streaming generation
  - Restored clean, focused editor interface for optimal streaming UX
  - Editor now provides pure streaming generation experience without conversation complexity
- November 15, 2025. Transformed to full IDE experience with multi-file support:
  - Added multi-file project support (HTML, CSS, JavaScript)
  - Implemented file browser sidebar and tab navigation for open files
  - Created ProjectContext for centralized state management
  - Added project management API endpoints (save, load, list, delete)
  - Implemented AI response parsing for multi-file generation
  - Added follow-up prompting to modify existing projects
  - Created /projects page for managing saved projects
  - Added project export as ZIP functionality
  - Maintained backward compatibility with legacy single-file editor at /editor
  - New IDE interface available at /ide route

## User Preferences

Preferred communication style: Simple, everyday language.