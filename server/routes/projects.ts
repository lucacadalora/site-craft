import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { AuthRequest, authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// GET all projects for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const projects = await storage.getUserProjects(req.user.id);
    res.json(projects);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// GET a single project by ID or slug
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    let project;
    
    // Check if it's a numeric ID
    const projectId = parseInt(idParam);
    if (!isNaN(projectId)) {
      project = await storage.getProject(projectId);
    } else {
      // Otherwise, treat as slug
      project = await storage.getProjectBySlug(idParam);
    }
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to access this project' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Helper function to generate slug from project name/prompt
function generateSlug(text: string): string {
  // V3-style slug generation
  const baseSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter(Boolean)
    .join('-')
    .slice(0, 96);
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}

// CREATE a new project
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate slug from project name or prompt
    const slug = generateSlug(req.body.name || req.body.prompt || 'untitled-project');

    const projectData = {
      ...req.body,
      slug,
      userId: req.user.id
    };

    const project = await storage.createProject(projectData);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// UPDATE a project
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }

    const updatedProject = await storage.updateProject(projectId, req.body);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE a project
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    await storage.deleteProject(projectId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// PUBLISH a project with a custom slug
const publishSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Slug can only contain lowercase letters, numbers, and hyphens"
  })
});

router.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Validate slug
    const validation = publishSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { slug } = validation.data;

    // Check if slug is available
    const allProjects = await storage.getAllProjects();
    const slugExists = allProjects.some(p => 
      p.publishPath === slug || 
      p.publishPath === `/sites/${slug}` || 
      p.publishPath === `sites/${slug}`
    );

    if (slugExists) {
      return res.status(409).json({ error: 'This slug is already in use. Please choose another one.' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to publish this project' });
    }

    // Check if project has HTML content
    if (!project.html) {
      return res.status(400).json({ error: 'Project has no HTML content to publish' });
    }

    // Update project with publish info
    const updatedProject = await storage.updateProject(projectId, {
      published: true,
      publishPath: slug
    });

    // Return the published URL
    res.json({
      success: true,
      publishUrl: `/sites/${slug}`,
      project: updatedProject
    });
  } catch (error) {
    console.error('Error publishing project:', error);
    res.status(500).json({ error: 'Failed to publish project' });
  }
});

// GET all versions for a project
router.get('/:id/versions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to access this project' });
    }

    const versions = await storage.getProjectVersions(projectId);
    res.json(versions);
  } catch (error) {
    console.error('Error getting project versions:', error);
    res.status(500).json({ error: 'Failed to get project versions' });
  }
});

// CREATE a new version for a project
router.post('/:id/versions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }

    // Get the latest version number
    const latestVersion = await storage.getLatestProjectVersion(projectId);
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const versionData = {
      projectId,
      versionNumber,
      files: req.body.files || project.files || [],
      prompt: req.body.prompt || project.prompt,
      commitTitle: req.body.commitTitle || req.body.prompt,
      isFollowUp: req.body.isFollowUp || false
    };

    const newVersion = await storage.createProjectVersion(versionData);
    
    // Update project's currentCommit to the new version
    await storage.updateProject(projectId, {
      currentCommit: newVersion.id,
      files: versionData.files
    });

    res.status(201).json(newVersion);
  } catch (error) {
    console.error('Error creating project version:', error);
    res.status(500).json({ error: 'Failed to create project version' });
  }
});

// RESTORE a specific version of a project
router.post('/:id/versions/:versionId/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const versionId = parseInt(req.params.versionId);
    
    if (isNaN(projectId) || isNaN(versionId)) {
      return res.status(400).json({ error: 'Invalid project or version ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project belongs to user
    if (project.userId && project.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to update this project' });
    }

    const version = await storage.getProjectVersion(versionId);
    
    if (!version || version.projectId !== projectId) {
      return res.status(404).json({ error: 'Version not found or does not belong to this project' });
    }

    // Restore the project to this version
    const updatedProject = await storage.updateProject(projectId, {
      files: version.files,
      currentCommit: versionId
    });

    res.json({
      success: true,
      project: updatedProject,
      restoredVersion: version
    });
  } catch (error) {
    console.error('Error restoring project version:', error);
    res.status(500).json({ error: 'Failed to restore project version' });
  }
});

export default router;