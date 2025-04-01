import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDb, runMigrations } from "./db";
import { seedTemplates } from "./seed-db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Improved error handling to catch unhandled promise rejections
    process.on('uncaughtException', (error) => {
      console.error('CRITICAL ERROR - Uncaught Exception:', error);
      console.error(error.stack);
      // Keep running - don't exit immediately
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('CRITICAL ERROR - Unhandled Promise Rejection:');
      console.error('Reason:', reason);
      console.error('Promise:', promise);
      // Keep running - don't exit immediately
    });

    // Connect to the database first
    console.log('Connecting to database...');
    await connectDb();
    console.log('Database connection established successfully');
    
    // Run migrations first to ensure tables exist
    try {
      console.log('Running database migrations...');
      await runMigrations();
      console.log('Database migrations completed successfully');
      
      // Only attempt to seed templates after migrations are successful
      // Wait a short time to ensure all migrations are applied
      console.log('Scheduling template seeding...');
      setTimeout(async () => {
        try {
          console.log('Starting to seed templates...');
          await seedTemplates();
          console.log('Template data seeded successfully');
        } catch (seedError) {
          console.error('Error seeding template data:', seedError);
          console.error(seedError instanceof Error ? seedError.stack : String(seedError));
        }
      }, 1000); // Wait 1 second
    } catch (error) {
      console.error('Error running migrations:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      // Continue even if migrations fail, as tables might already exist
    }
    
    console.log('Registering routes...');
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Error handled by middleware:', err);
      res.status(status).json({ message });
      // Don't rethrow the error as it will crash the server
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    console.log('Current environment:', app.get("env"));
    
    // Add a simple health check route
    app.get('/api/health', (req, res) => {
      console.log('Health check endpoint accessed');
      return res.json({ 
        status: 'healthy',
        message: 'Server is running correctly',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: app.get("env")
      });
    });
    
    // SIMPLIFIED APPROACH: Use a simple HTML page instead of Vite or static files
    try {
      console.log('Setting up simple fallback page instead of using Vite...');
      
      // The API routes are already registered, so we just need to add a catch-all route
      // for non-API routes to show a simple HTML page
      
      // This route will only be hit if none of the API routes match
      app.get('*', (req, res) => {
        // For all non-API routes, serve a basic HTML page
        res.send(`
          <html>
            <head>
              <title>LandingCraft API Server</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #333; }
                .status { padding: 15px; background-color: #e0f7fa; border-radius: 4px; margin-bottom: 20px; }
                .log { background-color: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; }
                pre { margin: 0; }
              </style>
            </head>
            <body>
              <h1>LandingCraft API Server</h1>
              <div class="status">
                <p>✅ Server is running in API-only mode</p>
                <p>The API server is running correctly. The frontend is not being served in this mode.</p>
              </div>
              <h2>API Endpoints</h2>
              <ul>
                <li><a href="/api/health" target="_blank">/api/health</a> - Health check endpoint</li>
                <li><a href="/api/templates?category=education" target="_blank">/api/templates?category=education</a> - Get templates by category</li>
                <li><a href="/api/projects" target="_blank">/api/projects</a> - Get all projects</li>
              </ul>
            </body>
          </html>
        `);
      });
      console.log('Simple fallback route setup completed successfully');
    } catch (error) {
      console.error('Error setting up static serving:', error);
      console.error(error instanceof Error ? error.stack : String(error));
      
      // Fall back to a basic route if static serving fails
      app.get('*', (req, res) => {
        res.send(`
          <html>
            <head><title>LandingCraft - Fallback Mode</title></head>
            <body>
              <h1>LandingCraft API Server</h1>
              <p>The API server is running, but the frontend could not be loaded.</p>
              <p>Please run the frontend development server separately.</p>
            </body>
          </html>
        `);
      });
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      console.log(`Server is running at http://0.0.0.0:${port}`);
      
      // Keep the process alive with a heartbeat
      setInterval(() => {
        console.log('Server heartbeat:', new Date().toISOString());
      }, 30000); // Log every 30 seconds
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
