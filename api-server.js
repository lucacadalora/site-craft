// Create a very simple Express server for testing
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a basic Express app
const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add a simple middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic health check route
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint accessed');
  return res.json({ 
    status: 'healthy',
    message: 'API server is running',
    timestamp: new Date().toISOString()
  });
});

// Add a root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LandingCraft API Server</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; }
          .card { background-color: #f5f5f5; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
        </style>
      </head>
      <body>
        <h1>LandingCraft API Server</h1>
        <div class="card">
          <h2>Server Status: ✅ Running</h2>
          <p>The API server is running correctly.</p>
        </div>
        <h2>Available API Endpoints:</h2>
        <ul>
          <li><a href="/api/health">/api/health</a> - Check server status</li>
        </ul>
      </body>
    </html>
  `);
});

// Create and start the server
const server = createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple API server running at http://0.0.0.0:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});