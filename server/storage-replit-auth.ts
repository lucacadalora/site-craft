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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Supporting token usage tracking from the existing app
  async updateUserTokenUsage(id: string, tokenCount: number, incrementGenerationCount: boolean = false): Promise<User> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updates: Partial<User> = {
      tokenUsage: (user.tokenUsage || 0) + tokenCount,
      updatedAt: new Date(),
    };

    if (incrementGenerationCount) {
      updates.generationCount = (user.generationCount || 0) + 1;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }
}

export const storage = new DatabaseStorage();