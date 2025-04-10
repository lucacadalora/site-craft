import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';

// Run migrations
async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // This function will create tables based on our schema defined in shared/schema.ts
    await db.execute(
      `
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
        prompt TEXT,
        html TEXT,
        css TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `
    );
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
  }
}

// Run the migration
runMigration();