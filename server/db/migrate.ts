import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';

// Run migrations
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Drop and recreate tables - be careful with this in production!
    await db.execute(`
      -- Drop existing tables if they exist
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS templates;
      DROP TABLE IF EXISTS users;
    `);
    
    // Create tables based on our latest schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        token_usage INTEGER DEFAULT 0,
        generation_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        prompt TEXT NOT NULL,
        template_id TEXT NOT NULL,
        category TEXT NOT NULL,
        html TEXT,
        css TEXT,
        settings JSON,
        published BOOLEAN DEFAULT FALSE,
        publish_path TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        thumbnail TEXT,
        html TEXT NOT NULL,
        css TEXT NOT NULL
      );
    `);
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
  }
}

// Run the migration
runMigration();