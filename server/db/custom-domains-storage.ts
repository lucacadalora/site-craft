import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  customDomains, 
  InsertCustomDomain, 
  CustomDomain 
} from '@shared/schema';
import crypto from 'crypto';

export class CustomDomainsStorage {
  async getCustomDomainById(id: number): Promise<CustomDomain | undefined> {
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.id, id))
      .limit(1);
    
    return domain;
  }

  async getCustomDomainByDomain(domain: string): Promise<CustomDomain | undefined> {
    const normalizedDomain = domain.toLowerCase().trim();
    const [result] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.domain, normalizedDomain))
      .limit(1);
    
    return result;
  }

  async getCustomDomainByDeploymentSlug(deploymentSlug: string): Promise<CustomDomain | undefined> {
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.deploymentSlug, deploymentSlug))
      .limit(1);
    
    return domain;
  }

  async getUserCustomDomains(userId: number): Promise<CustomDomain[]> {
    const domains = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.userId, userId))
      .orderBy(sql`${customDomains.createdAt} DESC`);
    
    return domains;
  }

  async getAllCustomDomains(): Promise<CustomDomain[]> {
    const domains = await db
      .select()
      .from(customDomains)
      .orderBy(sql`${customDomains.createdAt} DESC`);
    
    return domains;
  }

  async createCustomDomain(data: {
    domain: string;
    deploymentSlug: string;
    userId?: number | null;
    isPremium?: boolean;
  }): Promise<CustomDomain> {
    const normalizedDomain = data.domain.toLowerCase().trim();
    
    const verificationToken = `jatevo-verify-${crypto.randomBytes(16).toString('hex')}`;
    
    const [newDomain] = await db
      .insert(customDomains)
      .values({
        domain: normalizedDomain,
        deploymentSlug: data.deploymentSlug,
        userId: data.userId || null,
        verificationToken,
        verified: false,
        sslStatus: 'pending',
        isPremium: data.isPremium || false,
      })
      .returning();
    
    console.log(`Created custom domain: ${normalizedDomain} -> ${data.deploymentSlug}`);
    return newDomain;
  }

  async updateCustomDomain(id: number, updates: Partial<CustomDomain>): Promise<CustomDomain> {
    const [updatedDomain] = await db
      .update(customDomains)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(customDomains.id, id))
      .returning();
    
    if (!updatedDomain) {
      throw new Error(`Custom domain with ID ${id} not found`);
    }
    
    return updatedDomain;
  }

  async deleteCustomDomain(id: number): Promise<void> {
    await db
      .delete(customDomains)
      .where(eq(customDomains.id, id));
  }

  async verifyDomain(id: number): Promise<CustomDomain> {
    return this.updateCustomDomain(id, {
      verified: true,
      sslStatus: 'provisioning'
    });
  }

  async updateSslStatus(id: number, status: string): Promise<CustomDomain> {
    return this.updateCustomDomain(id, { sslStatus: status });
  }

  async isDomainAvailable(domain: string): Promise<boolean> {
    const existingDomain = await this.getCustomDomainByDomain(domain);
    return !existingDomain;
  }

  async getVerifiedDomains(): Promise<CustomDomain[]> {
    const domains = await db
      .select()
      .from(customDomains)
      .where(eq(customDomains.verified, true))
      .orderBy(sql`${customDomains.createdAt} DESC`);
    
    return domains;
  }

  async getCustomDomainsByDeploymentSlugs(slugs: string[]): Promise<CustomDomain[]> {
    if (slugs.length === 0) return [];
    
    const domains = await db
      .select()
      .from(customDomains)
      .where(sql`${customDomains.deploymentSlug} IN (${sql.join(slugs.map(s => sql`${s}`), sql`, `)})`)
      .orderBy(sql`${customDomains.createdAt} DESC`);
    
    return domains;
  }
}

export const customDomainsStorage = new CustomDomainsStorage();
