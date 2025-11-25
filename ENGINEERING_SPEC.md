# Jatevo Web Builder - Engineering Specification

> **AI-Powered Website Generator with Real-Time Preview & One-Click Deployment**

---

## Executive Summary

Jatevo Web Builder is an AI-powered code generation platform that transforms natural language prompts into fully functional websites. Built for speed and simplicity, it generates HTML, CSS, and JavaScript code in real-time with live preview and one-click deployment to production.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │  ChatBar    │  │  Code Editor    │  │  Live Preview (iframe)   │ │
│  │  (Prompt)   │  │  (Multi-file)   │  │  (Artifact/Canvas)       │ │
│  └──────┬──────┘  └────────┬────────┘  └────────────┬─────────────┘ │
└─────────┼──────────────────┼───────────────────────┼────────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Express.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  Streaming   │  │  Project     │  │  Deployment               │  │
│  │  Generator   │  │  Storage     │  │  Service                  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────┐  ┌─────────────┐  ┌────────────────────────────┐
│   AI PROVIDERS  │  │  PostgreSQL │  │   Cloud Run / CDN          │
│  DeepSeek-V3    │  │  (Neon)     │  │   (Public Hosting)         │
│  Cerebras GLM   │  │             │  │                            │
│  SambaNova      │  │             │  │                            │
└─────────────────┘  └─────────────┘  └────────────────────────────┘
```

---

## Core Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, TailwindCSS | Interactive UI, Code Editor |
| **State** | TanStack Query, Context API | Server state, Project management |
| **Backend** | Node.js, Express.js | API, Streaming, Authentication |
| **Database** | PostgreSQL (Drizzle ORM) | Users, Projects, Deployments |
| **AI Models** | DeepSeek-V3-0324 (Primary) | Code generation |
| **Preview** | iframe + Babel (JSX) | Real-time rendering |
| **Deployment** | Cloud Run, Docker | One-click publishing |

---

## How Code Generation Works

### 1. Prompt Processing Pipeline

```
User Prompt ──► Prompt Enhancement ──► AI Model ──► Stream Processing ──► File Parsing ──► Live Preview
     │              (optional)           │              │                    │               │
     │                                   │              │                    │               │
"Create a landing     Adds detail,     DeepSeek    Chunks arrive    Markers extract    iframe.srcdoc
 page for fitness"    context          V3-0324     via SSE          HTML/CSS/JS        updates
```

### 2. Streaming Response Format

AI responses use structured markers for multi-file output:

```
<<<<<<< NEW_FILE_START index.html
<!DOCTYPE html>
<html>...</html>
>>>>>>> NEW_FILE_END

<<<<<<< NEW_FILE_START style.css
body { ... }
>>>>>>> NEW_FILE_END

<<<<<<< NEW_FILE_START script.js
console.log('Hello');
>>>>>>> NEW_FILE_END
```

### 3. Incremental Editing (SEARCH/REPLACE)

For follow-up modifications, AI uses surgical edits:

```
<<<<<<< UPDATE_FILE_START index.html >>>>>>> UPDATE_FILE_END
<<<<<<< SEARCH
<h1>Old Title</h1>
=======
<h1>New Title</h1>
>>>>>>> REPLACE
```

---

## Key Features

### Real-Time Preview (Artifact/Canvas)

| Feature | Implementation |
|---------|----------------|
| **HTML/CSS/JS** | Direct iframe injection via `srcdoc` |
| **React/JSX** | Babel Standalone transforms in-browser |
| **Library Detection** | Auto-injects CDNs (TailwindCSS, Lucide, React, etc.) |
| **Universal Compatibility** | Supports any React export pattern (CRA, Next.js, Vite) |

### One-Click Deployment

```
Generate ──► Preview ──► Deploy ──► Live URL
                           │
                           ├── Slug availability check
                           ├── Static file bundling
                           └── CDN distribution
```

**Output**: `https://your-slug.jatevo.site` (public URL in ~5 seconds)

### Version Control & Rollback

- Each generation creates a version snapshot
- Full project history with diff viewing
- One-click rollback to any previous version
- Prompt history tracking

---

## AI Model Configuration

| Provider | Model | Use Case | Max Tokens |
|----------|-------|----------|------------|
| **Jatevo API** | DeepSeek-V3-0324 | Primary generation | 8,192 |
| **Cerebras** | GLM-4.6 | Fast inference | 4,096 |
| **SambaNova** | Various | Alternative provider | Variable |

**System Prompt (Simplified)**:
```
ONLY USE HTML, CSS AND JAVASCRIPT. Use TailwindCSS for styling.
Import libraries via CDN. Create responsive, unique designs.
Return response as structured multi-file output.
```

---

## Economic Benefits & Cost Analysis

### Market Context (2024)

| Metric | Value | Source |
|--------|-------|--------|
| AI coding tools market | **$4.91B** (2024) → **$99.1B** (2034) | Industry Reports |
| GenAI economic value | **$2.6-4.4 trillion** annually | McKinsey |
| ROI multiplier | **$4.60** return per $1 spent | IDC |

### Developer Productivity Gains

| Metric | Improvement | Source |
|--------|-------------|--------|
| Code acceptance rate | ~30% | GitHub Copilot |
| Overall productivity boost | **26%** (controlled studies) | Microsoft/Accenture |
| Real-world efficiency gain | **10-15%** | Bain & Company |
| Time saved on boilerplate | **40-60%** | Industry average |

### Cost Savings

| Scenario | Traditional | With AI | Savings |
|----------|-------------|---------|---------|
| Landing page development | 8-16 hours | 10-30 minutes | **95%** |
| Simple website prototype | 2-4 days | 1-2 hours | **90%** |
| Agency website project | $2,000-10,000 | ~$0 (tool cost) | **99%** |

### Jatevo-Specific Value Proposition

| Feature | Value |
|---------|-------|
| **No-Code Entry** | Non-technical users create websites instantly |
| **Instant Preview** | See results in real-time, iterate 10x faster |
| **One-Click Deploy** | Skip hosting setup, DNS, SSL configuration |
| **Version History** | No fear of breaking changes, always rollback |

---

## Use Cases for AI Labs

### 1. Research Applications

- **Benchmark AI Code Quality**: Compare outputs across models
- **Prompt Engineering Studies**: Test prompt variations at scale
- **UI Generation Evaluation**: Measure design consistency

### 2. Educational Use

- **Learn Web Development**: See code structure in real-time
- **Experiment Safely**: Instant preview without setup
- **Understand AI Limitations**: Observe edge cases

### 3. Rapid Prototyping

- **MVP Validation**: Test ideas in minutes, not days
- **A/B Concept Testing**: Generate multiple variations
- **Client Demos**: Create interactive mockups instantly

---

## API Reference

### Generation Endpoint

```
POST /api/cerebras/stream
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "Create a fitness landing page",
  "useMultiFile": true,
  "stylePreference": "modern-minimal"
}

Response: Server-Sent Events (SSE) stream
```

### Deployment Endpoint

```
POST /sites/:slug/deploy
Content-Type: application/json

{
  "files": [...],
  "html": "<full bundled html>",
  "projectId": 123
}

Response: { "url": "https://slug.jatevo.site" }
```

---

## Security & Data Flow

```
┌────────────────┐     HTTPS      ┌────────────────┐
│  User Browser  │ ◄──────────────► │  Jatevo API    │
└────────────────┘                └───────┬────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     │                    │                    │
                     ▼                    ▼                    ▼
              ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
              │  AI Model   │     │  Database   │     │  CDN/Host   │
              │  (Jatevo)   │     │  (Neon PG)  │     │  (Cloud)    │
              └─────────────┘     └─────────────┘     └─────────────┘
```

- **JWT Authentication**: Secure user sessions
- **Encrypted Storage**: Passwords hashed with bcrypt
- **API Rate Limiting**: Prevent abuse
- **Isolated Previews**: Sandboxed iframes

---

## Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Time to first code chunk | < 2s | ~1.5s |
| Full page generation | < 30s | 15-25s |
| Preview render | < 500ms | ~200ms |
| Deployment time | < 10s | 3-5s |
| Version rollback | Instant | < 1s |

---

## Conclusion

Jatevo Web Builder democratizes web development by combining:

1. **Powerful AI** (DeepSeek-V3) for intelligent code generation
2. **Real-time streaming** for immediate feedback
3. **Universal preview** supporting any framework
4. **One-click deployment** for instant publishing

This architecture enables anyone to create professional websites in minutes rather than days, with economic savings of 90-99% compared to traditional development.

---

**Version**: 1.0 | **Last Updated**: November 2025 | **License**: MIT
