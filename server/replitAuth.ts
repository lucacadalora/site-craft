import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoizee from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage-replit-auth";
import jwt from 'jsonwebtoken';

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoizee(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL || "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // PG store uses seconds
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    username: claims["username"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    bio: claims["bio"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Register all domains from REPLIT_DOMAINS
  const domains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
  console.log("Registering Replit Auth strategies for domains:", domains);
  
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`Registered strategy: replitauth:${domain}`);
  }

  // Create a default strategy for use when hostname detection fails
  const defaultStrategy = new Strategy(
    {
      name: "replitauth:default",
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${domains[0]}/api/callback`, // Use first domain as default
    },
    verify,
  );
  passport.use(defaultStrategy);
  console.log("Registered fallback strategy: replitauth:default");

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Middleware to determine the correct strategy name based on hostname
  const getAuthStrategy = (req: any) => {
    const host = req.hostname || req.headers.host || '';
    console.log(`Login attempt from host: ${host}`);
    
    // Try to find exact domain match first
    for (const domain of domains) {
      if (host === domain || host.includes(domain)) {
        console.log(`Using strategy: replitauth:${domain}`);
        return `replitauth:${domain}`;
      }
    }
    
    // Fallback to default strategy if no match
    console.log(`No matching strategy for ${host}, using default strategy`);
    return "replitauth:default";
  };

  // Login route with dynamic strategy selection
  app.get("/api/login", (req, res, next) => {
    const strategy = getAuthStrategy(req);
    passport.authenticate(strategy, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Callback route with dynamic strategy selection
  app.get("/api/callback", (req, res, next) => {
    const strategy = getAuthStrategy(req);
    passport.authenticate(strategy, {
      successReturnToOrRedirect: "/editor", // Redirect to editor page instead of home
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // User info endpoint for the client
  // Supports both Replit Auth and JWT auth
  app.get("/api/auth/user", (req: any, res, next) => {
    // Special middleware to handle JWT tokens
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'landingcraft-secret-key';
        
        console.log('Processing JWT token for /api/auth/user');
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        
        // Set user info in request
        req.user = {
          id: decoded.id as string,
          email: decoded.email as string,
          username: (decoded.username as string) || (decoded.email as string).split('@')[0],
          displayName: decoded.displayName as string
        };
        
        console.log('JWT token verified, user:', req.user.id);
      } catch (error) {
        console.log('Error verifying JWT token:', error);
        // Continue even if token verification fails
        // Will be handled in the main handler
      }
    }
    
    next();
  }, async (req: any, res) => {
    try {
      console.log('Auth endpoint called with req.user:', req.user);
      
      // Check authentication type and extract user ID accordingly
      let userId;
      
      // Case 1: User authenticated with Replit Auth
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
        console.log('User authenticated via Replit Auth, ID:', userId);
      } 
      // Case 2: User authenticated with JWT
      else if (req.user?.id) {
        userId = req.user.id;
        console.log('User authenticated via JWT, ID:', userId);
      }
      // Case 3: Not authenticated
      else {
        console.log('User not authenticated');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Fetch user data from database
      console.log('Fetching user with ID:', userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log('User not found in database:', userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('User found, returning data');
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const user = req.user as any;
  const authHeader = req.headers.authorization;
  
  // Case 1: Check JWT token in Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const JWT_SECRET = process.env.JWT_SECRET || 'landingcraft-secret-key';
      
      console.log('Processing JWT token for protected route');
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      // JWT token is valid, proceed
      console.log('JWT token verified for protected route, user:', decoded.id);
      return next();
    } catch (error) {
      console.log('Error verifying JWT token for protected route:', error);
      // Continue to check other auth methods
    }
  }
  
  // Case 2: Check for Replit Auth session
  if (req.isAuthenticated() && user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    
    // Session is still valid
    if (now <= user.expires_at) {
      return next();
    }
    
    // Try to refresh the token
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        console.log('Error refreshing token:', error);
        // Fall through to unauthorized
      }
    }
  }
  
  // No valid authentication found
  return res.status(401).json({ message: "Unauthorized" });
};