import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PgStorage } from '../db/pg-storage';

// Environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create storage instance
const storage = new PgStorage();

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
  };
}

// Middleware to authenticate requests
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    
    // Get user from database
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Generate JWT token
export const generateToken = (user: { id: number; email: string; username: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Optional authentication middleware - doesn't fail if no token
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    
    // Get user from database
    const user = await storage.getUser(decoded.id);
    if (user) {
      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username
      };
    }
    
    next();
  } catch (error) {
    // Just continue without authentication
    next();
  }
};