import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing/verification
const JWT_SECRET = process.env.JWT_SECRET || 'landingcraft-secret-key';

// Extend Request type to include user
export interface AuthRequest extends Request {
  user?: any; // This allows for both old JWT auth and new Replit Auth
}

// Middleware to authenticate JWT token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check for token in query params (for convenience/testing)
      const tokenFromQuery = req.query.token as string;
      if (tokenFromQuery) {
        try {
          const decoded = jwt.verify(tokenFromQuery, JWT_SECRET) as { id: number; email: string; username?: string; displayName?: string };
          req.user = {
            id: decoded.id,
            email: decoded.email,
            username: decoded.username,
            displayName: decoded.displayName
          };
          console.log('Authenticated via query token:', req.user.id);
          return next();
        } catch (err) {
          // Fall through to regular auth failure
        }
      }
      console.log('Authentication required - no Authorization header or token query param');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('Authentication required - Bearer token empty');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username?: string; displayName?: string };
    
    // Set user info in request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      displayName: decoded.displayName
    };
    
    console.log('Authenticated user:', req.user.id, req.user.email);
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
export const generateToken = (user: { id: number; email: string; username?: string; displayName?: string }) => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; username?: string; displayName?: string };
    
    // Set user info in request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      displayName: decoded.displayName
    };
    
    next();
  } catch (error) {
    // On any error, just continue without authentication
    next();
  }
};