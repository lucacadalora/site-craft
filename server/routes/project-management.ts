import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { projects, InsertProject, projectVersions, InsertProjectVersion } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ProjectFile } from '../format-ai-response';
import { storage } from '../storage';

const router = Router();

// Get all projects for a user
router.get('/api/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const userProjects = await db.select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
    
    // Transform projects to include parsed files
    const projectsWithFiles = userProjects.map(project => {
      let files: ProjectFile[] = [];
      
      // Parse files from JSON if exists
      if (project.files && typeof project.files === 'string') {
        try {
          files = JSON.parse(project.files);
        } catch (e) {
          console.error('Error parsing project files:', e);
        }
      } else if (Array.isArray(project.files)) {
        files = project.files as ProjectFile[];
      }
      
      // Fallback to legacy HTML/CSS fields if no files
      if (files.length === 0 && project.html) {
        files.push({ path: 'index.html', content: project.html });
        if (project.css) {
          files.push({ path: 'style.css', content: project.css });
        }
      }
      
      return {
        ...project,
        files,
        prompts: project.prompts || []
      };
    });
    
    return res.json({ projects: projectsWithFiles });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a single project
router.get('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Parse files
    let files: ProjectFile[] = [];
    if (project.files && typeof project.files === 'string') {
      try {
        files = JSON.parse(project.files);
      } catch (e) {
        console.error('Error parsing project files:', e);
      }
    } else if (Array.isArray(project.files)) {
      files = project.files as ProjectFile[];
    }
    
    // Fallback to legacy fields
    if (files.length === 0 && project.html) {
      files.push({ path: 'index.html', content: project.html });
      if (project.css) {
        files.push({ path: 'style.css', content: project.css });
      }
    }
    
    return res.json({
      ...project,
      files,
      prompts: project.prompts || []
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new project
router.post('/api/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, prompt, files, templateId = 'custom', category = 'general' } = req.body;
    
    if (!name || !prompt) {
      return res.status(400).json({ 
        message: 'Missing required fields: name and prompt' 
      });
    }
    
    // Prepare files for storage
    const filesJson = files ? JSON.stringify(files) : null;
    
    // Create the project
    const [newProject] = await db.insert(projects)
      .values({
        name,
        description,
        prompt,
        templateId,
        category,
        files: filesJson,
        prompts: JSON.stringify([prompt]), // Initialize with first prompt
        userId,
        updatedAt: new Date()
      })
      .returning();
    
    return res.json({ 
      message: 'Project created successfully',
      project: {
        ...newProject,
        files: files || [],
        prompts: [prompt]
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ 
      message: 'Failed to create project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a project
router.put('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    const { name, description, files, newPrompt } = req.body;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // First, check if project exists and belongs to user
    const [existingProject] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Parse existing prompts
    let prompts: string[] = [];
    if (existingProject.prompts) {
      try {
        prompts = typeof existingProject.prompts === 'string' 
          ? JSON.parse(existingProject.prompts)
          : existingProject.prompts;
      } catch (e) {
        prompts = [];
      }
    }
    
    // Add new prompt if provided
    if (newPrompt) {
      prompts.push(newPrompt);
    }
    
    // Update the project
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (files !== undefined) updateData.files = JSON.stringify(files);
    if (newPrompt) updateData.prompts = JSON.stringify(prompts);
    
    const [updatedProject] = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();
    
    return res.json({ 
      message: 'Project updated successfully',
      project: {
        ...updatedProject,
        files: files || [],
        prompts
      }
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({ 
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a project
router.delete('/api/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Delete only if project belongs to user
    const result = await db.delete(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    return res.json({ 
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ 
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Download project as zip
router.get('/api/projects/:id/download', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Parse files
    let files: ProjectFile[] = [];
    if (project.files && typeof project.files === 'string') {
      try {
        files = JSON.parse(project.files);
      } catch (e) {
        console.error('Error parsing project files:', e);
      }
    } else if (Array.isArray(project.files)) {
      files = project.files as ProjectFile[];
    }
    
    // Fallback to legacy fields
    if (files.length === 0 && project.html) {
      files.push({ path: 'index.html', content: project.html });
      if (project.css) {
        files.push({ path: 'style.css', content: project.css });
      }
    }
    
    // Create a simple HTML package with all files embedded
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '-');
    
    // Find index.html
    const indexFile = files.find(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const jsFiles = files.filter(f => f.path.endsWith('.js'));
    
    let combinedHtml = indexFile?.content || '<!DOCTYPE html><html><body>No index.html found</body></html>';
    
    // Embed CSS directly
    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(f => f.content).join('\n');
      combinedHtml = combinedHtml.replace('</head>', `<style>${cssContent}</style></head>`);
    }
    
    // Embed JS directly
    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(f => f.content).join('\n');
      combinedHtml = combinedHtml.replace('</body>', `<script>${jsContent}</script></body>`);
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${projectName}.html"`);
    return res.send(combinedHtml);
  } catch (error) {
    console.error('Error downloading project:', error);
    return res.status(500).json({ 
      message: 'Failed to download project',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Version management routes - Similar to v3's commit tracking

// Get all versions for a project
router.get('/api/projects/:id/versions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Verify project ownership
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get versions for this project
    const versions = await storage.getProjectVersions(projectId);
    
    return res.json(versions);
  } catch (error) {
    console.error('Error fetching project versions:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch project versions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a specific version
router.get('/api/projects/:projectId/versions/:versionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);
    const versionId = parseInt(req.params.versionId);
    
    if (isNaN(projectId) || isNaN(versionId)) {
      return res.status(400).json({ message: 'Invalid ID parameters' });
    }
    
    // Verify project ownership
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get the specific version
    const version = await storage.getProjectVersion(versionId);
    
    if (!version || version.projectId !== projectId) {
      return res.status(404).json({ message: 'Version not found' });
    }
    
    return res.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch version',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new version for a project
router.post('/api/projects/:id/versions', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Verify project ownership
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const { prompt, filesSnapshot, versionNumber, commitTitle, isFollowUp } = req.body;
    
    if (!prompt || !filesSnapshot || !versionNumber) {
      return res.status(400).json({ 
        message: 'Missing required fields: prompt, filesSnapshot, and versionNumber' 
      });
    }
    
    // Create the version
    const versionData: InsertProjectVersion = {
      projectId,
      versionNumber,
      prompt,
      files: JSON.stringify(filesSnapshot), // Store as JSON string
      commitTitle,
      isFollowUp
    };
    
    const newVersion = await storage.createProjectVersion(versionData);
    
    return res.json({ 
      message: 'Version created successfully',
      version: newVersion
    });
  } catch (error) {
    console.error('Error creating version:', error);
    return res.status(500).json({ 
      message: 'Failed to create version',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a version
router.delete('/api/projects/:projectId/versions/:versionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);
    const versionId = parseInt(req.params.versionId);
    
    if (isNaN(projectId) || isNaN(versionId)) {
      return res.status(400).json({ message: 'Invalid ID parameters' });
    }
    
    // Verify project ownership
    const [project] = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ))
      .limit(1);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get the version to verify it belongs to this project
    const version = await storage.getProjectVersion(versionId);
    
    if (!version || version.projectId !== projectId) {
      return res.status(404).json({ message: 'Version not found' });
    }
    
    // Delete the version
    await storage.deleteProjectVersion(versionId);
    
    return res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting version:', error);
    return res.status(500).json({ 
      message: 'Failed to delete version',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;