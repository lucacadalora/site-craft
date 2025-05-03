import {
  users,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Optional: Supporting token usage tracking from the existing app
  updateUserTokenUsage(id: string, tokenCount: number, incrementGenerationCount?: boolean): Promise<User>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Add timestamps if not provided
    const data = {
      ...userData,
      updatedAt: new Date(),
    };

    // Handle insert with conflict resolution
    const [user] = await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...data,
          // Always update these fields on conflict
          updatedAt: new Date(),
          lastLogin: new Date(),
        },
        // Don't update fields if they're null or undefined in the input
        where: data.username ? eq(users.username, data.username) : undefined,
      })
      .returning();
    
    return user;
  }

  /**
   * Track token usage for a user using Replit Auth
   * This method increments a user's token usage and optionally their generation count
   * It's used to track usage metrics across both traditional auth and Replit Auth
   * 
   * @param id - Replit Auth user ID (string format)
   * @param tokenCount - Number of tokens to add to the user's total
   * @param incrementGenerationCount - Whether to increment generation count (default: false)
   * @returns Updated user object with new metrics
   */
  async updateUserTokenUsage(id: string, tokenCount: number, incrementGenerationCount: boolean = false): Promise<User> {
    console.log(`[Replit Auth] Tracking token usage for user ${id}: ${tokenCount} tokens, incrementGenerationCount=${incrementGenerationCount}`);
    
    // Get the current user data
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (!user) {
      console.error(`[Replit Auth] User with ID ${id} not found for token tracking`);
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Calculate new token usage
    const currentTokens = user.tokenUsage || 0;
    const newTokens = currentTokens + tokenCount;
    
    // Calculate new generation count if required
    const currentGenerations = user.generationCount || 0;
    const newGenerations = incrementGenerationCount ? currentGenerations + 1 : currentGenerations;
    
    console.log(`[Replit Auth] User ${id} metrics: ${currentTokens} → ${newTokens} tokens, ${currentGenerations} → ${newGenerations} generations`);
    
    // Update the user record
    const [updatedUser] = await db
      .update(users)
      .set({ 
        tokenUsage: newTokens,
        generationCount: newGenerations,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();