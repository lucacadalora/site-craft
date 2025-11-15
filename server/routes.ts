import type { Express } from "express";
import { createServer, type Server } from "http";
import { apiConfigSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import { generateLandingPageHtml, generateFallbackHtml, validateSambanovaApiKey } from './lib/sambanova';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import projectManagementRoutes from './routes/project-management';
import sitesRoutes from './routes/sites';
import { authenticate, optionalAuth, AuthRequest } from './middleware/auth';
import { PgStorage } from './db/pg-storage';
import { MemStorage, storage } from './storage';
import { deploymentsStorage } from './db/deployments-storage';
import { db } from './db';
import { processAiResponse, ProjectFile } from './format-ai-response';
import { INITIAL_SYSTEM_PROMPT, FOLLOW_UP_SYSTEM_PROMPT } from './prompts';

// Initialize the database schema and tables only on first run
import './db/migrate'; // This now only creates tables if they don't exist

// Create storage instances
const pgStorage = new PgStorage();
// Keep memStorage for backward compatibility
const memStorage = new MemStorage();

// Global connection tracking for SSE streams (EventSource API)
const streamConnections = new Map<string, { res: any, sessionId: string, heartbeat: NodeJS.Timeout }>();

// Helper function to track token usage - WITH DATA PROTECTION
async function trackTokenUsage(userId: number, tokenCount: number, incrementGenerationCount: boolean = false, res?: any): Promise<void> {
  if (!userId) {
    console.log('No user ID provided, skipping token usage tracking');
    return;
  }
  
  // SAFETY CHECK: Ensure tokenCount is valid to prevent accidental data corruption
  if (typeof tokenCount !== 'number' || isNaN(tokenCount) || tokenCount < 0) {
    console.error(`Invalid token count value: ${tokenCount}. Must be a positive number. Skipping update.`);
    return;
  }
  
  try {
    console.log(`Starting token usage tracking for user ${userId} with ${tokenCount} tokens, incrementGenerationCount: ${incrementGenerationCount}`);
    
    // Get the user to verify they exist - NEVER create or delete user records here
    const user = await pgStorage.getUser(userId);
    if (!user) {
      console.error(`DATA INTEGRITY: Cannot update token usage: User ${userId} not found in database`);
      return;
    }
    
    // Update token usage - limited to just incrementing counters, never deleting data
    const updatedUser = await pgStorage.updateUserTokenUsage(userId, tokenCount, incrementGenerationCount);
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
  
  // Register project management routes (multi-file IDE support)
  console.log('Registering project management routes');
  app.use(projectManagementRoutes);
  
  // Register sites routes for published sites
  console.log('Registering published sites routes at /sites');
  app.use('/sites', sitesRoutes);
  
  // Deploy a landing page
  app.post('/api/deploy', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { slug, html, css, projectId } = req.body;
      
      if (!slug || !html) {
        return res.status(400).json({ 
          success: false,
          message: 'Slug and HTML content are required' 
        });
      }
      
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return res.status(400).json({
          success: false,
          message: 'Slug must contain only lowercase letters, numbers, and hyphens'
        });
      }
      
      // Check if slug is available - using fallback methods if needed
      let slugAvailable = false;
      try {
        // Try to check with deployments table
        slugAvailable = await deploymentsStorage.isSlugAvailable(slug);
      } catch (dbError) {
        // Fallback to projects table
        console.log('Falling back to projects table for slug check in deploy endpoint:', dbError);
        const projects = await storage.getAllProjects();
        const slugExists = projects.some((p: any) => 
          p.publishPath === slug || 
          p.publishPath === `/sites/${slug}` || 
          p.publishPath === `sites/${slug}`
        );
        slugAvailable = !slugExists;
      }
      
      // Verify slug is available
      if (!slugAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Slug is already taken'
        });
      }
      
      // Prepare deployment data
      const deploymentData = {
        slug,
        html,
        css: css || null,
        projectId: projectId || null,
        userId: req.user?.id || null,
        isActive: true
      };
      
      // Try to create in deployments table with fallback to projects
      let deployment;
      try {
        console.log('Attempting to create deployment in deployments table');
        deployment = await deploymentsStorage.createDeployment(deploymentData);
        console.log('Successfully created deployment:', deployment.id);
      } catch (dbError) {
        console.error('Error creating deployment in deployments table:', dbError);
        console.log('Falling back to projects table for deployment creation');
        try {
          // Create a project as fallback
          const project = await storage.createProject({
            name: `Deployed Page: ${slug}`,
            prompt: 'Deployed via editor',
            templateId: 'default',
            category: 'deployed',
            settings: {},
            userId: req.user?.id || null
          });
          
          console.log('Successfully created fallback project:', project.id);
          
          // Update the project with HTML/CSS and mark as published
          deployment = await storage.updateProject(project.id, {
            html,
            css: css || '',
            published: true,
            publishPath: slug
          });
          
          console.log('Successfully updated fallback project with HTML/CSS:', project.id);
        } catch (fallbackError) {
          console.error('Error creating fallback project:', fallbackError);
          throw fallbackError; // Re-throw to be caught by the outer catch block
        }
      }
      
      // Track token usage asynchronously if user is authenticated
      if (req.user?.id) {
        trackTokenUsage(req.user.id, 100, true).catch(error => {
          console.error('Error tracking token usage for deployment:', error);
        });
      }
      
      // Create deployment directory and store files
      const DEPLOYMENTS_DIR = path.join(process.cwd(), 'user_deployments');
      if (!fs.existsSync(DEPLOYMENTS_DIR)) {
        fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
      }
      
      // Create slug directory if it doesn't exist
      const slugDir = path.join(DEPLOYMENTS_DIR, slug);
      if (!fs.existsSync(slugDir)) {
        fs.mkdirSync(slugDir, { recursive: true });
      }
      
      // Write HTML file
      const htmlPath = path.join(slugDir, 'index.html');
      fs.writeFileSync(htmlPath, html);
      
      // Write CSS file if provided
      if (css) {
        const cssPath = path.join(slugDir, 'styles.css');
        fs.writeFileSync(cssPath, css);
      }
      
      return res.json({
        success: true,
        deployment: {
          id: deployment.id,
          slug,
          url: `/sites/${slug}`
        },
        message: 'Deployment created successfully'
      });
    } catch (error) {
      console.error('Error creating deployment:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to create deployment';
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
        console.error('Stack trace:', error.stack);
      }
      
      return res.status(500).json({ 
        success: false, 
        message: errorMessage,
        error: error instanceof Error ? error.toString() : String(error)
      });
    }
  });

  // Endpoint to check if a slug is available (no auth required)
  app.get('/api/check-slug', async (req, res) => {
    try {
      const { slug } = req.query;
      
      if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Slug parameter is required' });
      }
      
      console.log(`Checking availability for slug: ${slug}`);
      
      let slugExists = false;
      
      // First, check the deployments table
      try {
        const isSlugAvailable = await deploymentsStorage.isSlugAvailable(slug);
        if (!isSlugAvailable) {
          console.log(`Slug '${slug}' exists in deployments table`);
          slugExists = true;
        } else {
          console.log(`Slug '${slug}' not found in deployments table`);
        }
      } catch (dbError) {
        // If there's an error checking the deployments table, log it but continue with the legacy check
        console.error(`Error checking deployments table for slug '${slug}':`, dbError);
      }
      
      // If not found in deployments, check legacy projects as a fallback
      if (!slugExists) {
        console.log(`Performing legacy check for slug '${slug}'`);
        const allProjects = await storage.getAllProjects();
        slugExists = allProjects.some((p) => 
          p.publishPath === slug || 
          p.publishPath === `/sites/${slug}` || 
          p.publishPath === `sites/${slug}`
        );
        console.log(`Legacy check result for slug '${slug}': ${slugExists ? 'Exists' : 'Available'}`);
      }

      // Return whether the slug exists or not
      return res.json({ 
        exists: slugExists,
        message: slugExists ? 'Slug is already in use' : 'Slug is available' 
      });
    } catch (error) {
      console.error('Error checking slug:', error);
      return res.status(500).json({ 
        error: 'Failed to check slug availability',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Direct deploy endpoint that doesn't require authentication
  app.post('/api/deploy', optionalAuth, async (req: AuthRequest, res) => {
    console.log('Deploy endpoint called');
    try {
      // Set content type explicitly to application/json
      res.setHeader('Content-Type', 'application/json');
      
      const { html, css, slug, projectId } = req.body;
      
      if (!html) {
        return res.status(400).json({ error: 'HTML content is required' });
      }

      if (!slug) {
        return res.status(400).json({ error: 'Slug is required' });
      }
      
      // Get the user ID from auth if available
      const userId = req.user?.id || null;
      console.log(`Deploy request from user ID: ${userId || 'anonymous'}`);
      
      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ 
          error: 'Slug can only contain lowercase letters, numbers, and hyphens'
        });
      }

      // First check if slug is available in the deployments table
      let slugAvailable = true;
      try {
        console.log(`Checking if slug '${slug}' is available in deployments table`);
        slugAvailable = await deploymentsStorage.isSlugAvailable(slug);
        
        if (!slugAvailable) {
          console.log(`Slug '${slug}' already exists in deployments table`);
          return res.status(409).json({ 
            error: 'This slug is already in use in the deployments system. Please choose another one.' 
          });
        }
      } catch (dbError) {
        console.error('Error checking slug availability in deployments table:', dbError);
        // Continue with legacy check even if deployments table check fails
      }

      // As a fallback, also check legacy projects table
      if (slugAvailable) {
        try {
          const allProjects = await storage.getAllProjects();
          const slugExistsInProjects = allProjects.some((p) => 
            p.publishPath === slug || 
            p.publishPath === `/sites/${slug}` || 
            p.publishPath === `sites/${slug}`
          );

          if (slugExistsInProjects) {
            console.log(`Slug '${slug}' already exists in projects table`);
            return res.status(409).json({ 
              error: 'This slug is already in use in the legacy system. Please choose another one.' 
            });
          }
        } catch (projectError) {
          console.error('Error checking slug in projects table:', projectError);
          // Continue even if project check fails - we'll use the deployments table
        }
      }

      // Create deployment in the deployments table
      try {
        console.log(`Creating deployment for slug '${slug}' with userId=${userId}, projectId=${projectId || 'null'}`);
        
        const deployment = await deploymentsStorage.createDeployment({
          slug,
          html,
          css: css || null,
          userId: userId,
          projectId: projectId || null,
          isActive: true
        });
        
        console.log(`Successfully created deployment with ID ${deployment.id}`);
        
        // Return success with the published URL
        return res.status(200).json({
          success: true,
          publishUrl: `/sites/${slug}`,
          deployment: {
            id: deployment.id,
            slug: deployment.slug,
            createdAt: deployment.createdAt
          }
        });
      } catch (deploymentError) {
        console.error('Error creating deployment in deployments table:', deploymentError);
        
        // Try the legacy fallback with projects if deployments table fails
        try {
          console.log('Trying legacy fallback with projects table');
          // Create a new project for the deployment as fallback
          const project = await storage.createProject({
            name: `Deployed Page: ${slug}`,
            prompt: 'Deployed from editor',
            templateId: 'default',
            category: 'deployed',
            settings: {},
            userId: userId || undefined
          });

          // Update the project with the HTML and CSS content
          const updatedProject = await storage.updateProject(project.id, {
            html,
            css: css || '',
            published: true,
            publishPath: slug
          });

          console.log(`Successfully created fallback project with ID ${project.id}`);
          
          // Return success with the published URL
          return res.status(200).json({
            success: true,
            publishUrl: `/sites/${slug}`,
            project: updatedProject,
            fallbackUsed: true
          });
        } catch (fallbackError) {
          console.error('Both deployment systems failed:', fallbackError);
          throw deploymentError; // Re-throw the original error
        }
      }
    } catch (error) {
      console.error('Error in deploy endpoint:', error);
      return res.status(500).json({ 
        error: 'Failed to deploy page', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

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

  // Endpoint to check if the deployments table exists
  app.get("/api/check-deployment-table", async (req, res) => {
    try {
      // Check if the deployments table exists in the database
      const tableCheckResult = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'deployments'
        );
      `);
      
      const deploymentsTableExists = tableCheckResult.rows[0].exists;
      
      return res.json({ 
        exists: deploymentsTableExists,
        message: deploymentsTableExists 
          ? 'Deployments table exists in the database' 
          : 'Deployments table does not exist in the database'
      });
    } catch (error) {
      console.error('Error checking deployments table:', error);
      return res.status(500).json({ 
        error: 'Failed to check deployments table',
        details: error instanceof Error ? error.message : String(error)
      });
    }
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
      
      // Enable streaming HTTP response with anti-buffering headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.setHeader('Content-Encoding', 'identity'); // Explicitly disable compression
      res.flushHeaders(); // Immediately send headers to establish the connection
      
      // Minimize TCP buffering for immediate chunk delivery
      if (res.socket) {
        res.socket.setNoDelay(true);
      }
      
      // Generate the landing page HTML
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
      
      try {
        // Use environment variable for API key (NEVER hardcode sensitive keys)
        const apiKey = process.env.SAMBANOVA_API_KEY || "";
        if (!apiKey) {
          console.error("SAMBANOVA_API_KEY environment variable not set");
          res.write(`data: ${JSON.stringify({ 
            event: 'error', 
            message: 'API key not configured. Please set SAMBANOVA_API_KEY environment variable.'
          })}\n\n`);
          return res.end();
        }
        
        console.log("Generating HTML with AI Accelerate Inference API using streaming for prompt:", prompt.substring(0, 50) + "...");
        
        // Prepare the system prompt and user message for multi-file generation
        const systemMessage = {
          role: "system",
          content: INITIAL_SYSTEM_PROMPT
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
          
          // Helper function to flush response
          const flushResponse = () => {
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          };
          
          // Send error and then fallback content as a stream event
          res.write(`data: ${JSON.stringify({ 
            event: 'error', 
            message: `API error: ${apiResponse.status} - ${errorText}`
          })}\n\n`);
          flushResponse();
          
          // Send fallback HTML
          const fallbackHtml = generateFallbackHtml(title, prompt);
          res.write(`data: ${JSON.stringify({ 
            event: 'complete', 
            html: fallbackHtml,
            source: 'fallback'
          })}\n\n`);
          flushResponse();
          
          return res.end();
        }
        
        // Initialize for processing HTML chunks
        console.log("AI Accelerate Inference API response received, streaming to client");
        const reader = apiResponse.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }
        
        // Helper function to flush response immediately after each write
        const flushResponse = () => {
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        };
        
        // Send an initial message
        res.write(`data: ${JSON.stringify({ 
          event: 'start',
          message: 'Generation started' 
        })}\n\n`);
        flushResponse(); // Force immediate send
        
        // Stream all chunks directly to the client
        let fullContent = "";
        let filesDetected = false;
        
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
                    
                    // Debug: Log chunk receipt
                    console.log(`[STREAM] Received chunk: ${contentChunk.length} chars, total: ${fullContent.length}`);
                    
                    // Check if this looks like multi-file output
                    if (!filesDetected && (
                      contentChunk.includes("PROJECT_NAME_START") || 
                      contentChunk.includes("NEW_FILE_START") ||
                      contentChunk.includes("```html") ||
                      contentChunk.includes("```css") ||
                      contentChunk.includes("```javascript")
                    )) {
                      filesDetected = true;
                    }
                    
                    // Send the chunk to the client with metadata
                    res.write(`data: ${JSON.stringify({ 
                      event: 'chunk', 
                      content: contentChunk,
                      isMultiFile: filesDetected
                    })}\n\n`);
                    flushResponse(); // Force immediate send of each chunk
                    console.log(`[STREAM] Sent chunk to client: ${contentChunk.length} chars`);
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
            // Set incrementGenerationCount to true for the streaming endpoint - this is the main token usage tracking
            await pgStorage.updateUserTokenUsage(req.user.id, tokensToUse, true);
            
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
              flushResponse();
              
              // Log the values being sent for debugging
              console.log(`Sending token usage update event with tokenUsage:${updatedUser.tokenUsage}, generationCount:${updatedUser.generationCount}`);
            }
          } catch (error) {
            console.error(`Error updating token usage for user ${req.user.id}:`, error);
          }
        }
        
        // Parse multi-file output if detected
        let parsedResult = null;
        if (filesDetected) {
          try {
            parsedResult = processAiResponse(fullContent);
            console.log(`Parsed multi-file project: ${parsedResult.projectName} with ${parsedResult.files.length} files`);
          } catch (parseError) {
            console.error("Error parsing multi-file response:", parseError);
          }
        }
        
        // Send completion event with token information and parsed files
        console.log("Streaming completed, sending final event");
        
        // Calculate token estimate for client reference
        const tokenEstimate = Math.round(fullContent.length / 4);
        
        res.write(`data: ${JSON.stringify({ 
          event: 'complete', 
          html: parsedResult ? null : fullContent, // Only send HTML if not multi-file
          files: parsedResult?.files || null, // Send parsed files if available
          projectName: parsedResult?.projectName || title,
          source: 'api',
          tokenCount: tokenEstimate,
          // Include stats to help UI understand processing
          stats: {
            tokens: tokenEstimate,
            characters: fullContent.length,
            filesCount: parsedResult?.files.length || 0,
            // If we tracked user info, include that too
            userId: req.user?.id || null,
            generationCount: req.user ? 1 : 0
          }
        })}\n\n`);
        flushResponse();
      } catch (error) {
        console.error("Error streaming from AI Accelerate Inference API:", error);
        
        // Helper function to flush response
        const flushResponse = () => {
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        };
        
        // Send error as a stream event
        res.write(`data: ${JSON.stringify({ 
          event: 'error', 
          message: error instanceof Error ? error.message : "Error streaming from API"
        })}\n\n`);
        flushResponse();
        
        // Send fallback content
        const fallbackHtml = generateFallbackHtml(title, prompt);
        res.write(`data: ${JSON.stringify({ 
          event: 'complete', 
          html: fallbackHtml,
          source: 'fallback'
        })}\n\n`);
        flushResponse();
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

  // GET endpoint for true real-time SSE streaming (EventSource API)
  app.get("/api/sambanova/stream/:sessionId", optionalAuth, async (req: AuthRequest, res) => {
    const sessionId = req.params.sessionId;
    const prompt = req.query.prompt as string;
    
    if (!prompt) {
      return res.status(400).json({ message: "Missing required query parameter: prompt" });
    }

    try {
      // Set SSE headers for EventSource compatibility
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Content-Encoding': 'none' // Disable compression
      });
      
      // Disable TCP buffering immediately
      if (res.socket) {
        res.socket.setNoDelay(true);
        res.socket.setTimeout(0);
      }

      // Helper function to flush response immediately
      const flushResponse = () => {
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      };
      
      // Send padding to break buffering (2KB minimum for most buffers)
      res.write(':' + ' '.repeat(2048) + '\n\n');
      flushResponse();
      
      // Send initial connection message
      res.write(`data: ${JSON.stringify({ 
        type: 'connected',
        sessionId,
        timestamp: new Date().toISOString()
      })}\n\n`);
      flushResponse();

      // Setup heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeat);
        }
      }, 30000);

      // Store connection for cleanup
      streamConnections.set(sessionId, { res, sessionId, heartbeat });

      // Cleanup on disconnect
      req.on('close', () => {
        console.log(`SSE connection closed for session: ${sessionId}`);
        clearInterval(heartbeat);
        streamConnections.delete(sessionId);
      });

      // Get authenticated user if available
      const userId = req.user?.id || null;
      const title = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;

      // Send start event
      res.write(`data: ${JSON.stringify({ 
        type: 'start',
        message: 'Generation started' 
      })}\n\n`);
      flushResponse();

      // Call the AI API
      const apiKey = "9f5d2696-9a9f-43a6-9778-ebe727cd2968";
      console.log("Generating HTML with AI Accelerate (GET/EventSource) for prompt:", prompt.substring(0, 50) + "...");

      const systemMessage = {
        role: "system",
        content: `ONLY USE HTML, CSS AND JAVASCRIPT. Your response must begin with <!DOCTYPE html> and contain only valid HTML. If you want to use icons make sure to import the library first. Try to create the best UI possible by using only HTML, CSS and JAVASCRIPT. Use as much as you can TailwindCSS for the CSS, if you can't do something with TailwindCSS, then use custom CSS (make sure to import <script src="https://cdn.tailwindcss.com"></script> in the head). Create something unique and directly relevant to the prompt. DO NOT include irrelevant content about places like Surakarta (Solo) or any other unrelated topics - stick strictly to what's requested in the prompt. DO NOT include any explanation, feature list, or description text before or after the HTML code. ALWAYS GIVE THE RESPONSE AS A SINGLE HTML FILE STARTING WITH <!DOCTYPE html>`
      };

      const userMessage = {
        role: "user",
        content: `Create a landing page for: ${prompt}`
      };

      const apiResponse = await fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          stream: true,
          model: "DeepSeek-V3-0324",
          messages: [systemMessage, userMessage]
        })
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("AI API error:", apiResponse.status, errorText);
        
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `API error: ${apiResponse.status}`
        })}\n\n`);
        
        const fallbackHtml = generateFallbackHtml(title, prompt);
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          html: fallbackHtml,
          source: 'fallback'
        })}\n\n`);
        
        return res.end();
      }

      // Stream the response with proper SSE buffering
      const reader = apiResponse.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let fullContent = "";
      let htmlStarted = false;
      let sseBuffer = ""; // Buffer for incomplete SSE frames

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        const chunk = new TextDecoder().decode(value, { stream: true });
        sseBuffer += chunk;
        
        // Process complete SSE messages (ending with \n\n)
        let boundary = sseBuffer.indexOf('\n\n');
        while (boundary !== -1) {
          const message = sseBuffer.substring(0, boundary);
          sseBuffer = sseBuffer.substring(boundary + 2);
          
          // Parse the SSE message
          const lines = message.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const jsonData = JSON.parse(jsonStr);
                if (jsonData.choices?.[0]?.delta?.content) {
                  const contentChunk = jsonData.choices[0].delta.content;
                  fullContent += contentChunk;

                  if (!htmlStarted && (
                    contentChunk.includes("<!DOCTYPE") || 
                    contentChunk.includes("<html") || 
                    contentChunk.includes("<head") ||
                    contentChunk.includes("<body")
                  )) {
                    htmlStarted = true;
                  }

                  // Send chunk to client with EventSource format
                  res.write(`data: ${JSON.stringify({ 
                    type: 'chunk', 
                    content: contentChunk,
                    isHtml: htmlStarted
                  })}\n\n`);
                  
                  // CRITICAL: Flush immediately to prevent buffering
                  flushResponse();
                  
                  console.log(`[SSE] Sent chunk: ${contentChunk.length} chars to session ${sessionId}`);
                }
              } catch (e) {
                console.error("Error parsing JSON chunk:", e, jsonStr.substring(0, 100));
              }
            }
          }
          
          // Check for next boundary
          boundary = sseBuffer.indexOf('\n\n');
        }
      }

      // Track usage if user is authenticated
      const tokensToUse = Math.ceil(fullContent.length / 4);
      if (userId) {
        try {
          await pgStorage.updateUserTokenUsage(userId, tokensToUse, true);
          const updatedUser = await pgStorage.getUser(userId);
          
          if (updatedUser) {
            res.write(`data: ${JSON.stringify({ 
              type: 'token-usage-updated',
              tokenUsage: updatedUser.tokenUsage,
              generationCount: updatedUser.generationCount
            })}\n\n`);
            flushResponse();
          }
        } catch (error) {
          console.error(`Error updating token usage for user ${userId}:`, error);
        }
      }

      // Send completion
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        html: fullContent,
        source: 'api',
        tokenCount: tokensToUse
      })}\n\n`);
      flushResponse();

      // Clean up connection tracking and end response
      const connection = streamConnections.get(sessionId);
      if (connection) {
        clearInterval(connection.heartbeat);
        streamConnections.delete(sessionId);
      }
      res.end();
      console.log(`SSE stream completed for session: ${sessionId}`);

    } catch (error) {
      console.error("Error in SSE stream:", error);
      
      // Clean up on error
      const connection = streamConnections.get(sessionId);
      if (connection) {
        clearInterval(connection.heartbeat);
        streamConnections.delete(sessionId);
      }
      
      if (!res.headersSent) {
        return res.status(500).json({ message: "Stream error" });
      }
      res.end();
    }
  });
  
  // Add a specific endpoint for updating token usage manually - WITH DATA PROTECTION
  app.post("/api/usage/record", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { tokenCount, isGeneration } = req.body;
      
      // If no user is authenticated, just acknowledge the request without tracking
      if (!req.user) {
        console.log('Token usage received from anonymous user:', tokenCount);
        return res.status(200).json({ 
          message: "Token usage noted (anonymous user)",
          anonymous: true,
          tokenCount
        });
      }
      
      // SAFETY CHECK: Enhanced validation for tokenCount
      if (typeof tokenCount !== 'number' || isNaN(tokenCount) || tokenCount < 0 || tokenCount > 100000) {
        console.error(`DATA INTEGRITY: Invalid token count value: ${tokenCount}`);
        return res.status(400).json({ 
          message: "Token count is required and must be a positive number less than 100,000" 
        });
      }
      
      console.log(`Manually recording token usage for user ${req.user.id}: ${tokenCount} tokens, isGeneration: ${isGeneration}`);
      
      // Check if user exists first - NEVER create sensitive records without explicit user action
      let user = await pgStorage.getUser(req.user.id);
      
      if (!user) {
        // DATA PROTECTION: Log but don't automatically create user records
        // This could indicate an authentication issue that should be resolved properly
        console.error(`DATA INTEGRITY PROTECTION: User ${req.user.id} not found in database. Token usage not recorded.`);
        return res.status(404).json({ 
          message: "User account not found in database. Please log out and register again." 
        });
      }
      
      try {
        // Update user token usage in the database using our protected helper function
        // Increment generation count if this is a generation (true)
        await trackTokenUsage(req.user.id, tokenCount, isGeneration === true);
        
        // Get updated user to return the current values
        const updatedUser = await pgStorage.getUser(req.user.id);
        
        return res.status(200).json({
          message: "Token usage recorded successfully",
          tokenUsage: updatedUser?.tokenUsage || 0,
          generationCount: updatedUser?.generationCount || 0
        });
      } catch (updateError) {
        console.error("Error updating token usage:", updateError);
        return res.status(500).json({ 
          message: "Failed to update token usage",
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
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
          // Set incrementGenerationCount to true here since this is a primary generation endpoint
          await pgStorage.updateUserTokenUsage(req.user.id, estimatedTokens, true);
          
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