# Jatevo Web Builder - AI-Powered Website Generator

## Overview

Jatevo Web Builder is an advanced full-stack AI-powered website generator that leverages multiple AI technologies to create dynamic, context-aware websites. The application enables users to generate professional-quality websites using AI models like DeepSeek-V3-0324 and OpenAI, with features including real-time streaming generation, template customization, and one-click deployment.

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
  - Implemented AI response parsing for multi-file generation using v3 markers (<<<<<<< NEW_FILE_START)
  - Added follow-up prompting to modify existing projects
  - Created /projects page for managing saved projects
  - Added project export as ZIP functionality
  - Maintained backward compatibility with legacy single-file editor at /editor
  - New IDE interface available at /ide route
  - Updated AI prompts to enforce multi-file generation (minimum 3 files: index.html, style.css, script.js)
  - Added explicit multi-file example in system prompt to guide AI behavior
  - Integrated v3 prompt architecture with Web Components support in components/ folder
- November 19, 2025. Enhanced React support with universal compatibility:
  - Implemented automatic library detection for React projects (Material-UI, Axios, Framer Motion, Recharts, etc.)
  - Added TypeScript support with automatic type stripping for .ts and .tsx files
  - Enhanced import/export processing for ES6 modules, CommonJS, and various export patterns
  - Added JSX Fragment support and improved component detection
  - Updated deployment bundler to properly handle React projects
  - Deployment now generates React-compatible HTML with all necessary CDN links
  - React preview works universally for ANY React code pasted (Create React App, Next.js, Vite, etc.)
  - Both IDE preview and deployment now handle React projects correctly
- November 20, 2025. Fixed stuck loading screens in preview:
  - Added automatic loading screen detection and removal after 2-second timeout
  - Preview now detects full-screen loading overlays (fixed/absolute position, high z-index)
  - Automatically hides stuck loading screens by adding hidden class, opacity 0, and display none
  - Prevents AI-generated websites with loading animations from getting stuck in preview
  - Loading screens work normally but have a failsafe to ensure they don't block the preview permanently
- November 20, 2025. Fixed edit/SEARCH-REPLACE failures that caused broken websites:
  - Implemented 3-tier matching strategy for SEARCH/REPLACE blocks: exact match → whitespace normalization → flexible regex
  - Whitespace normalization intelligently finds matching code sections even with different indentation
  - Failed edits now skip gracefully with warnings instead of breaking the website
  - Edit process no longer freezes or makes pages unresponsive
  - Improved error messages show search pattern and file content for debugging
  - AI-generated edits are now much more reliable even with imperfect whitespace matching
- November 20, 2025. Fixed false positive React detection in HTML/CSS/JS projects:
  - Replaced overly broad React detection patterns that flagged Web Components as React
  - Removed className= and onClick= from detection (these are valid in regular HTML/Web Components)
  - Now requires actual React imports (from 'react') OR explicit React API calls (ReactDOM, React.createElement)
  - Web Components using custom elements, className, onClick no longer trigger "React code detected" warnings
  - Strict detection ensures only genuine React/JSX code is processed as React
  - Applied consistent detection logic across process-ai-response.ts, bundle-for-deployment.ts, and editor-ide.tsx

## User Preferences

Preferred communication style: Simple, everyday language.