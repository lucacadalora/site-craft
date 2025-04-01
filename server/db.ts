import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create drizzle client
export const db = drizzle(pool);

export const runMigrations = async () => {
  console.log('Running migrations...');
  try {
    // Use SQL directly to create tables if migrate fails
    // This is a workaround for the journal file issue
    try {
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('Migrations completed successfully');
    } catch (migrateError) {
      console.error('Error with drizzle migrate:', migrateError);
      console.log('Falling back to SQL file execution...');
      
      // Read the SQL file content
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const sqlFilePath = path.join(process.cwd(), 'migrations', '0000_initial.sql');
      const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
      
      // Execute the SQL directly
      await pool.query(sqlContent);
      console.log('Tables created successfully using SQL file');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

export const connectDb = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};