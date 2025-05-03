import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { loginSchema, registerSchema } from '@shared/schema';
import { storage } from '../storage';
import { generateToken, AuthRequest, authenticate } from '../middleware/auth';

// Enable debugging for authentication routes
console.log('Loading auth routes module');

const router = express.Router();

// Register a new user using email-based authentication
router.post('/register', async (req: Request, res: Response) => {
  try {
    console.log('Register attempt with:', JSON.stringify(req.body, null, 2));
    
    // Extract userData without confirmPassword
    const { confirmPassword, ...userData } = req.body;
    
    // Validate required fields: email and password
    if (!userData.email || !userData.password) {
      console.log('Registration missing required fields');
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: [{ message: 'Email and password are required' }]
      });
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      console.log('Invalid email format:', userData.email);
      return res.status(400).json({
        message: 'Validation error',
        errors: [{ message: 'Invalid email format' }]
      });
    }
    
    // Validate password length
    if (userData.password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({
        message: 'Validation error',
        errors: [{ message: 'Password must be at least 6 characters' }]
      });
    }

    const { email, password, displayName } = userData;
    console.log('Processing registration for:', email, 'with display name:', displayName || '(none)');

    // Check if email already exists
    const existingUserByEmail = await storage.getUserByEmail(email);
    if (existingUserByEmail) {
      console.log('Email already exists:', email);
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash the password
    const saltRounds = 10;
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed successfully');

    // Create user with hashed password and optional displayName
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      displayName, // Optional field
    });

    // Generate JWT token (using email as the main identifier)
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.displayName || user.email.split('@')[0] // Fallback to part of email
    });

    // Return user info and token
    res.status(201).json({
      id: user.id,
      username: user.displayName || user.email.split('@')[0], // Use displayName or first part of email
      email: user.email,
      displayName: user.displayName,
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
    console.log('Login attempt with:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('Login validation failed:', validationResult.error.errors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }

    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('User found:', user.id, user.username);

    // Verify password
    console.log('Comparing password hash...');
    const passwordMatches = await bcrypt.compare(password, user.password);
    console.log('Password match result:', passwordMatches);
    if (!passwordMatches) {
      console.log('Password does not match for user:', user.id);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login timestamp
    await storage.updateUser(user.id, { lastLogin: new Date() });

    // Generate JWT token (using email as identifier)
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.displayName || user.email.split('@')[0] // Use display name or email username part
    });

    // Return user info and token 
    res.status(200).json({
      id: user.id,
      username: user.displayName || user.email.split('@')[0], // Use displayName or email username part
      email: user.email,
      displayName: user.displayName,
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
      username: user.displayName || user.email.split('@')[0], // Use displayName or email username part
      email: user.email,
      displayName: user.displayName,
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