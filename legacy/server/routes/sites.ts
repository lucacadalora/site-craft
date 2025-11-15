import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { deploymentsStorage } from '../db/deployments-storage';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Create deployments directory if it doesn't exist
const DEPLOYMENTS_DIR = path.join(process.cwd(), 'user_deployments');
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  console.log(`Created deployments directory at ${DEPLOYMENTS_DIR}`);
}

/**
 * Generate a static 404 page
 */
function generateNotFoundPage() {
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>Page Not Found</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #f9fafb;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          text-align: center;
        }
        .container {
          max-width: 500px;
          padding: 40px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        p {
          color: #6b7280;
          margin-bottom: 24px;
        }
        .back-link {
          display: inline-block;
          padding: 10px 16px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .back-link:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been removed.</p>
        <a href="/" class="back-link">Back to Home</a>
      </div>
    </body>
  </html>`;
}

/**
 * Store HTML content to the file system
 */
async function storeDeploymentFiles(slug: string, html: string, css?: string): Promise<string> {
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
  
  return slugDir;
}

/**
 * GET /sites/:slug
 * Serves a published landing page by its slug
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).send('Slug is required');
    }
    
    console.log(`Serving site with slug: ${slug}`);
    
    // First check in the database
    const deployment = await deploymentsStorage.getDeploymentBySlug(slug);
    
    if (deployment) {
      console.log(`Found deployment in database: ${deployment.id}`);
      
      // Increment the visit count asynchronously
      deploymentsStorage.incrementDeploymentVisitCount(deployment.id)
        .catch(err => console.error(`Failed to increment visit count: ${err.message}`));
      
      // Check if the deployment is stored in the filesystem
      const slugDir = path.join(DEPLOYMENTS_DIR, slug);
      const htmlPath = path.join(slugDir, 'index.html');
      
      if (fs.existsSync(htmlPath)) {
        // Serve from filesystem if available
        console.log(`Serving from file: ${htmlPath}`);
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        return res.send(htmlContent);
      }
      
      // If not in filesystem, store it now and serve from database
      try {
        await storeDeploymentFiles(slug, deployment.html, deployment.css || undefined);
        console.log(`Stored deployment files for slug: ${slug}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to store deployment files: ${errorMessage}`);
      }
      
      // Serve the HTML content from the database
      return res.send(deployment.html);
    }
    
    // For backward compatibility, check the old way
    const projects = await storage.getAllProjects();
    const project = projects.find(p => 
      p.publishPath === slug || 
      p.publishPath === `/sites/${slug}` || 
      p.publishPath === `sites/${slug}`
    );
    
    if (project && project.html) {
      console.log(`Found project with matching publishPath: ${project.id}`);
      
      // For old projects, try to migrate them to the new system
      try {
        // Create a deployment entry for this project
        if (project.userId) {
          const deploymentData = {
            slug,
            html: project.html,
            css: project.css || null,
            projectId: project.id,
            userId: project.userId,
            isActive: true
          };
          
          // Store in database
          const newDeployment = await deploymentsStorage.createDeployment(deploymentData);
          console.log(`Migrated old project to deployment system: ${newDeployment.id}`);
          
          // Store in filesystem
          await storeDeploymentFiles(slug, project.html, project.css || undefined);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to migrate project to deployment: ${errorMessage}`);
      }
      
      // Serve the HTML content
      return res.send(project.html);
    }
    
    // Not found in either system
    return res.status(404).send(generateNotFoundPage());
  } catch (error) {
    console.error('Error serving site:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * POST /sites/:slug/check
 * Check if a slug is available
 */
router.post('/:slug/check', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ 
        success: false, 
        message: 'Slug is required' 
      });
    }
    
    // Check if slug is valid
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug must contain only lowercase letters, numbers, and hyphens'
      });
    }
    
    // Fallback check using projects table since deployments table may not exist yet
    try {
      // First try the deployments storage method (if table exists)
      const isAvailable = await deploymentsStorage.isSlugAvailable(slug);
      
      return res.json({
        success: true,
        isAvailable,
        message: isAvailable 
          ? 'Slug is available' 
          : 'Slug is already taken'
      });
    } catch (dbError) {
      console.log('Falling back to projects table for slug check');
      
      // Fallback to checking projects table
      const projects = await storage.getAllProjects();
      const slugExists = projects.some(p => 
        p.publishPath === slug || 
        p.publishPath === `/sites/${slug}` || 
        p.publishPath === `sites/${slug}`
      );

      return res.json({
        success: true,
        isAvailable: !slugExists,
        message: !slugExists
          ? 'Slug is available'
          : 'Slug is already taken'
      });
    }
  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error' 
    });
  }
});

export default router;