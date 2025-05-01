import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  deployments, 
  users, 
  projects, 
  InsertDeployment, 
  Deployment
} from '@shared/schema';

/**
 * Storage class for managing deployments in the database
 */
export class DeploymentsStorage {
  /**
   * Get a deployment by its slug
   */
  async getDeploymentBySlug(slug: string): Promise<Deployment | undefined> {
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(eq(deployments.slug, slug))
      .limit(1);
    
    return deployment;
  }

  /**
   * Get all deployments for a specific user
   */
  async getUserDeployments(userId: number): Promise<Deployment[]> {
    const userDeployments = await db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, userId))
      .orderBy(sql`${deployments.createdAt} DESC`);
    
    return userDeployments;
  }

  /**
   * Get all deployments
   */
  async getAllDeployments(): Promise<Deployment[]> {
    const allDeployments = await db
      .select()
      .from(deployments)
      .orderBy(sql`${deployments.createdAt} DESC`);
    
    return allDeployments;
  }

  /**
   * Create a new deployment
   */
  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    // Ensure we have all required fields with proper types
    const deploymentData = {
      slug: deployment.slug,
      html: deployment.html,
      css: deployment.css === undefined ? null : deployment.css,
      projectId: deployment.projectId === undefined ? null : deployment.projectId,
      userId: deployment.userId === undefined ? null : deployment.userId,
      isActive: deployment.isActive === undefined ? true : deployment.isActive,
      visitCount: 0
    };
    
    const [newDeployment] = await db
      .insert(deployments)
      .values(deploymentData)
      .returning();
    
    return newDeployment;
  }

  /**
   * Update a deployment
   */
  async updateDeployment(id: number, deploymentUpdate: Partial<Deployment>): Promise<Deployment> {
    const [updatedDeployment] = await db
      .update(deployments)
      .set({
        ...deploymentUpdate,
        updatedAt: new Date()
      })
      .where(eq(deployments.id, id))
      .returning();
    
    if (!updatedDeployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }
    
    return updatedDeployment;
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(id: number): Promise<void> {
    await db
      .delete(deployments)
      .where(eq(deployments.id, id));
  }

  /**
   * Increment the visit count for a deployment
   */
  async incrementDeploymentVisitCount(id: number): Promise<Deployment> {
    const [updatedDeployment] = await db
      .update(deployments)
      .set({
        visitCount: sql`${deployments.visitCount} + 1`,
        lastVisitedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(deployments.id, id))
      .returning();
    
    if (!updatedDeployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }
    
    return updatedDeployment;
  }

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const [existingDeployment] = await db
      .select({ id: deployments.id })
      .from(deployments)
      .where(eq(deployments.slug, slug))
      .limit(1);
    
    return !existingDeployment;
  }
  
  /**
   * Get deployment with joined user and project data
   */
  async getDeploymentWithDetails(id: number): Promise<any> {
    const result = await db
      .select({
        deployment: deployments,
        user: {
          id: users.id,
          email: users.email,
          username: users.username,
          displayName: users.displayName
        },
        project: {
          id: projects.id,
          name: projects.name,
          description: projects.description
        }
      })
      .from(deployments)
      .leftJoin(users, eq(deployments.userId, users.id))
      .leftJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(deployments.id, id))
      .limit(1);
    
    return result[0] || null;
  }
}

// Export a singleton instance
export const deploymentsStorage = new DeploymentsStorage();