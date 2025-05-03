import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing/verification
const JWT_SECRET = process.env.JWT_SECRET || 'landingcraft-secret-key';

// Extend Request type to include user
export interface AuthRequest extends Request {
  user?: any; // This allows for both old JWT auth and new Replit Auth
}

// Enhanced middleware to authenticate JWT token
// This version adds detailed logging and better compatibility with Replit Auth
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First check if user is already authenticated via Replit Auth
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      console.log('User already authenticated via Replit Auth:', req.user.claims.sub);
      return next();
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'none');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check for token in query params (for convenience/testing)
      const tokenFromQuery = req.query.token as string;
      if (tokenFromQuery) {
        try {
          console.log('Attempting to authenticate with query token');
          const decoded = jwt.verify(tokenFromQuery, JWT_SECRET) as { id: string | number; email: string; username?: string; displayName?: string };
          
          // Normalize the ID to string (for compatibility with Replit Auth's string IDs)
          const userId = String(decoded.id);
          
          req.user = {
            id: userId,
            email: decoded.email,
            username: decoded.username || decoded.email.split('@')[0],
            displayName: decoded.displayName
          };
          console.log('Authenticated via query token:', userId);
          return next();
        } catch (err) {
          console.log('Query token validation failed:', err);
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
    
    console.log('Verifying JWT token...');
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string | number; email: string; username?: string; displayName?: string };
      
      // Normalize the ID to string (for compatibility with Replit Auth's string IDs)
      const userId = String(decoded.id);
      
      // Set user info in request
      req.user = {
        id: userId,
        email: decoded.email,
        username: decoded.username || decoded.email.split('@')[0],
        displayName: decoded.displayName
      };
      
      console.log('JWT authentication successful for user:', userId);
      return next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      
      // Check for specific JWT errors
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      return res.status(401).json({ message: 'Authentication error' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Generate JWT token
export const generateToken = (user: { id: string | number; email: string; username?: string; displayName?: string }) => {
  // Normalize the ID to string
  const userId = String(user.id);
  
  // Create token with 7-day expiry
  return jwt.sign({
    ...user,
    id: userId
  }, JWT_SECRET, { expiresIn: '7d' });
};

// Optional authentication middleware - doesn't reject if no token, but sets user if token exists
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First check if user is already authenticated via Replit Auth
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      console.log('User already authenticated via Replit Auth (optional auth):', req.user.claims.sub);
      return next();
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continue without authentication
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string | number; email: string; username?: string; displayName?: string };
      
      // Normalize the ID to string (for compatibility with Replit Auth's string IDs)
      const userId = String(decoded.id);
      
      // Set user info in request
      req.user = {
        id: userId,
        email: decoded.email,
        username: decoded.username || decoded.email.split('@')[0],
        displayName: decoded.displayName
      };
      
      console.log('JWT optional authentication successful for user:', userId);
      return next();
    } catch (jwtError) {
      console.log('Optional JWT authentication failed:', jwtError.message);
      return next(); // Continue without authentication on error
    }
  } catch (error) {
    // On any error, just continue without authentication
    console.log('Optional auth error, continuing without auth:', error);
    next();
  }
};