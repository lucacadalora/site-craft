import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';

// Run migrations - WITH PROTECTION FOR USER DATA
async function runMigration() {
  try {
    console.log('Starting database migration check...');
    
    // SAFETY CHECK: First verify if users table exists and has data
    const checkUsersResult = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = checkUsersResult.rows[0].exists;
    
    if (usersTableExists) {
      // Check if users table has data
      const userCountResult = await db.execute('SELECT COUNT(*) as user_count FROM users;');
      // Safely handle type conversion with fallback to 0
      const countValue = userCountResult.rows[0]?.user_count;
      const userCount = typeof countValue === 'number' ? countValue : 
                       (typeof countValue === 'string' ? parseInt(countValue, 10) : 0);
      
      if (userCount > 0) {
        console.log(`PROTECTED: Found existing users table with ${userCount} users. Preserving user data.`);
        
        // Only create tables that don't exist, NEVER drop existing tables
        console.log('Creating any missing tables without affecting existing data...');
        
        // Check if we need to add any new columns to existing tables
        // This would be the place to add ALTER TABLE statements for schema evolution
        
        // Add display_name column if it doesn't exist in users table
        await db.execute(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'display_name'
            ) THEN
              ALTER TABLE users ADD COLUMN display_name TEXT;
            END IF;
          END $$;
        `);
      } else {
        console.log('Found users table but it has no records. Creating initial schema...');
      }
    } else {
      console.log('No users table found. Creating initial database schema...');
    }
    
    // ALWAYS use CREATE TABLE IF NOT EXISTS to protect existing data
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        token_usage INTEGER DEFAULT 0,
        generation_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        username TEXT UNIQUE
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
    
    console.log('Database migration completed successfully - user data is preserved');
  } catch (error) {
    console.error('Error during database migration:', error);
  }
}

// Run the migration
runMigration();