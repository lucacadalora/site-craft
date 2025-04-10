import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PgStorage } from '../db/pg-storage';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { loginSchema, registerSchema } from '@shared/schema';

const router = Router();
const storage = new PgStorage();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.error.format() 
      });
    }

    const { username, email, password } = validation.data;

    // Check if user already exists
    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create user
    const user = await storage.createUser({
      username,
      email,
      password,
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Return user data and token
    return res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validation.error.format() 
      });
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    await storage.updateUser(user.id, { lastLogin: new Date() });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Return user data and token
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data (excluding sensitive info)
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      tokenUsage: user.tokenUsage,
      generationCount: user.generationCount,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user projects
    const projects = await storage.getUserProjects(user.id);

    // Return user stats
    return res.json({
      tokenUsage: user.tokenUsage || 0,
      generationCount: user.generationCount || 0,
      projectCount: projects.length,
      publishedProjects: projects.filter(p => p.published).length,
    });
  } catch (error) {
    console.error('Stats retrieval error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;