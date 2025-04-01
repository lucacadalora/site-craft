import { connectDb, runMigrations } from './db';
import { seedTemplates } from './seed-db';

// Script to run migrations and seed the database
async function main() {
  try {
    // Connect to the database
    await connectDb();
    console.log('Database connected');
    
    // Run migrations
    await runMigrations();
    console.log('Migrations applied successfully');
    
    // Seed templates
    await seedTemplates();
    console.log('Templates seeded successfully');
    
    console.log('Database setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the main function
main();