import { db } from './index';
import bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';
import { users, templates, projects } from '@shared/schema';
import type { User, Template, Project, InsertUser, InsertTemplate, InsertProject } from '@shared/schema';
import { IStorage } from '../storage';

export class PgStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      console.log(`Getting user with ID: ${id}`);
      const results = await db.select().from(users).where(eq(users.id, id));
      
      if (!results || results.length === 0) {
        console.error(`No user found with ID: ${id}`);
        return undefined;
      }
      
      console.log(`Found user: ${results[0].id}, ${results[0].username}, tokenUsage: ${results[0].tokenUsage}, generationCount: ${results[0].generationCount}`);
      return results[0];
    } catch (error) {
      console.error(`Error in getUser(${id}):`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Password should already be hashed by the route handler
    // Insert user with the provided (already hashed) password
    const result = await db.insert(users).values({
      ...insertUser,
      tokenUsage: 0,
      generationCount: 0,
      // createdAt is handled by defaultNow()
    }).returning();

    console.log('User created in database with ID:', result[0].id);
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    // Password should already be hashed by the route handler if it's included
    // No need to rehash passwords here

    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    console.log('User updated in database:', id);
    return result[0];
  }

  async updateUserTokenUsage(id: number, tokenCount: number): Promise<User> {
    try {
      console.log(`Updating token usage for user ${id} with ${tokenCount} tokens`);
      
      // Get current user
      const user = await this.getUser(id);
      if (!user) {
        console.error(`User with ID ${id} not found for token usage update`);
        throw new Error(`User with ID ${id} not found`);
      }
      
      console.log(`Current token usage for user ${id}: ${user.tokenUsage || 0}, generations: ${user.generationCount || 0}`);

      // Calculate new values
      const newTokenUsage = (user.tokenUsage || 0) + tokenCount;
      const newGenerationCount = (user.generationCount || 0) + 1;
      
      console.log(`New token usage will be: ${newTokenUsage}, new generation count: ${newGenerationCount}`);

      // Update token usage and generation count
      const result = await db
        .update(users)
        .set({
          tokenUsage: newTokenUsage,
          generationCount: newGenerationCount,
        })
        .where(eq(users.id, id))
        .returning();

      if (!result || result.length === 0) {
        console.error(`Failed to update token usage for user ${id}`);
        throw new Error(`Failed to update token usage for user ${id}`);
      }

      console.log(`Successfully updated token usage for user ${id}`);
      return result[0];
    } catch (error) {
      console.error(`Error in updateUserTokenUsage:`, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    const results = await db.select().from(templates).where(eq(templates.id, id));
    return results[0];
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.category, category));
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    // Don't manually add createdAt as it's handled by defaultNow()
    const result = await db.insert(templates).values({
      ...template,
    }).returning();

    return result[0];
  }

  async updateTemplate(id: string, templateUpdate: Partial<Template>): Promise<Template> {
    const result = await db
      .update(templates)
      .set(templateUpdate)
      .where(eq(templates.id, id))
      .returning();

    return result[0];
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const results = await db.select().from(projects).where(eq(projects.id, id));
    return results[0];
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    // Note: createdAt and updatedAt are handled by defaultNow() in the schema
    const result = await db.insert(projects).values({
      ...project
    }).returning();

    return result[0];
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project> {
    // Note: for updatedAt, you'd typically use a trigger in the database
    // For this implementation, we'll only update the fields provided
    const result = await db
      .update(projects)
      .set(projectUpdate)
      .where(eq(projects.id, id))
      .returning();

    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}