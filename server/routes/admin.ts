import { Router, Response } from 'express';
import { adminOnly, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { users, projects, deployments } from '@shared/schema';
import { sql, count, isNotNull, desc } from 'drizzle-orm';

const router = Router();

router.get('/stats', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsersResult,
      usersWithProjectsResult,
      usersWithDeploymentsResult,
      totalProjectsResult,
      totalDeploymentsResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: sql<number>`COUNT(DISTINCT ${projects.userId})` }).from(projects).where(isNotNull(projects.userId)),
      db.select({ count: sql<number>`COUNT(DISTINCT ${deployments.userId})` }).from(deployments).where(isNotNull(deployments.userId)),
      db.select({ count: count() }).from(projects),
      db.select({ count: count() }).from(deployments)
    ]);

    res.json({
      totalUsers: Number(totalUsersResult[0]?.count || 0),
      usersWithProjects: Number(usersWithProjectsResult[0]?.count || 0),
      usersWithDeployments: Number(usersWithDeploymentsResult[0]?.count || 0),
      totalProjects: Number(totalProjectsResult[0]?.count || 0),
      totalDeployments: Number(totalDeploymentsResult[0]?.count || 0)
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

router.get('/users', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const [usersList, totalResult] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        tokenUsage: users.tokenUsage,
        generationCount: users.generationCount,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt
      })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(users)
    ]);

    res.json({
      users: usersList,
      total: Number(totalResult[0]?.count || 0),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:userId/projects', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userProjects = await db.select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      published: projects.published,
      publishPath: projects.publishPath,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt
    })
      .from(projects)
      .where(sql`${projects.userId} = ${userId}`)
      .orderBy(desc(projects.createdAt));

    res.json({ projects: userProjects });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to fetch user projects' });
  }
});

router.get('/users/:userId/deployments', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userDeployments = await db.select({
      id: deployments.id,
      slug: deployments.slug,
      projectId: deployments.projectId,
      isActive: deployments.isActive,
      visitCount: deployments.visitCount,
      lastVisitedAt: deployments.lastVisitedAt,
      createdAt: deployments.createdAt
    })
      .from(deployments)
      .where(sql`${deployments.userId} = ${userId}`)
      .orderBy(desc(deployments.createdAt));

    res.json({ deployments: userDeployments });
  } catch (error) {
    console.error('Error fetching user deployments:', error);
    res.status(500).json({ error: 'Failed to fetch user deployments' });
  }
});

router.get('/users-with-activity', adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const usersWithActivity = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.display_name as "displayName",
        u.token_usage as "tokenUsage",
        u.generation_count as "generationCount",
        u.last_login as "lastLogin",
        u.created_at as "createdAt",
        COALESCE(p.project_count, 0) as "projectCount",
        COALESCE(d.deployment_count, 0) as "deploymentCount"
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as project_count
        FROM projects
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) p ON u.id = p.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as deployment_count
        FROM deployments
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) d ON u.id = d.user_id
      ORDER BY u.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const totalResult = await db.select({ count: count() }).from(users);

    res.json({
      users: usersWithActivity.rows,
      total: Number(totalResult[0]?.count || 0),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching users with activity:', error);
    res.status(500).json({ error: 'Failed to fetch users with activity' });
  }
});

router.get('/check', adminOnly, async (req: AuthRequest, res: Response) => {
  res.json({ isAdmin: true, email: req.user?.email });
});

export default router;
