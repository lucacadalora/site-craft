import { Request, Response, NextFunction } from 'express';
import { customDomainsStorage } from '../db/custom-domains-storage';
import { deploymentsStorage } from '../db/deployments-storage';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYMENTS_DIR = path.join(process.cwd(), 'user_deployments');

const INTERNAL_HOSTS = [
  'localhost',
  '127.0.0.1',
  'site.jatevo.ai',
  'sites.jatevo.ai',
  'jatevo.ai',
  'www.jatevo.ai',
  'replit.dev',
  'repl.co'
];

function isInternalHost(host: string): boolean {
  const hostname = host.split(':')[0].toLowerCase();
  
  return INTERNAL_HOSTS.some(internal => 
    hostname === internal || 
    hostname.endsWith(`.${internal}`) ||
    hostname.includes('.replit.dev') ||
    hostname.includes('.repl.co')
  );
}

export async function customDomainRouter(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.headers.host || '';
    const hostname = host.split(':')[0].toLowerCase();
    
    if (!hostname || isInternalHost(hostname)) {
      return next();
    }
    
    console.log(`[CustomDomain] Checking custom domain: ${hostname}`);
    
    const customDomain = await customDomainsStorage.getCustomDomainByDomain(hostname);
    
    if (!customDomain) {
      console.log(`[CustomDomain] Domain not found: ${hostname}`);
      return next();
    }
    
    if (!customDomain.verified) {
      console.log(`[CustomDomain] Domain not verified: ${hostname}`);
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Domain Pending Verification</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
              .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
              h1 { color: #f59e0b; margin-bottom: 16px; }
              p { color: #64748b; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Domain Pending Verification</h1>
              <p>This domain has been registered but is still pending DNS verification.</p>
              <p>If you own this domain, please complete the verification process in your Jatevo dashboard.</p>
            </div>
          </body>
        </html>
      `);
    }
    
    console.log(`[CustomDomain] Verified domain found: ${hostname} -> ${customDomain.deploymentSlug}`);
    
    const deployment = await deploymentsStorage.getDeploymentBySlug(customDomain.deploymentSlug);
    
    if (!deployment) {
      console.log(`[CustomDomain] Deployment not found for slug: ${customDomain.deploymentSlug}`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Site Not Found</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
              .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
              h1 { color: #ef4444; margin-bottom: 16px; }
              p { color: #64748b; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Site Not Found</h1>
              <p>The deployment associated with this domain could not be found.</p>
            </div>
          </body>
        </html>
      `);
    }
    
    deploymentsStorage.incrementDeploymentVisitCount(deployment.id)
      .catch(err => console.error(`[CustomDomain] Failed to increment visit count: ${err.message}`));
    
    const slugDir = path.join(DEPLOYMENTS_DIR, customDomain.deploymentSlug);
    const htmlPath = path.join(slugDir, 'index.html');
    
    if (fs.existsSync(htmlPath)) {
      console.log(`[CustomDomain] Serving from file: ${htmlPath}`);
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      res.setHeader('X-Served-By', 'Jatevo Custom Domain');
      res.setHeader('X-Domain', hostname);
      return res.send(htmlContent);
    }
    
    console.log(`[CustomDomain] Serving from database for slug: ${customDomain.deploymentSlug}`);
    res.setHeader('X-Served-By', 'Jatevo Custom Domain');
    res.setHeader('X-Domain', hostname);
    return res.send(deployment.html);
    
  } catch (error) {
    console.error('[CustomDomain] Error in custom domain router:', error);
    return next();
  }
}
