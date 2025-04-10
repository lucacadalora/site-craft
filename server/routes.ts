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

  // SambaNova API integration for DeepSite generation with true streaming
  app.post("/api/sambanova/generate-stream", async (req, res) => {
    try {
      const { prompt, apiConfig } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          message: "Missing required field: prompt."
        });
      }
      
      // Enable streaming HTTP response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate the landing page HTML
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      
      try {
        // Always use the API key from the config or the hardcoded default
        const apiKey = apiConfig?.apiKey || process.env.SAMBANOVA_API_KEY || "9f5d2696-9a9f-43a6-9778-ebe727cd2968";
        // We don't need to check if the API key is missing anymore since we have a hardcoded default
        
        console.log("Generating HTML with AI Accelerate Inference API using streaming for prompt:", prompt.substring(0, 50) + "...");
        
        // Prepare the system prompt and user message
        const systemMessage = {
          role: "system",
          content: `ONLY USE HTML, CSS AND JAVASCRIPT. Your response must begin with <!DOCTYPE html> and contain only valid HTML. If you want to use icons make sure to import the library first. Try to create the best UI possible by using only HTML, CSS and JAVASCRIPT. Use as much as you can TailwindCSS for the CSS, if you can't do something with TailwindCSS, then use custom CSS (make sure to import <script src="https://cdn.tailwindcss.com"></script> in the head). Create something unique and directly relevant to the prompt. DO NOT include irrelevant content about places like Surakarta (Solo) or any other unrelated topics - stick strictly to what's requested in the prompt. DO NOT include any explanation, feature list, or description text before or after the HTML code. ALWAYS GIVE THE RESPONSE AS A SINGLE HTML FILE STARTING WITH <!DOCTYPE html>`
        };
        
        const userMessage = {
          role: "user",
          content: `Create a landing page for: ${prompt}`
        };
        
        const completionOptions = {
          stream: true,
          model: "DeepSeek-V3-0324",
          messages: [systemMessage, userMessage]
        };
        
        // Call the AI Accelerate Inference API with streaming
        const apiResponse = await fetch("https://api.sambanova.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(completionOptions)
        });
        
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error("AI Accelerate Inference API error:", apiResponse.status, errorText);
          
          // Send error and then fallback content as a stream event
          res.write(`data: ${JSON.stringify({ 
            event: 'error', 
            message: `API error: ${apiResponse.status} - ${errorText}`
          })}\n\n`);
          
          // Send fallback HTML
          const fallbackHtml = generateFallbackHtml(title, prompt);
          res.write(`data: ${JSON.stringify({ 
            event: 'complete', 
            html: fallbackHtml,
            source: 'fallback'
          })}\n\n`);
          
          return res.end();
        }
        
        // Initialize for processing HTML chunks
        console.log("AI Accelerate Inference API response received, streaming to client");
        const reader = apiResponse.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }
        
        // Send an initial message
        res.write(`data: ${JSON.stringify({ 
          event: 'start',
          message: 'Generation started' 
        })}\n\n`);
        
        // Stream all chunks directly to the client
        let fullContent = "";
        let htmlStarted = false;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = new TextDecoder().decode(value);
          
          // Process each line that starts with "data: "
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              
              try {
                const jsonData = JSON.parse(jsonStr);
                if (jsonData.choices && jsonData.choices.length > 0) {
                  const delta = jsonData.choices[0].delta;
                  if (delta && delta.content) {
                    // Extract the content and add it to our full content
                    const contentChunk = delta.content;
                    fullContent += contentChunk;
                    
                    // If this is the first piece of HTML, mark it
                    if (!htmlStarted && (
                      contentChunk.includes("<!DOCTYPE") || 
                      contentChunk.includes("<html") || 
                      contentChunk.includes("<head") ||
                      contentChunk.includes("<body")
                    )) {
                      htmlStarted = true;
                    }
                    
                    // Send the chunk to the client with metadata
                    res.write(`data: ${JSON.stringify({ 
                      event: 'chunk', 
                      content: contentChunk,
                      isHtml: htmlStarted
                    })}\n\n`);
                  }
                }
              } catch (e) {
                console.error("Error parsing JSON chunk:", e);
                // Don't fail the whole stream for a single parse error
              }
            }
          }
        }
        
        // Send completion event
        console.log("Streaming completed, sending final event");
        res.write(`data: ${JSON.stringify({ 
          event: 'complete', 
          html: fullContent,
          source: 'api'
        })}\n\n`);
        
      } catch (error) {
        console.error("Error streaming from AI Accelerate Inference API:", error);
        
        // Send error as a stream event
        res.write(`data: ${JSON.stringify({ 
          event: 'error', 
          message: error instanceof Error ? error.message : "Error streaming from API"
        })}\n\n`);
        
        // Send fallback content
        const fallbackHtml = generateFallbackHtml(title, prompt);
        res.write(`data: ${JSON.stringify({ 
          event: 'complete', 
          html: fallbackHtml,
          source: 'fallback'
        })}\n\n`);
      }
      
      return res.end();
      
    } catch (error) {
      console.error("Critical error with AI Accelerate Inference API streaming:", error);
      
      // If we reach this, we can't use the streaming response anymore
      if (!res.headersSent) {
        return res.status(500).json({ 
          message: error instanceof Error ? error.message : "Failed to generate content with AI Accelerate Inference API" 
        });
      } else {
        return res.end();
      }
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
      
      // Call the AI Accelerate Inference API
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
  
  // Validate AI Accelerate API key
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