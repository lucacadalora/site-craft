import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extended request interface with user data
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
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    
    // Add user data to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Generate JWT token
export const generateToken = (user: { id: number; email: string; username: string }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};

// Optional authentication middleware that doesn't reject requests without a token
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without authentication
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      // Continue without authentication
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    
    // Add user data to request object
    req.user = decoded;
    next();
  } catch (error) {
    // If token verification fails, just continue without authentication
    console.error('Optional auth error:', error);
    next();
  }
};