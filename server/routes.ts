import type { Express } from "express";
import { createServer, type Server } from "http";
import { apiConfigSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import { generateLandingPageHtml, generateFallbackHtml, validateSambanovaApiKey } from './lib/sambanova';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import { authenticate, optionalAuth, AuthRequest } from './middleware/auth';
import { PgStorage } from './db/pg-storage';
import { MemStorage } from './storage';

// Initialize the database schema and tables
import './db/migrate';

// Create storage instances
const pgStorage = new PgStorage();
// Keep memStorage for backward compatibility
const memStorage = new MemStorage();

// Helper function to track token usage
async function trackTokenUsage(userId: number, tokenCount: number, res?: any): Promise<void> {
  if (!userId) {
    console.log('No user ID provided, skipping token usage tracking');
    return;
  }
  
  try {
    console.log(`Starting token usage tracking for user ${userId} with ${tokenCount} tokens`);
    
    // Get the user to verify they exist
    const user = await pgStorage.getUser(userId);
    if (!user) {
      console.error(`Cannot update token usage: User ${userId} not found in database`);
      return;
    }
    
    // Update token usage
    const updatedUser = await pgStorage.updateUserTokenUsage(userId, tokenCount);
    console.log(`Token usage successfully updated for user ${userId}. New count: ${updatedUser.tokenUsage}, generations: ${updatedUser.generationCount}`);
    
    // If this is a streaming response and we have a response object, send an event
    if (res && typeof res.write === 'function') {
      try {
        res.write(`data: ${JSON.stringify({ 
          event: 'token-usage-updated', 
          tokenUsage: updatedUser.tokenUsage,
          generationCount: updatedUser.generationCount
        })}\n\n`);
      } catch (writeError) {
        console.error('Error sending token-usage-updated event:', writeError);
      }
    }
  } catch (error) {
    console.error('Error updating token usage:', error);
    console.error(`Token tracking stack: ${error instanceof Error ? error.stack : 'Unknown error'}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix all routes with /api
  
  // Register authentication routes with more debugging
  console.log('Registering auth routes at /api/auth');
  app.use('/api/auth', (req, res, next) => {
    console.log(`Auth route called: ${req.method} ${req.url}`);
    next();
  }, authRoutes);
  
  // Register project routes
  console.log('Registering project routes at /api/projects');
  app.use('/api/projects', projectRoutes);

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
  app.post("/api/sambanova/generate-stream", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { prompt, apiConfig } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          message: "Missing required field: prompt."
        });
      }
      
      // Get authenticated user if available
      let userId = null;
      if (req.user) {
        userId = req.user.id;
      }
      
      // Estimate token usage
      const estimatedTokens = Math.ceil(prompt.length / 4) + 50;
      
      // If user is authenticated, we'll track token usage later
      
      // Enable streaming HTTP response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate the landing page HTML
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      
      try {
        // ALWAYS use the hardcoded API key directly for maximum reliability
        // This ensures it works on all domains including custom domains
        const apiKey = "9f5d2696-9a9f-43a6-9778-ebe727cd2968";
        // Using a hardcoded key prevents any issues with environment variables not being passed properly
        
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
        
        // Check for actual token count in the content (like "1687 tokens" shown in the UI)
        let actualTokens = 0;
        const tokenMatch = fullContent.match(/(\d+)\s+tokens/);
        if (tokenMatch && tokenMatch[1]) {
          actualTokens = parseInt(tokenMatch[1]);
          console.log(`Found actual token count in content: ${actualTokens}`);
        }

        // Estimate token usage based on response length as fallback
        const estimatedTokens = Math.ceil(fullContent.length / 4);
        
        // Use the actual token count if found, otherwise use the estimated value
        const tokensToUse = actualTokens > 0 ? actualTokens : estimatedTokens;
        console.log(`Using token count: ${tokensToUse} (actual: ${actualTokens}, estimated: ${estimatedTokens})`);
        
        // Track usage if user is authenticated
        if (req.user) {
          console.log(`Tracking token usage for user ${req.user.id} with ${tokensToUse} tokens before sending completion`);
          try {
            await pgStorage.updateUserTokenUsage(req.user.id, tokensToUse);
            
            // Get the updated user info with correct counts after the update
            const updatedUser = await pgStorage.getUser(req.user.id);
            
            if (!updatedUser) {
              console.error(`User not found after updating token usage for ID: ${req.user.id}`);
            } else {
              console.log(`Successfully retrieved updated user ${updatedUser.id} with token usage: ${updatedUser.tokenUsage}`);
            
              // Send token usage update event with correct values
              res.write(`data: ${JSON.stringify({ 
                event: 'token-usage-updated',
                tokenUsage: updatedUser.tokenUsage || tokensToUse, 
                generationCount: updatedUser.generationCount || 1
              })}\n\n`);
              
              // Log the values being sent for debugging
              console.log(`Sending token usage update event with tokenUsage:${updatedUser.tokenUsage}, generationCount:${updatedUser.generationCount}`);
            }
          } catch (error) {
            console.error(`Error updating token usage for user ${req.user.id}:`, error);
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
  
  // Add a specific endpoint for updating token usage manually
  app.post("/api/usage/record", authenticate, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { tokenCount } = req.body;
      if (!tokenCount || typeof tokenCount !== 'number') {
        return res.status(400).json({ message: "Token count is required and must be a number" });
      }
      
      console.log(`Manually recording token usage for user ${req.user.id}: ${tokenCount} tokens`);
      
      // Update user token usage in the database
      const updatedUser = await pgStorage.updateUserTokenUsage(req.user.id, tokenCount);
      
      return res.status(200).json({
        message: "Token usage recorded successfully",
        tokenUsage: updatedUser.tokenUsage,
        generationCount: updatedUser.generationCount
      });
    } catch (error) {
      console.error("Error recording token usage:", error);
      return res.status(500).json({ message: "Failed to record token usage" });
    }
  });
  
  // Keep the regular non-streaming endpoint for backward compatibility
  app.post("/api/sambanova/deepsite", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { prompt, category, sections, contentDepth, apiConfig } = req.body;
      
      if (!prompt || !category) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide prompt and category."
        });
      }
      
      // Estimate token usage
      const estimatedTokens = Math.ceil(prompt.length / 4) + 50;
      
      // Call the AI Accelerate Inference API
      const result = await generateLandingPageHtml(prompt, apiConfig);
      
      if (result.success) {
        // Track usage if user is authenticated
        if (req.user) {
          console.log(`Non-streaming API: Tracking token usage for user ${req.user.id} with ${estimatedTokens} tokens`);
          await pgStorage.updateUserTokenUsage(req.user.id, estimatedTokens);
          
          // Get updated stats for logging
          const updatedUser = await pgStorage.getUser(req.user.id);
          console.log(`Non-streaming API: Updated user stats: tokenUsage=${updatedUser?.tokenUsage}, generationCount=${updatedUser?.generationCount}`);
        }
        
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