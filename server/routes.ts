import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  generatePageSchema, 
  publishSchema, 
  exportSchema,
  apiConfigSchema
} from "@shared/schema";
import { generateHtml } from "./lib/html-generator";
import { generateWithOpenAI, validateOpenAIKey, generateDeepSite } from "./lib/openai";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix all routes with /api
  
  // Environment variables route - expose API keys
  app.get("/api/config", (req, res) => {
    res.json({
      sambaNovaApiKey: process.env.SAMBANOVA_API_KEY || "",
    });
  });
  
  // Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const category = req.query.category as string;
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      
      const templates = await storage.getTemplatesByCategory(category);
      return res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      return res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
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
      const projects = await storage.getAllProjects();
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
      
      const project = await storage.getProject(id);
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
      const project = await storage.createProject(projectData);
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
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const updatedProject = await storage.updateProject(id, req.body);
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
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.deleteProject(id);
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
      const template = await storage.getTemplate(templateId);
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
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (!project.html) {
        return res.status(400).json({ message: "Project has no HTML content to publish" });
      }
      
      // In a real app, you would deploy the page to a server or static hosting
      // For now, we'll simulate it by updating the project's publish path and status
      const publishPath = useCustomDomain ? customDomain : `landingcraft.io/sites/${siteName}`;
      
      const updatedProject = await storage.updateProject(projectId, {
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
      const project = await storage.getProject(id);
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
  
  // DeepSite generation route - for more comprehensive landing pages
  app.post("/api/deepsite", async (req, res) => {
    try {
      // Extract request data
      const { prompt, templateId, category, settings, apiConfig, siteStructure } = req.body;
      
      // Validate essential fields
      if (!prompt || !templateId || !category) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide prompt, templateId, and category." 
        });
      }
      
      // Get the template
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Default to OpenAI provider
      const provider = apiConfig && apiConfig.provider ? apiConfig.provider : "OpenAI (GPT-4o)";
      
      // Check if we support the requested provider
      if (!provider.includes("OpenAI")) {
        return res.status(400).json({ message: "Unsupported API provider for DeepSite generation" });
      }
      
      // Generate the deep site content using OpenAI
      const generatedContent = await generateDeepSite(
        prompt,
        template,
        settings,
        siteStructure || {
          sections: ["hero", "features", "testimonials", "about", "contact"],
          contentDepth: "detailed"
        },
        apiConfig?.apiKey // Pass the provided key or undefined to use the environment variable
      );
      
      // Return the generated content
      return res.json(generatedContent);
    } catch (error) {
      console.error("Error generating DeepSite:", error);
      return res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to generate DeepSite" 
      });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
