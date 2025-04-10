import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { 
  InsertProject, 
  Project, 
  InsertTemplate, 
  Template, 
  InsertUser, 
  User,
  projects,
  templates,
  users
} from "@shared/schema";
import { IStorage } from '../storage';
import { db } from './index';

export class PgStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    // Insert the user with the hashed password
    const result = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    // If password is being updated, hash it
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async updateUserTokenUsage(id: number, tokenCount: number): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const result = await db.update(users)
      .set({ 
        tokenUsage: (user.tokenUsage || 0) + tokenCount,
        generationCount: (user.generationCount || 0) + 1 
      })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    const result = await db.select().from(templates).where(eq(templates.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.category, category));
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const result = await db.insert(templates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: string, templateUpdate: Partial<Template>): Promise<Template> {
    const result = await db.update(templates)
      .set(templateUpdate)
      .where(eq(templates.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    return result[0];
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project> {
    const result = await db.update(projects)
      .set(projectUpdate)
      .where(eq(projects.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Project with ID ${id} not found`);
    }
    
    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}