// Create a very simple Express server with database connection
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import OpenAI from 'openai';

// Initialize OpenAI API client if key is available
let openai;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('OpenAI API client initialized successfully');
  } else {
    console.warn('No OpenAI API key found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

// Get current file directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
});

// Create a basic Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Database health check route
app.get('/api/db-health', async (req, res) => {
  try {
    console.log('Database health check endpoint accessed');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    const currentTime = result.rows[0].time;
    client.release();
    
    return res.json({
      status: 'healthy',
      message: 'Database connection is working',
      timestamp: currentTime
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: `Database connection failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Templates route with optional category filter
app.get('/api/templates', async (req, res) => {
  try {
    const category = req.query.category;
    let query = 'SELECT * FROM templates';
    let params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    const client = await pool.connect();
    const result = await client.query(query, params);
    client.release();
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ message: `Failed to fetch templates: ${error.message}` });
  }
});

// Get single template by ID
app.get('/api/templates/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM templates WHERE id = $1',
      [templateId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Template with ID ${templateId} not found` });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching template ${req.params.id}:`, error);
    return res.status(500).json({ message: `Failed to fetch template: ${error.message}` });
  }
});

// Projects routes
app.get('/api/projects', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM projects');
    client.release();
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ message: `Failed to fetch projects: ${error.message}` });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Project with ID ${projectId} not found` });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching project ${req.params.id}:`, error);
    return res.status(500).json({ message: `Failed to fetch project: ${error.message}` });
  }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, prompt, templateId, category, settings } = req.body;
    
    if (!name || !prompt || !templateId || !category) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['name', 'prompt', 'templateId', 'category'] 
      });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO projects (name, description, prompt, template_id, category, settings, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [name, description || null, prompt, templateId, category, settings || {}]
    );
    client.release();
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: `Failed to create project: ${error.message}` });
  }
});

// Update a project
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    
    // Get the current project
    const client = await pool.connect();
    const checkResult = await client.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: `Project with ID ${projectId} not found` });
    }
    
    // Build the update query dynamically based on the fields provided
    const allowedFields = ['name', 'description', 'prompt', 'template_id', 'category', 'html', 'css', 'settings', 'published', 'publish_path'];
    const setFields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // Convert camelCase to snake_case
      if (allowedFields.includes(snakeCaseKey)) {
        setFields.push(`${snakeCaseKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setFields.length === 0) {
      client.release();
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    // Add the ID as the last parameter
    values.push(projectId);
    
    const updateResult = await client.query(
      `UPDATE projects SET ${setFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    client.release();
    return res.json(updateResult.rows[0]);
  } catch (error) {
    console.error(`Error updating project ${req.params.id}:`, error);
    return res.status(500).json({ message: `Failed to update project: ${error.message}` });
  }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const client = await pool.connect();
    const result = await client.query(
      'DELETE FROM projects WHERE id = $1 RETURNING id',
      [projectId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Project with ID ${projectId} not found` });
    }
    
    return res.json({ message: `Project with ID ${projectId} successfully deleted` });
  } catch (error) {
    console.error(`Error deleting project ${req.params.id}:`, error);
    return res.status(500).json({ message: `Failed to delete project: ${error.message}` });
  }
});

// OpenAI API endpoints

// Validate OpenAI API key
app.get('/api/openai/validate', async (req, res) => {
  if (!openai) {
    return res.status(500).json({
      valid: false,
      message: 'OpenAI client not initialized. No API key available.'
    });
  }
  
  try {
    // Make a minimal API call to check if the key is valid
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "API key validation test" }],
      max_tokens: 5
    });
    
    return res.json({
      valid: true,
      message: 'OpenAI API key is valid',
      model: response.model
    });
  } catch (error) {
    console.error('Error validating OpenAI API key:', error);
    return res.status(400).json({
      valid: false,
      message: `OpenAI API key validation failed: ${error.message}`
    });
  }
});

// Estimate token usage for a prompt
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

// Generate landing page content with OpenAI
app.post('/api/openai/generate', async (req, res) => {
  if (!openai) {
    return res.status(500).json({
      error: 'OpenAI client not initialized. No API key available.'
    });
  }
  
  try {
    const { prompt, templateId, settings } = req.body;
    
    if (!prompt || !templateId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['prompt', 'templateId'] 
      });
    }
    
    // Get the template from the database
    const client = await pool.connect();
    const templateResult = await client.query(
      'SELECT * FROM templates WHERE id = $1',
      [templateId]
    );
    
    if (templateResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: `Template with ID ${templateId} not found` });
    }
    
    const template = templateResult.rows[0];
    client.release();
    
    // Construct the system message based on the template
    const systemMessage = `You are an expert landing page builder specializing in ${template.category} websites.
Generate HTML and CSS for a landing page based on this description: "${prompt}".
The landing page should be in the style of the template: ${template.name}.
Follow these style guidelines: ${JSON.stringify(settings || {})}.
Output two separate code blocks: HTML and CSS in JSON format as {"html": "...", "css": "..."}.`;
    
    console.log('Sending request to OpenAI with prompt:', prompt.substring(0, 100) + '...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = JSON.parse(response.choices[0].message.content);
    
    return res.json({
      html: generatedContent.html || '',
      css: generatedContent.css || '',
      usage: response.usage,
      templateId: templateId,
      prompt: prompt
    });
    
  } catch (error) {
    console.error('Error generating content with OpenAI:', error);
    return res.status(500).json({ 
      error: `Failed to generate content: ${error.message}`,
      details: error.response?.data || null
    });
  }
});

// Serve a landing page for the root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LandingCraft API Server</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3 { color: #0070f3; }
          .header { margin-bottom: 40px; }
          .logo { font-size: 2.4rem; font-weight: bold; color: #0070f3; margin-bottom: 10px; }
          .tagline { font-size: 1.2rem; color: #666; margin-bottom: 40px; }
          .card { 
            background-color: #fff; 
            border: 1px solid #eaeaea; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .status-ok { color: #0070f3; background-color: rgba(0,112,243,0.1); padding: 8px 16px; border-radius: 4px; display: inline-block; }
          .endpoints { margin: 30px 0; }
          .endpoint { margin-bottom: 20px; }
          .url { font-family: monospace; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; }
          .description { margin-top: 5px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">LandingCraft</div>
          <div class="tagline">AI-powered landing page generator API server</div>
        </div>
        
        <div class="card">
          <h2>Server Status</h2>
          <p class="status-ok">✓ Server is running</p>
          <p>The API server is operational and ready to process requests.</p>
          
          <div class="status-details">
            <p><strong>Database:</strong> Connected</p>
            <p><strong>OpenAI:</strong> ${openai ? 'Available' : 'Not configured'}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Server Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
        
        <h2 class="endpoints">Available API Endpoints</h2>
        
        <div class="endpoint">
          <h3>Health Check</h3>
          <div class="url">GET /api/health</div>
          <div class="description">Check if the server is running</div>
        </div>
        
        <div class="endpoint">
          <h3>Database Health</h3>
          <div class="url">GET /api/db-health</div>
          <div class="description">Verify database connectivity</div>
        </div>
        
        <div class="endpoint">
          <h3>Templates</h3>
          <div class="url">GET /api/templates</div>
          <div class="description">Get all available templates</div>
        </div>
        
        <div class="endpoint">
          <h3>Templates by Category</h3>
          <div class="url">GET /api/templates?category=education</div>
          <div class="description">Get templates filtered by category</div>
        </div>
        
        <div class="endpoint">
          <h3>Projects</h3>
          <div class="url">GET /api/projects</div>
          <div class="description">Get all projects</div>
        </div>
        
        <div class="endpoint">
          <h3>OpenAI Validation</h3>
          <div class="url">GET /api/openai/validate</div>
          <div class="description">Check if OpenAI API is configured correctly</div>
        </div>
        
        <div class="card">
          <h3>Need more information?</h3>
          <p>For detailed API documentation, example requests, and response formats, refer to the project documentation.</p>
        </div>
      </body>
    </html>
  `);
});

// Add a catch-all route for other non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // For any other routes, send a basic 404 page
  res.status(404).send(`
    <html>
      <head>
        <title>Page Not Found - LandingCraft</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; }
          h1 { color: #0070f3; }
          .back { margin-top: 30px; }
          .back a { color: #0070f3; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <div class="back">
          <a href="/">← Go back to home</a>
        </div>
      </body>
    </html>
  `);
});

// Create and start the server
const server = createServer(app);
const PORT = process.env.PORT || 5000; // Use port 5000 to match Replit's expected port

// Connect to the database before starting the server
async function startServer() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
    
    // Start the server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API server with database support running at http://0.0.0.0:${PORT}`);
      console.log('Press Ctrl+C to stop');
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    console.log('Starting server without database connection...');
    
    // Start the server anyway, just without database functionality
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running without database at http://0.0.0.0:${PORT}`);
      console.log('Press Ctrl+C to stop');
    });
  }
}

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  pool.end().then(() => {
    console.log('Database pool has ended');
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
});

// Start the server
startServer();