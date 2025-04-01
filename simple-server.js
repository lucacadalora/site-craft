const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Create Express app
const app = express();
app.use(express.json());

// Connection to PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Simple health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    const timestamp = dbResult.rows[0].now;
    
    return res.json({
      status: 'healthy',
      message: 'Server is running correctly',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTimestamp: timestamp
    });
  } catch (err) {
    console.error('Database health check failed:', err);
    return res.status(500).json({
      status: 'unhealthy',
      message: 'Server is running but database connection failed',
      error: err.message
    });
  }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM templates';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ message: 'Failed to fetch templates', error: err.message });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: 'Failed to fetch projects', error: err.message });
  }
});

// Check OpenAI API key validity
app.post('/api/openai/validate', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return res.status(400).json({ 
      valid: false, 
      message: 'No API key provided in environment variables' 
    });
  }
  
  // We're just checking if the key exists in environment variables
  // In a real implementation, we would make a test call to OpenAI
  return res.json({
    valid: true,
    message: 'OpenAI API key is available'
  });
});

// Estimate token usage
app.post('/api/openai/estimate-tokens', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  // Simple approximation: ~4 characters per token
  const estimatedTokens = Math.ceil(prompt.length / 4);
  
  res.json({
    prompt,
    estimatedTokens,
    estimatedCost: (estimatedTokens / 1000) * 0.03 // Approximate cost at $0.03 per 1K tokens
  });
});

// Root route for status information
app.get('/', (req, res) => {
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  
  // Keep the process alive with a heartbeat
  setInterval(() => {
    console.log('Server heartbeat:', new Date().toISOString());
  }, 30000);
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep running instead of crashing
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Keep running instead of crashing
});