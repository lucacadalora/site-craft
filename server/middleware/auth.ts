import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing/verification
const JWT_SECRET = process.env.JWT_SECRET || 'landingcraft-secret-key';

// Extend Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
  };
}

// Middleware to authenticate JWT token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
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
    
    // Set user info in request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Check for specific JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Generate JWT token
export const generateToken = (user: { id: number; email: string; username: string }) => {
  // Create token with 7-day expiry
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};

// Optional authentication middleware - doesn't reject if no token, but sets user if token exists
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username: string };
    
    // Set user info in request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    // On any error, just continue without authentication
    next();
  }
};