import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDb, runMigrations } from './db';
import { seedTemplates } from './seed-db';
import { dbStorage } from './db-storage';
import { 
  insertProjectSchema, 
  generatePageSchema, 
  publishSchema, 
  exportSchema,
  apiConfigSchema
} from "@shared/schema";
import { generateWithOpenAI, validateOpenAIKey } from "./lib/openai";
import fs from 'fs';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// API Routes
// Templates routes
app.get("/api/templates", async (req, res) => {
  try {
    const category = req.query.category as string;
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }
    
    const templates = await dbStorage.getTemplatesByCategory(category);
    return res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({ message: "Failed to fetch templates" });
  }
});

app.get("/api/templates/:id", async (req, res) => {
  try {
    const template = await dbStorage.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return res.status(500).json({ message: "Failed to fetch template" });
  }
});

// Projects routes
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await dbStorage.getAllProjects();
    return res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await dbStorage.getProject(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    return res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return res.status(500).json({ message: "Failed to fetch project" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const projectData = insertProjectSchema.parse(req.body);
    const project = await dbStorage.createProject(projectData);
    return res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create project" });
  }
});

app.patch("/api/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await dbStorage.getProject(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    const updatedProject = await dbStorage.updateProject(id, req.body);
    return res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update project" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const project = await dbStorage.getProject(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    await dbStorage.deleteProject(id);
    return res.status(204).end();
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: "Failed to delete project" });
  }
});

// Generation route
app.post("/api/generate", async (req, res) => {
  try {
    // Validate the request body
    const { prompt, templateId, category, settings, apiConfig } = generatePageSchema.parse(req.body);
    
    // Get the template
    const template = await dbStorage.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Generate the landing page content using OpenAI
    let html, css;
    
    // Default to OpenAI provider
    const provider = apiConfig && apiConfig.provider ? apiConfig.provider : "OpenAI (GPT-4o)";
    
    if (provider.includes("OpenAI")) {
      const generatedContent = await generateWithOpenAI(
        prompt,
        template,
        settings,
        apiConfig?.apiKey // Pass the provided key or undefined to use the environment variable
      );
      
      html = generatedContent.html;
      css = generatedContent.css;
    } else {
      // For now, we're implementing only OpenAI, but other providers could be added here
      return res.status(400).json({ message: "Unsupported API provider" });
    }
    
    // Return the generated content
    return res.json({ html, css });
  } catch (error) {
    console.error("Error generating landing page:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to generate landing page" });
  }
});

// API key validation route
app.post("/api/validate-api-key", async (req, res) => {
  try {
    const { apiKey, provider } = apiConfigSchema.pick({ apiKey: true, provider: true }).parse(req.body);
    
    let isValid = false;
    if (provider.includes("OpenAI")) {
      // Use the provided key or the environment variable
      isValid = await validateOpenAIKey(apiKey || undefined);
    } else {
      // Other providers would be handled here
      return res.status(400).json({ message: "Unsupported API provider" });
    }
    
    if (isValid) {
      return res.status(200).json({ message: "API key is valid" });
    } else {
      return res.status(401).json({ message: "Invalid API key" });
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to validate API key" });
  }
});

// Token estimation route
app.post("/api/estimate-tokens", async (req, res) => {
  try {
    const { prompt, templateId } = req.body;
    
    if (!prompt || !templateId) {
      return res.status(400).json({ message: "Prompt and templateId are required" });
    }
    
    // Simple token estimation algorithm
    // In a real app, you would use a more accurate method
    const estimatedTokens = Math.ceil(prompt.length / 4) + 50;
    
    return res.json({ tokenEstimate: estimatedTokens });
  } catch (error) {
    console.error("Error estimating tokens:", error);
    return res.status(500).json({ message: "Failed to estimate tokens" });
  }
});

// Publish route
app.post("/api/publish", async (req, res) => {
  try {
    const { projectId, siteName, useCustomDomain, customDomain } = publishSchema.parse(req.body);
    
    // Get the project
    const project = await dbStorage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    if (!project.html) {
      return res.status(400).json({ message: "Project has no HTML content to publish" });
    }
    
    // In a real app, you would deploy the page to a server or static hosting
    // For now, we'll simulate it by updating the project's publish path and status
    const publishPath = useCustomDomain ? customDomain : `landingcraft.io/sites/${siteName}`;
    
    const updatedProject = await dbStorage.updateProject(projectId, {
      published: true,
      publishPath,
    });
    
    return res.json({ url: publishPath });
  } catch (error) {
    console.error("Error publishing landing page:", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to publish landing page" });
  }
});

// Export route
app.get("/api/export/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    
    const format = req.query.format as string;
    if (!format || !["html", "pdf"].includes(format)) {
      return res.status(400).json({ message: "Invalid export format" });
    }
    
    // Get the project
    const project = await dbStorage.getProject(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    if (!project.html) {
      return res.status(400).json({ message: "Project has no HTML content to export" });
    }
    
    if (format === "html") {
      // Create a complete HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${project.name}</title>
          <style>${project.css || ''}</style>
        </head>
        <body>
          ${project.html}
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="landingcraft-export.html"`);
      return res.send(fullHtml);
    } else if (format === "pdf") {
      // In a real app, you would generate a PDF
      // For this demo, we'll send a dummy PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="landingcraft-export.pdf"`);
      
      // Dummy PDF content - in a real app, you would use a PDF library
      return res.send(Buffer.from("This would be a PDF of your landing page"));
    }
    
    return res.status(400).json({ message: "Invalid export format" });
  } catch (error) {
    console.error("Error exporting landing page:", error);
    return res.status(500).json({ message: "Failed to export landing page" });
  }
});

// Serve static files from the client/dist directory
const distPath = path.resolve(__dirname, '..', 'dist', 'public');
app.use(express.static(distPath));

// Fallback route to serve index.html for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Start the server
(async () => {
  try {
    // Connect to the database first
    await connectDb();
    console.log('Database connected successfully');
    
    // Run migrations to ensure tables exist
    try {
      await runMigrations();
      console.log('Database migrations completed successfully');
      
      // Only attempt to seed templates after migrations are successful
      try {
        await seedTemplates();
        console.log('Template data seeded successfully');
      } catch (seedError) {
        console.error('Error seeding template data:', seedError);
      }
    } catch (error) {
      console.error('Error running migrations:', error);
      // Continue even if migrations fail, as tables might already exist
    }
    
    // Start the server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      console.log(`Server is running at http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();