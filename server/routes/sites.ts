import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

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
    
    // Find projects with this publish path
    const projects = await storage.getAllProjects();
    const project = projects.find(p => 
      p.publishPath === slug || 
      p.publishPath === `/sites/${slug}` || 
      p.publishPath === `sites/${slug}`
    );
    
    if (!project || !project.html) {
      return res.status(404).send(`
        <!DOCTYPE html>
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
        </html>
      `);
    }
    
    // Serve the HTML content
    res.send(project.html);
  } catch (error) {
    console.error('Error serving site:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;