import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index';

// This will create tables if they don't exist and keep them in sync with the schema
async function runMigration() {
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();