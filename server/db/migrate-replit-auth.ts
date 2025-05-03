import { db } from '../db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

// This function will create the necessary tables for Replit Auth
// It's designed to not break existing data where possible
export async function migrateReplitAuth() {
  try {
    console.log('Starting Replit Auth database migration...');

    // Check if sessions table exists
    const sessionsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      );
    `);
    
    if (!sessionsTableExists.rows[0].exists) {
      console.log('Creating sessions table for Replit Auth...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
      `);
      console.log('Sessions table created successfully');
    } else {
      console.log('Sessions table already exists');
    }

    // Check if the users table needs to be updated
    // We need to check if the id column is a serial (which would mean it's the old schema)
    const idColumnTypeQuery = await db.execute(sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);

    if (idColumnTypeQuery.rows.length > 0 && idColumnTypeQuery.rows[0].data_type === 'integer') {
      console.log('Migrating users table to support Replit Auth...');
      
      // First, drop the foreign key constraints so we can modify the users table
      console.log('Dropping foreign key constraints...');
      await db.execute(sql`
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
        ALTER TABLE deployments DROP CONSTRAINT IF EXISTS deployments_user_id_fkey;
      `);
      
      // Modify the existing users table directly rather than doing a drop and recreate
      console.log('Altering users table structure...');
      await db.execute(sql`
        -- Alter the ID column to be VARCHAR
        ALTER TABLE users 
        ALTER COLUMN id TYPE VARCHAR USING id::VARCHAR;
        
        -- Add the new columns for Replit Auth
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS first_name VARCHAR,
        ADD COLUMN IF NOT EXISTS last_name VARCHAR,
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        
        -- Ensure username is not null (fill in with email if it's null)
        UPDATE users 
        SET username = email 
        WHERE username IS NULL;
        
        -- Make username NOT NULL
        ALTER TABLE users 
        ALTER COLUMN username SET NOT NULL;
      `);
      
      console.log('Users table successfully migrated to support Replit Auth');
    } else if (idColumnTypeQuery.rows.length === 0) {
      // Users table doesn't exist, create it
      console.log('Creating users table for Replit Auth...');
      await db.execute(sql`
        CREATE TABLE users (
          id VARCHAR PRIMARY KEY,
          username VARCHAR UNIQUE NOT NULL,
          email VARCHAR UNIQUE,
          first_name VARCHAR,
          last_name VARCHAR,
          bio TEXT,
          profile_image_url VARCHAR,
          token_usage INTEGER DEFAULT 0,
          generation_count INTEGER DEFAULT 0,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Users table created successfully');
    } else {
      console.log('Users table already updated for Replit Auth');
    }

    // Update the projects table's user_id foreign key if needed
    const projectsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'projects'
      );
    `);

    if (projectsTableExists.rows[0].exists) {
      console.log('Updating projects table foreign key...');
      
      // Drop the foreign key constraint if it exists
      try {
        await db.execute(sql`
          ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
        `);
      } catch (error) {
        console.log('No foreign key constraint found on projects table');
      }
      
      // Update the user_id column type
      await db.execute(sql`
        ALTER TABLE projects 
        ALTER COLUMN user_id TYPE VARCHAR USING user_id::VARCHAR;
      `);
      
      console.log('Projects table updated successfully');
    }

    // Update the deployments table's user_id foreign key if needed
    const deploymentsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'deployments'
      );
    `);

    if (deploymentsTableExists.rows[0].exists) {
      console.log('Updating deployments table foreign key...');
      
      // Drop the foreign key constraint if it exists
      try {
        await db.execute(sql`
          ALTER TABLE deployments DROP CONSTRAINT IF EXISTS deployments_user_id_fkey;
        `);
      } catch (error) {
        console.log('No foreign key constraint found on deployments table');
      }
      
      // Update the user_id column type
      await db.execute(sql`
        ALTER TABLE deployments 
        ALTER COLUMN user_id TYPE VARCHAR USING user_id::VARCHAR;
      `);
      
      console.log('Deployments table updated successfully');
    }

    console.log('Replit Auth database migration completed successfully');
  } catch (error) {
    console.error('Error during Replit Auth database migration:', error);
    throw error;
  }
}

// Run the migration directly
migrateReplitAuth()
  .then(() => console.log('Replit Auth migration complete'))
  .catch(err => {
    console.error('Replit Auth migration failed:', err);
    process.exit(1);
  });