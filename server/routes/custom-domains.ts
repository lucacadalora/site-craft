import { Router, Request, Response } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { customDomainsStorage } from '../db/custom-domains-storage';
import { deploymentsStorage } from '../db/deployments-storage';
import { requestDomainSchema } from '@shared/schema';
import dns from 'dns';
import { promisify } from 'util';

const router = Router();

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const validation = requestDomainSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: validation.error.errors 
      });
    }

    const { domain, deploymentSlug } = validation.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const isAvailable = await customDomainsStorage.isDomainAvailable(domain);
    if (!isAvailable) {
      return res.status(409).json({ 
        error: 'Domain already registered',
        message: 'This domain is already connected to another deployment'
      });
    }

    const deployment = await deploymentsStorage.getDeploymentBySlug(deploymentSlug);
    if (!deployment) {
      return res.status(404).json({ 
        error: 'Deployment not found',
        message: 'The deployment slug you provided does not exist'
      });
    }

    if (deployment.userId !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'You can only connect domains to your own deployments'
      });
    }

    const customDomain = await customDomainsStorage.createCustomDomain({
      domain,
      deploymentSlug,
      userId,
      isPremium: true
    });

    const targetHost = process.env.SITE_HOST || 'sites.jatevo.ai';
    
    res.status(201).json({
      success: true,
      customDomain,
      dnsInstructions: {
        message: 'Add these DNS records to your domain registrar:',
        records: [
          {
            type: 'CNAME',
            host: '@',
            value: targetHost,
            description: 'Points your domain to our servers'
          },
          {
            type: 'TXT',
            host: '_jatevo-verify',
            value: customDomain.verificationToken,
            description: 'Verifies domain ownership'
          }
        ],
        note: 'DNS changes may take up to 48 hours to propagate. Click "Verify" once you\'ve added these records.'
      }
    });
  } catch (error) {
    console.error('Error creating custom domain:', error);
    res.status(500).json({ 
      error: 'Failed to create custom domain',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const domains = await customDomainsStorage.getUserCustomDomains(userId);
    res.json({ domains });
  } catch (error) {
    console.error('Error fetching custom domains:', error);
    res.status(500).json({ 
      error: 'Failed to fetch custom domains',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const domainId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    const domain = await customDomainsStorage.getCustomDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (domain.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ domain });
  } catch (error) {
    console.error('Error fetching custom domain:', error);
    res.status(500).json({ 
      error: 'Failed to fetch custom domain',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/:id/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const domainId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    const domain = await customDomainsStorage.getCustomDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (domain.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (domain.verified) {
      return res.json({ 
        success: true, 
        message: 'Domain is already verified',
        domain 
      });
    }

    let txtVerified = false;
    let cnameVerified = false;
    const errors: string[] = [];
    const targetHost = process.env.SITE_HOST || 'sites.jatevo.ai';

    try {
      const txtRecords = await resolveTxt(`_jatevo-verify.${domain.domain}`);
      const flatRecords = txtRecords.map(r => r.join(''));
      txtVerified = flatRecords.some(r => r === domain.verificationToken);
      
      if (!txtVerified) {
        errors.push(`TXT record found but value doesn't match. Expected: ${domain.verificationToken}`);
      }
    } catch (dnsError: any) {
      if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
        errors.push('TXT record not found. Please add _jatevo-verify TXT record');
      } else {
        errors.push(`TXT lookup failed: ${dnsError.message}`);
      }
    }

    try {
      const cnameRecords = await resolveCname(domain.domain);
      cnameVerified = cnameRecords.some(r => 
        r.toLowerCase() === targetHost.toLowerCase() ||
        r.toLowerCase().endsWith(`.${targetHost.toLowerCase()}`)
      );
      
      if (!cnameVerified) {
        errors.push(`CNAME record found but doesn't point to ${targetHost}`);
      }
    } catch (dnsError: any) {
      if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
        errors.push(`CNAME record not found. Please point your domain to ${targetHost}`);
      } else {
        errors.push(`CNAME lookup failed: ${dnsError.message}`);
      }
    }

    if (txtVerified && cnameVerified) {
      const verifiedDomain = await customDomainsStorage.verifyDomain(domainId);
      
      return res.json({
        success: true,
        message: 'Domain verified successfully! SSL certificate is being provisioned.',
        domain: verifiedDomain,
        verification: {
          txtVerified: true,
          cnameVerified: true
        }
      });
    } else {
      return res.json({
        success: false,
        message: 'Domain verification incomplete',
        verification: {
          txtVerified,
          cnameVerified
        },
        errors,
        instructions: {
          txt: {
            host: '_jatevo-verify',
            value: domain.verificationToken,
            status: txtVerified ? 'verified' : 'pending'
          },
          cname: {
            host: '@',
            value: targetHost,
            status: cnameVerified ? 'verified' : 'pending'
          }
        }
      });
    }
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    res.status(500).json({ 
      error: 'Failed to verify custom domain',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const domainId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (isNaN(domainId)) {
      return res.status(400).json({ error: 'Invalid domain ID' });
    }

    const domain = await customDomainsStorage.getCustomDomainById(domainId);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (domain.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await customDomainsStorage.deleteCustomDomain(domainId);
    
    res.json({ 
      success: true, 
      message: 'Custom domain removed successfully' 
    });
  } catch (error) {
    console.error('Error deleting custom domain:', error);
    res.status(500).json({ 
      error: 'Failed to delete custom domain',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/check/:domain', async (req: Request, res: Response) => {
  try {
    const domain = req.params.domain.toLowerCase().trim();
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const isAvailable = await customDomainsStorage.isDomainAvailable(domain);
    
    res.json({ 
      domain,
      available: isAvailable,
      message: isAvailable ? 'Domain is available' : 'Domain is already taken'
    });
  } catch (error) {
    console.error('Error checking domain availability:', error);
    res.status(500).json({ 
      error: 'Failed to check domain availability',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/lookup/:domain', async (req: Request, res: Response) => {
  try {
    const domain = req.params.domain.toLowerCase().trim();
    
    const customDomain = await customDomainsStorage.getCustomDomainByDomain(domain);
    
    if (!customDomain) {
      return res.status(404).json({ 
        error: 'Domain not found',
        message: 'This domain is not registered with Jatevo'
      });
    }

    if (!customDomain.verified) {
      return res.status(400).json({ 
        error: 'Domain not verified',
        message: 'This domain has not been verified yet'
      });
    }

    res.json({
      domain: customDomain.domain,
      deploymentSlug: customDomain.deploymentSlug,
      verified: customDomain.verified,
      sslStatus: customDomain.sslStatus
    });
  } catch (error) {
    console.error('Error looking up domain:', error);
    res.status(500).json({ 
      error: 'Failed to lookup domain',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
