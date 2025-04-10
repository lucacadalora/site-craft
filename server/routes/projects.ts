import { Router, Response } from 'express';
import { PgStorage } from '../db/pg-storage';
import { authenticate, AuthRequest } from '../middleware/auth';
import { insertProjectSchema } from '@shared/schema';

const router = Router();
const storage = new PgStorage();

// Get all user projects
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const projects = await storage.getUserProjects(req.user.id);
    return res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific project
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if the project belongs to the user
    if (project.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to access this project' });
    }

    return res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new project
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate request body
    const validation = insertProjectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.error.format() 
      });
    }

    // Create project with user ID
    const project = await storage.createProject({
      ...validation.data,
      userId: req.user.id,
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a project
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Check if project exists and belongs to user
    const existingProject = await storage.getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existingProject.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this project' });
    }

    // Update project
    const updatedProject = await storage.updateProject(projectId, req.body);
    return res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a project
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    // Check if project exists and belongs to user
    const existingProject = await storage.getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (existingProject.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this project' });
    }

    // Delete project
    await storage.deleteProject(projectId);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;