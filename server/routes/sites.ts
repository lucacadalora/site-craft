import express, { Request, Response } from 'express';
import { storage } from '../storage';

const router = express.Router();

// Serve published sites
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    
    // Find project by publishPath
    const projects = await storage.getAllProjects();
    const project = projects.find(p => 
      p.published && 
      p.publishPath && 
      p.publishPath.toLowerCase() === slug.toLowerCase()
    );
    
    if (!project || !project.html) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Site Not Found</title>
            <style>
              body { 
                font-family: system-ui, sans-serif; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0; 
                background: #f5f5f5;
              }
              .container { 
                text-align: center; 
                padding: 2rem; 
                background: white; 
                border-radius: 8px; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                max-width: 90%;
              }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Site Not Found</h1>
              <p>The site you're looking for doesn't exist or hasn't been published yet.</p>
              <p><a href="/">Return to homepage</a></p>
            </div>
          </body>
        </html>
      `);
    }
    
    // Create a complete HTML document with embedded CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${project.name || 'Generated Site'}</title>
          <style>${project.css || ''}</style>
        </head>
        <body>
          ${project.html}
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(fullHtml);
  } catch (error) {
    console.error("Error serving published site:", error);
    return res.status(500).send("Error loading site");
  }
});

export default router;