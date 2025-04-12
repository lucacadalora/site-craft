
import { db } from '../db/index';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';

async function deleteUserByEmail(email: string) {
  try {
    console.log(`Attempting to delete user with email: ${email}`);
    
    // First check if the user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    
    if (!existingUser || existingUser.length === 0) {
      console.error(`No user found with email: ${email}`);
      return;
    }
    
    console.log(`Found user: ${existingUser[0].id}, ${existingUser[0].username}`);
    
    // Delete the user
    const result = await db.delete(users).where(eq(users.email, email)).returning();
    
    if (result && result.length > 0) {
      console.log(`Successfully deleted user with email: ${email}`);
      console.log(`Deleted user details: ID=${result[0].id}, Username=${result[0].username}`);
    } else {
      console.error(`Failed to delete user with email: ${email}`);
    }
  } catch (error) {
    console.error(`Error deleting user:`, error);
  } finally {
    process.exit(0);
  }
}

// Replace this with the email you want to delete
const emailToDelete = 'lucacadalora33@gmail.com';
deleteUserByEmail(emailToDelete);
