import { db } from './db';
import { templates } from '@shared/schema';
import { storage } from './storage';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function seedTemplates() {
  console.log('Seeding database with template data...');
  
  try {
    // Get all templates from memory storage
    const memTemplates = await storage.getAllTemplates();
    
    // Insert templates into the database
    for (const template of memTemplates) {
      await db.insert(templates).values(template).onConflictDoUpdate({
        target: templates.id,
        set: {
          name: template.name,
          description: template.description,
          category: template.category,
          thumbnail: template.thumbnail,
          html: template.html,
          css: template.css,
        }
      });
      console.log(`Template ${template.id} (${template.name}) added or updated`);
    }
    
    console.log('Template seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

// Main function to run all seed operations
async function seedDb() {
  try {
    await seedTemplates();
    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed process
seedDb();