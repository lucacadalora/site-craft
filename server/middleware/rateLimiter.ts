import { Request, Response, NextFunction } from 'express';

// In-memory store for IP-based rate limiting
// In production, use Redis or database
const ipGenerationCounts = new Map<string, {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
}>();

// Clean up old entries every hour
setInterval(() => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const [ip, data] of ipGenerationCounts.entries()) {
    if (data.lastAttempt < oneDayAgo) {
      ipGenerationCounts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

export function getClientIp(req: Request): string {
  // Get real IP from various headers (for proxied requests)
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to request IP
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function checkRateLimit(req: Request): {
  allowed: boolean;
  remaining: number;
  resetIn?: number;
} {
  const ip = getClientIp(req);
  const MAX_GENERATIONS = 3;
  const RESET_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  
  const now = new Date();
  const ipData = ipGenerationCounts.get(ip);
  
  if (!ipData) {
    // First generation for this IP
    return {
      allowed: true,
      remaining: MAX_GENERATIONS - 1
    };
  }
  
  // Check if reset period has passed
  const timeSinceFirst = now.getTime() - ipData.firstAttempt.getTime();
  if (timeSinceFirst >= RESET_PERIOD) {
    // Reset the counter
    ipGenerationCounts.delete(ip);
    return {
      allowed: true,
      remaining: MAX_GENERATIONS - 1
    };
  }
  
  // Check if limit is reached
  if (ipData.count >= MAX_GENERATIONS) {
    const resetIn = RESET_PERIOD - timeSinceFirst;
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil(resetIn / 1000) // in seconds
    };
  }
  
  return {
    allowed: true,
    remaining: MAX_GENERATIONS - ipData.count - 1
  };
}

export function incrementGenerationCount(req: Request): void {
  const ip = getClientIp(req);
  const now = new Date();
  const ipData = ipGenerationCounts.get(ip);
  
  if (!ipData) {
    ipGenerationCounts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
  } else {
    ipData.count += 1;
    ipData.lastAttempt = now;
  }
}

export function getRemainingGenerations(req: Request): number {
  const { remaining } = checkRateLimit(req);
  return remaining + 1; // Add 1 because remaining doesn't count the current attempt
}

// Middleware for anonymous generation rate limiting
export function anonymousRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for authenticated users
  if (req.headers.authorization) {
    return next();
  }
  
  const { allowed, remaining, resetIn } = checkRateLimit(req);
  
  if (!allowed) {
    const hours = Math.floor((resetIn || 0) / 3600);
    const minutes = Math.floor(((resetIn || 0) % 3600) / 60);
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `You've reached the maximum of 3 free generations. Please login to continue or wait ${hours}h ${minutes}m.`,
      resetIn: resetIn
    });
  }
  
  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Limit', '3');
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  
  next();
}