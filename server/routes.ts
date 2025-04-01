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

  // SambaNova API integration for DeepSite generation
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
      
      // Generate HTML and CSS based on the prompt and category
      const html = `
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
