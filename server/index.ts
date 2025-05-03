import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";

// Ensure required environment variables for Replit Auth
if (!process.env.REPLIT_DOMAINS) {
  process.env.REPLIT_DOMAINS = process.env.REPL_SLUG ? 
    `${process.env.REPL_SLUG}.repl.co,${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
    "localhost:5000";
}

if (!process.env.REPL_ID && process.env.REPL_SLUG) {
  process.env.REPL_ID = process.env.REPL_SLUG;
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "landingcraft-session-secret-key";
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for custom domains
app.use((req, res, next) => {
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const host = req.headers.host || 'unknown';
  const origin = req.headers.origin || 'unknown';
  const referer = req.headers.referer || 'unknown';
  
  // Log request info for debugging
  log(`REQUEST: ${req.method} ${path} from host=${host} origin=${origin} referer=${referer}`);
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log all requests for debugging
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms from ${host}`;
    if (capturedJsonResponse && path.startsWith("/api")) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      
      if (logLine.length > 100) {
        logLine = logLine.slice(0, 99) + "…";
      }
    }

    log(logLine);
  });

  next();
});

(async () => {
  let server;
  try {
    // Run Replit Auth migration before setting up routes
    const { runMigration } = await import('./db/migrate-replit-auth');
    await runMigration();
    
    // Create and set up the server
    server = await registerRoutes(app);

    // Global error handler - must be AFTER all other middleware and routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error('Server error:', err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } catch (error) {
    console.error("Failed to initialize server:", error);
    // Create a basic server if registration failed
    server = createServer(app);
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
  });
})();
