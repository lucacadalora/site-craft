# DeepSite - AI-Powered Landing Page Generator

DeepSite is an advanced AI-powered web page generator that leverages intelligent technologies to create dynamic, context-aware landing pages with seamless content optimization.

## 🚀 Features

- **AI-Driven Content Generation**: Create compelling landing pages with just a prompt
- **Streaming AI Generation**: Watch your landing page build in real-time
- **Multiple AI Model Support**: Integration with OpenAI and SambaNova APIs
- **Template Library**: Choose from various industry categories and layouts
- **Customization Options**: Modify colors, fonts, and layout styles
- **Export & Publish**: Save your generated landing pages as HTML/CSS or publish online
- **Responsive Design**: All generated pages work on mobile, tablet, and desktop

## 🛠️ Technology Stack

- **Frontend**: TypeScript, React, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI API and SambaNova API
- **State Management**: React Query

## 🏗️ Project Structure

```
.
├── client/             # Frontend React application
├── server/             # Backend Express server
├── shared/             # Shared types and schemas
├── public/             # Static assets
└── deepsite/           # DeepSite core components
```

## 📋 Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database
- OpenAI API key or SambaNova API key (for AI features)

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/deepsite.git
cd deepsite
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/deepsite
PORT=5000
```

For AI features, add your API keys:

```
OPENAI_API_KEY=your_openai_api_key
SAMBANOVA_API_KEY=your_sambanova_api_key
```

### Database Setup

Run the database migrations:

```bash
npm run db:push
```

### Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:5000](http://localhost:5000)

## 🧪 Running Tests

```bash
npm test
```

## 📄 API Documentation

### Generate a Landing Page

```
POST /api/generate
```

Request body:
```json
{
  "prompt": "A landing page for a coffee shop",
  "category": "restaurant",
  "settings": {
    "colorScheme": "warm",
    "font": "serif",
    "layout": "modern"
  },
  "apiConfig": {
    "provider": "openai",
    "apiKey": "your_api_key"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.