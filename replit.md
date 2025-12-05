# Jatevo Web Builder - AI-Powered Website Generator

## Overview

Jatevo Web Builder is an advanced full-stack AI-powered website generator that leverages multiple AI technologies to create dynamic, context-aware websites. It enables users to generate professional-quality websites using AI models like DeepSeek-V3-0324 and OpenAI, featuring real-time streaming generation, template customization, and one-click deployment. The project aims to provide an accessible and powerful tool for individuals and UMKM (Indonesian small/medium enterprises) to establish an online presence efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Styling**: TailwindCSS with Shadcn/UI components for a modern and responsive design.
- **Code Editor**: Monaco-based editor with syntax highlighting, minimap, and real-time preview.
- **Template System**: Categorized templates (Education, Portfolio, Finance, Marketplace, General) with customization options for colors, fonts, and layouts, specifically tailored for UMKM.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, React Query for state management, and Vite for building.
- **Backend**: Node.js with Express.js.
- **AI Integration**: Primary AI provider is Jatevo (DeepSeek-V3-0324) with OpenAI GPT-4 as a fallback and SambaNova for additional model support. Features real-time AI response streaming.
- **Authentication**: JWT-based authentication with bcrypt for password hashing and email-based user identification.
- **Multi-file IDE**: Supports multi-file projects (HTML, CSS, JS, JSX, TS, TSX) with a file browser, tab navigation, and project management capabilities (save, load, list, delete, export as ZIP).
- **React Support**: Universal React preview compatibility, automatically detecting and rendering various React code patterns, including different export types and component definitions, with automatic type stripping for TypeScript.
- **Website Redesign**: Integrates with Jina AI Reader API to fetch and redesign existing websites based on user-provided URLs.
- **Custom Domain Support**: Allows users to connect custom domains via Cloudflare Workers for proxying requests to their deployed sites.
- **Interactive Preview**: Enhanced iframe sandboxing and event handling for fully interactive previews of games and applications, preventing stuck loading screens.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for managing users, projects, templates, and deployments. Optimized for performance with lightweight project summaries and pagination.
- **Data Flow**: Secure user authentication leads to AI-powered project generation, template selection, and eventual deployment to a public URL.
- **Deployment Strategy**: Designed for single-container deployment (Node.js 18 Alpine base image) to platforms like Google Cloud Run, combining frontend and backend builds.

## External Dependencies

- **Database**: PostgreSQL (e.g., Neon serverless)
- **AI Services**: Jatevo API, OpenAI API, SambaNova API, Jina AI Reader API
- **Authentication**: JWT libraries
- **UI Components**: Radix UI primitives (via Shadcn/UI)
- **Development Tools**: TypeScript, Drizzle Kit, ESBuild, Tailwind CSS