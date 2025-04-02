import type { Express } from "express";
import { createServer, type Server } from "http";
import { apiConfigSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import { generateLandingPageHtml, generateFallbackHtml, validateSambanovaApiKey } from './lib/sambanova';

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
  app.post("/api/sambanova/generate-stream", async (req, res) => {
    try {
      const { prompt, apiConfig } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          message: "Missing required field: prompt."
        });
      }
      
      // Generate the landing page HTML
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      
      // Call the SambaNova API
      const result = await generateLandingPageHtml(prompt, apiConfig);
      
      if (result.success) {
        // Send the HTML response back with success indicator
        return res.json({ 
          html: result.html,
          source: "api" // Indicate this came from the API
        });
      } else {
        // If API call failed, use fallback
        console.log("Using fallback HTML generation due to API error:", result.error);
        const fallbackHtml = generateFallbackHtml(title, prompt);
        return res.json({ 
          html: fallbackHtml,
          source: "fallback", // Indicate this is fallback content
          error: result.error
        });
      }
    } catch (error) {
      console.error("Error with SambaNova API:", error);
      return res.status(500).json({ 
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
      
      // Call the SambaNova API
      const result = await generateLandingPageHtml(prompt, apiConfig);
      
      if (result.success) {
        // Return the generated HTML as both HTML and CSS for backward compatibility
        return res.json({ 
          html: result.html,
          css: '' // CSS is embedded in the HTML
        });
      } else {
        // Use fallback HTML generation
        console.log("Using fallback HTML generation for deepsite:", result.error);
        const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
        const fallbackHtml = generateFallbackHtml(title, prompt);
        
        return res.json({
          html: fallbackHtml,
          css: ''
        });
      }
    } catch (error) {
      console.error("Error generating DeepSite:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate DeepSite" 
      });
    }
  });
  
  // Validate SambaNova API key
  app.post("/api/sambanova/validate", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ 
          message: "API key is required"
        });
      }
      
      const isValid = await validateSambanovaApiKey(apiKey);
      
      return res.json({ valid: isValid });
    } catch (error) {
      console.error("Error validating API key:", error);
      return res.status(500).json({ 
        message: "Failed to validate API key",
        valid: false
      });
    }
  });

  // Return the HTTP server
  return createServer(app);
}