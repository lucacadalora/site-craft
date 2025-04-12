import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { loginSchema, registerSchema } from '@shared/schema';
import { storage } from '../storage';
import { generateToken, AuthRequest, authenticate } from '../middleware/auth';

// Enable debugging for authentication routes
console.log('Loading auth routes module');

const router = express.Router();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Extract userData without confirmPassword
    const { confirmPassword, ...userData } = req.body;
    
    // Validate request body with basic validation
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: [{ message: 'Username, email, and password are required' }]
      });
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      return res.status(400).json({
        message: 'Validation error',
        errors: [{ message: 'Invalid email format' }]
      });
    }
    
    // Validate password length
    if (userData.password.length < 6) {
      return res.status(400).json({
        message: 'Validation error',
        errors: [{ message: 'Password must be at least 6 characters' }]
      });
    }

    const { username, email, password } = userData;

    // Check if user already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const existingUserByUsername = await storage.getUserByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with hashed password
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Return user info and token
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    await storage.updateUser(user.id, { lastLogin: new Date() });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username
    });

    // Return user info and token
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      tokenUsage: user.tokenUsage,
      generationCount: user.generationCount,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get user stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Stats endpoint called with user ID:', req.user?.id);
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      tokenUsage: user.tokenUsage || 0,
      generationCount: user.generationCount || 0,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching user stats' });
  }
});

// Test endpoint to check if auth routes are working 
router.get('/test', (req: Request, res: Response) => {
  console.log('Auth test endpoint called');
  res.status(200).json({ message: 'Auth routes are working' });
});

export default router;