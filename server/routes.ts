import type { Express } from "express";
import { createServer, type Server } from "http";
import { apiConfigSchema } from "@shared/schema";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix all routes with /api

  // Simple template categories endpoint that returns static data
  const CATEGORIES = [
    { id: "general", name: "General" },
    { id: "business", name: "Business" },
    { id: "ecommerce", name: "E-Commerce" },
    { id: "portfolio", name: "Portfolio" },
    { id: "startup", name: "Startup" },
    { id: "tech", name: "Technology" },
    { id: "saas", name: "SaaS" },
    { id: "marketing", name: "Marketing" },
    { id: "consulting", name: "Consulting" },
    { id: "finance", name: "Finance" },
    { id: "healthcare", name: "Healthcare" },
    { id: "education", name: "Education" }
  ];
  
  app.get("/api/categories", async (req, res) => {
    return res.json(CATEGORIES);
  });

  // Simple token estimation route
  app.post("/api/estimate-tokens", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Simple token estimation algorithm based on character count
      const estimatedTokens = Math.ceil(prompt.length / 4) + 50;
      
      return res.json({ tokenEstimate: estimatedTokens });
    } catch (error) {
      console.error("Error estimating tokens:", error);
      return res.status(500).json({ message: "Failed to estimate tokens" });
    }
  });

  // Export route for HTML code
  app.post("/api/export-html", async (req, res) => {
    try {
      const { html, css, name } = req.body;
      
      if (!html || !css) {
        return res.status(400).json({ message: "HTML and CSS content is required" });
      }
      
      // Create a complete HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${name || 'LandingCraft Export'}</title>
          <style>${css}</style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="landingcraft-export.html"`);
      return res.send(fullHtml);
    } catch (error) {
      console.error("Error exporting landing page:", error);
      return res.status(500).json({ message: "Failed to export landing page" });
    }
  });

  // SambaNova API integration for DeepSite generation - Streaming Version
  app.get("/api/sambanova/generate-stream", (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if using nginx
    
    // Store the connection in a variable for access by the POST handler
    const sseConnections = req.app.locals.sseConnections || new Map();
    const clientId = req.query._ || Date.now().toString();
    sseConnections.set(clientId.toString(), res);
    req.app.locals.sseConnections = sseConnections;
    
    // Handle client disconnect
    req.on('close', () => {
      sseConnections.delete(clientId.toString());
      console.log(`Client ${clientId} disconnected from SSE.`);
    });
    
    // Send an initial ping to keep the connection alive
    const keepAliveInterval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(keepAliveInterval);
        return;
      }
      res.write(`:ping\n\n`);
    }, 15000);
    
    console.log(`Client ${clientId} connected to SSE.`);
  });
  
  app.post("/api/sambanova/generate-stream", async (req, res) => {
    try {
      const { prompt, apiConfig } = req.body;
      const clientId = req.query._ || req.body.clientId;
      
      if (!clientId) {
        return res.status(400).json({ 
          message: "Client ID is required. Please include a clientId parameter."
        });
      }
      
      if (!prompt) {
        return res.status(400).json({ 
          message: "Missing required field: prompt."
        });
      }
      
      // Check if we have an API key
      const apiKey = apiConfig?.apiKey || process.env.SAMBANOVA_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ 
          message: "SambaNova API key is required. Please provide one in the API configuration."
        });
      }
      
      // Find the client's SSE connection
      const sseConnections = req.app.locals.sseConnections || new Map();
      const clientRes = sseConnections.get(clientId.toString());
      
      if (!clientRes) {
        return res.status(404).json({
          message: "Client connection not found. Please establish an SSE connection first."
        });
      }
      
      // Helper function to send SSE messages
      const sendEvent = (event: string, data: any) => {
        clientRes.write(`event: ${event}\n`);
        clientRes.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Return success to the POST request immediately
      res.status(200).json({ message: "Generation started" });
      
      // Simulate stream response
      sendEvent('start', { message: 'Starting generation with DeepSeek-V3-0324...' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      sendEvent('token', { message: 'Analyzing prompt...' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Process prompt in chunks to simulate token streaming
      const words = prompt.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ');
        sendEvent('token', { message: `Processing: ${chunk}` });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      sendEvent('token', { message: 'Generation complete! Building HTML...' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a simple HTML based on the prompt
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      const generatedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      background-color: #3b82f6;
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    p {
      font-size: 1.2rem;
      max-width: 800px;
      margin: 0 auto 30px auto;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #fff;
      color: #3b82f6;
      padding: 12px 30px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }
    
    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    section {
      padding: 80px 0;
    }
    
    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 60px;
      color: #333;
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .feature {
      background-color: #f8f9fa;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      transition: transform 0.3s ease;
    }
    
    .feature:hover {
      transform: translateY(-10px);
    }
    
    .feature h3 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      color: #3b82f6;
    }
    
    footer {
      background-color: #333;
      color: white;
      padding: 40px 0;
      text-align: center;
    }
    
    @media (max-width: 768px) {
      h1 {
        font-size: 2.5rem;
      }
      
      .section-title {
        font-size: 2rem;
      }
      
      .features {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${title}</h1>
      <p>${prompt}</p>
      <a href="#" class="cta-button">Get Started</a>
    </div>
  </header>
  
  <section>
    <div class="container">
      <h2 class="section-title">Key Features</h2>
      <div class="features">
        <div class="feature">
          <h3>Feature 1</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 2</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 3</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${title}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
      
      // Send the final HTML
      sendEvent('complete', { html: generatedHtml });
      
    } catch (error) {
      console.error("Error with SambaNova API:", error);
      
      // Find the client's SSE connection
      const sseConnections = req.app.locals.sseConnections || new Map();
      const clientId = req.query._ || req.body.clientId;
      const clientRes = clientId ? sseConnections.get(clientId.toString()) : null;
      
      if (clientRes) {
        clientRes.write(`event: error\n`);
        clientRes.write(`data: ${JSON.stringify({ message: error instanceof Error ? error.message : "Failed to generate content" })}\n\n`);
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate content with SambaNova API" 
      });
    }
  });
  
  // Keep the regular non-streaming endpoint for backward compatibility
  app.post("/api/sambanova/deepsite", async (req, res) => {
    try {
      const { prompt, category, sections, contentDepth, apiConfig } = req.body;
      
      if (!prompt || !category) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide prompt and category."
        });
      }
      
      // Check if we have an API key
      const apiKey = apiConfig?.apiKey || process.env.SAMBANOVA_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ 
          message: "SambaNova API key is required. Please provide one in the API configuration."
        });
      }
      
      // In a real implementation, you would call the SambaNova API here
      // For now, we'll create a mock response with some delay to simulate the API call
      
      // Random delay between 1-3 seconds to simulate API processing
      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Generate a simple HTML based on the prompt
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
  <header>
    <div class="container">
      <h1>${category.toUpperCase()} LANDING PAGE</h1>
      <p>${prompt.slice(0, 100)}...</p>
      <a href="#" class="btn btn-primary">Get Started</a>
    </div>
  </header>
  
  <section class="features">
    <div class="container">
      <h2>Key Features</h2>
      <div class="feature-grid">
        <div class="feature">
          <h3>Feature 1</h3>
          <p>Description of feature 1</p>
        </div>
        <div class="feature">
          <h3>Feature 2</h3>
          <p>Description of feature 2</p>
        </div>
        <div class="feature">
          <h3>Feature 3</h3>
          <p>Description of feature 3</p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="cta">
    <div class="container">
      <h2>Ready to get started?</h2>
      <p>Join thousands of satisfied customers today!</p>
      <a href="#" class="btn btn-secondary">Sign Up Now</a>
    </div>
  </section>
</body>
</html>
      `;
      
      const css = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

header {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  text-align: center;
  padding: 100px 0;
}

h1 {
  font-size: 3rem;
  margin-bottom: 20px;
}

.btn {
  display: inline-block;
  padding: 12px 30px;
  background: #fff;
  color: #6a11cb;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 20px;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.features {
  padding: 80px 0;
  background: #f9f9f9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.feature {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

.cta {
  background: #2575fc;
  color: white;
  text-align: center;
  padding: 80px 0;
}

.btn-secondary {
  background: #6a11cb;
  color: white;
}
      `;
      
      return res.json({ html, css });
    } catch (error) {
      console.error("Error with SambaNova API:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate content with SambaNova API" 
      });
    }
  });
  
  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
