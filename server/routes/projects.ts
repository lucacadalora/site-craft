import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { storage } from '../storage';

const router = express.Router();

// Get all projects for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await storage.getUserProjects(req.user!.id);
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get a specific project
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if the project belongs to the authenticated user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// Create a new project
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, prompt, templateId, category, settings } = req.body;
    
    if (!name || !prompt || !templateId || !category) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide name, prompt, templateId and category.'
      });
    }
    
    const project = await storage.createProject({
      name,
      prompt,
      templateId,
      category,
      description: req.body.description,
      settings: settings || {},
      userId: req.user!.id,
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project' });
  }
});

// Update a project
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if the project belongs to the authenticated user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Fields allowed to be updated
    const { name, html, css, published, settings } = req.body;
    
    const updatedProject = await storage.updateProject(projectId, {
      ...(name !== undefined && { name }),
      ...(html !== undefined && { html }),
      ...(css !== undefined && { css }),
      ...(published !== undefined && { published }),
      ...(settings !== undefined && { settings }),
    });
    
    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

// Delete a project
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if the project belongs to the authenticated user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await storage.deleteProject(projectId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Error deleting project' });
  }
});

export default router;