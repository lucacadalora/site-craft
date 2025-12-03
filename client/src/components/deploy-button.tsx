import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Globe, Settings, ExternalLink, RefreshCw, Edit } from 'lucide-react';
import { bundleFilesForDeployment } from '@/lib/bundle-for-deployment';
import { CustomDomainManager } from './custom-domain-manager';

interface ProjectFile {
  name: string;
  content: string;
}

interface ExistingDeployment {
  id: number;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface DeployButtonProps {
  files?: ProjectFile[];
  html?: string;
  css?: string;
  projectId?: number | null;
}

export function DeployButton({ files, html, css = '', projectId }: DeployButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugChecked, setSlugChecked] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [existingDeployment, setExistingDeployment] = useState<ExistingDeployment | null>(null);
  const [isLoadingDeployment, setIsLoadingDeployment] = useState(false);
  const [isChangingSlug, setIsChangingSlug] = useState(false);
  
  // Fetch existing deployment when dialog opens
  useEffect(() => {
    if (isOpen && projectId) {
      fetchExistingDeployment();
    }
  }, [isOpen, projectId]);
  
  const fetchExistingDeployment = async () => {
    if (!projectId) return;
    
    setIsLoadingDeployment(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/projects/${projectId}/deployment`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.deployment) {
          setExistingDeployment(data.deployment);
          setPublishedUrl(`${window.location.origin}/sites/${data.deployment.slug}`);
          setSlug(data.deployment.slug);
        }
      }
    } catch (error) {
      console.error('Error fetching existing deployment:', error);
    } finally {
      setIsLoadingDeployment(false);
    }
  };
  
  // When the dialog opens, reset states
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset all states when closing
      setSlug('');
      setSlugChecked(false);
      setSlugAvailable(false);
      setPublishedUrl(null);
      setExistingDeployment(null);
      setIsChangingSlug(false);
    }
  };
  
  // Start the process of changing the slug
  const startChangingSlug = () => {
    setIsChangingSlug(true);
    setSlug(''); // Clear to allow entering a new slug
    setSlugChecked(false);
    setSlugAvailable(false);
  };
  
  // Cancel changing slug and go back to deployment info view
  const cancelChangingSlug = () => {
    setIsChangingSlug(false);
    setSlug(existingDeployment?.slug || '');
    setSlugChecked(false);
    setSlugAvailable(false);
  };

  // Handle slug input changes
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    setSlug(value);
    setSlugChecked(false);
    setSlugAvailable(false);
  };

  // Check if the slug is available
  const checkSlugAvailability = async () => {
    if (!slug) {
      toast({
        title: 'Error',
        description: 'Please enter a slug',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingSlug(true);
    
    try {
      // Make a real API call to check slug availability using the new sites API
      const response = await fetch(`/sites/${slug}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      setSlugChecked(true);
      setSlugAvailable(data.isAvailable);
      
      if (!data.isAvailable) {
        toast({
          title: 'Slug Unavailable',
          description: data.message || 'This slug is already in use. Please choose another one.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Fallback to the legacy endpoint if the new one fails
      try {
        const legacyResponse = await fetch(`/api/check-slug?slug=${slug}`);
        const legacyData = await legacyResponse.json();
        
        setSlugChecked(true);
        setSlugAvailable(!legacyData.exists);
        
        if (legacyData.exists) {
          toast({
            title: 'Slug Unavailable',
            description: 'This slug is already in use. Please choose another one.',
            variant: 'destructive',
          });
        }
      } catch (e) {
        // Fallback to allowing the slug if both checks fail
        console.error('Error checking slug availability:', error);
        setSlugChecked(true);
        setSlugAvailable(true);
        
        toast({
          title: 'Warning',
          description: 'Could not verify slug availability. Proceeding anyway.',
          variant: 'default',
        });
      }
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Deploy the page
  const deployPage = async () => {
    // Determine what content to deploy
    let deployHtml = '';
    let deployCss = '';
    
    if (files && files.length > 0) {
      // Multi-file project - bundle everything into a single HTML
      try {
        deployHtml = bundleFilesForDeployment(files);
        // CSS is already bundled into the HTML, so no separate CSS
        deployCss = '';
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to bundle files for deployment',
          variant: 'destructive',
        });
        return;
      }
    } else if (html) {
      // Single file project (legacy from /editor)
      deployHtml = html;
      deployCss = css;
    } else {
      toast({
        title: 'Error',
        description: 'No content to deploy',
        variant: 'destructive',
      });
      return;
    }

    if (!slug) {
      toast({
        title: 'Error',
        description: 'Please enter a slug',
        variant: 'destructive',
      });
      return;
    }

    if (!slugChecked || !slugAvailable) {
      toast({
        title: 'Error',
        description: 'Please check slug availability first',
        variant: 'destructive',
      });
      return;
    }

    setIsDeploying(true);

    try {
      // Get auth token for the request
      const token = localStorage.getItem('auth_token');
      
      // Use the new deployment API
      const deployResponse = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          html: deployHtml,
          css: deployCss,
          slug,
          projectId,
        }),
      });

      if (!deployResponse.ok) {
        // Handle error without trying to parse JSON if it fails
        let errorMessage = 'Failed to deploy page';
        try {
          const errorData = await deployResponse.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const deployData = await deployResponse.json();
      let url = `/sites/${slug}`;
      
      if (deployData.success && deployData.deployment) {
        if (deployData.deployment.url) {
          url = deployData.deployment.url;
        }
        
        // Show success toast with additional details
        toast({
          title: 'Success!',
          description: deployData.message || 'Your page has been deployed successfully!',
        });
      } else {
        // Fallback to old response format
        url = deployData.publishUrl || url;
      }
      
      const fullUrl = window.location.origin + url;
      setPublishedUrl(fullUrl);
    } catch (error) {
      console.error('Error deploying page:', error);
      
      // Try to get more detailed error information
      let errorMessage = 'Failed to deploy page';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', error.stack);
      }
      
      // Log the deployment parameters for debugging
      console.log('Deployment attempt details:', {
        slug,
        htmlLength: html?.length || 0,
        cssLength: css?.length || 0,
        projectId
      });
      
      // Try the old deployment endpoint as fallback
      try {
        console.log('Attempting legacy deployment method');
        const legacyToken = localStorage.getItem('auth_token');
        const legacyResponse = await fetch('/api/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(legacyToken ? { 'Authorization': `Bearer ${legacyToken}` } : {}),
          },
          body: JSON.stringify({
            html,
            css,
            slug,
          }),
        });
        
        if (!legacyResponse.ok) {
          // Try to get detailed error from response
          let legacyErrorMessage = 'Legacy deployment also failed';
          try {
            const errorData = await legacyResponse.json();
            if (errorData.error) {
              legacyErrorMessage = errorData.error;
            }
          } catch (e) {
            console.error('Could not parse error response from legacy endpoint');
          }
          throw new Error(legacyErrorMessage);
        }
        
        const legacyData = await legacyResponse.json();
        const legacyUrl = legacyData.publishUrl || `/sites/${slug}`;
        const fullLegacyUrl = window.location.origin + legacyUrl;
        
        setPublishedUrl(fullLegacyUrl);
        
        toast({
          title: 'Success!',
          description: 'Your page has been deployed successfully with the legacy system.',
        });
      } catch (fallbackError) {
        // Both deployment methods failed
        console.error('Both deployment methods failed:', fallbackError);
        
        let fallbackErrorMessage = fallbackError instanceof Error ? 
          fallbackError.message : 'Legacy deployment also failed';
          
        toast({
          title: 'Deployment Failed',
          description: `${errorMessage}. Fallback also failed: ${fallbackErrorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeploying(false);
    }
  };

  const openDeployedPage = () => {
    if (publishedUrl) {
      window.open(publishedUrl, '_blank');
    } else if (existingDeployment) {
      window.open(`${window.location.origin}/sites/${existingDeployment.slug}`, '_blank');
    }
  };

  // Redeploy to existing slug (update existing deployment)
  const redeployPage = async () => {
    if (!existingDeployment) return;
    
    // Determine what content to deploy
    let deployHtml = '';
    let deployCss = '';
    
    if (files && files.length > 0) {
      try {
        deployHtml = bundleFilesForDeployment(files);
        deployCss = '';
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to bundle files for deployment',
          variant: 'destructive',
        });
        return;
      }
    } else if (html) {
      deployHtml = html;
      deployCss = css;
    } else {
      toast({
        title: 'Error',
        description: 'No content to deploy',
        variant: 'destructive',
      });
      return;
    }

    setIsDeploying(true);

    try {
      const token = localStorage.getItem('auth_token');
      
      // Use the redeploy endpoint to update existing deployment
      const response = await fetch(`/api/deployments/${existingDeployment.slug}/redeploy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          html: deployHtml,
          css: deployCss,
          projectId,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to redeploy';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      toast({
        title: 'Redeployed Successfully!',
        description: 'Your changes are now live.',
      });
      
      setPublishedUrl(`${window.location.origin}/sites/${existingDeployment.slug}`);
    } catch (error) {
      console.error('Error redeploying:', error);
      toast({
        title: 'Redeploy Failed',
        description: error instanceof Error ? error.message : 'Failed to redeploy',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        onClick={() => handleOpen(true)}
        disabled={!html && (!files || files.length === 0)}
        className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700"
      >
        <Globe className="h-4 w-4 mr-1" />
        Deploy
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deploy Landing Page</DialogTitle>
            <DialogDescription>
              {existingDeployment 
                ? 'Manage your deployment settings and custom domain.'
                : 'Deploy your generated landing page to a public URL.'
              }
            </DialogDescription>
          </DialogHeader>

          {isLoadingDeployment ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-muted-foreground">Loading deployment info...</span>
            </div>
          ) : isChangingSlug ? (
            // Changing slug view - allows user to enter a new slug
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-slug">New URL Slug</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Current: <span className="font-mono text-xs">/sites/{existingDeployment?.slug}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-slug"
                    placeholder="new-landing-page"
                    value={slug}
                    onChange={handleSlugChange}
                    disabled={isDeploying}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={checkSlugAvailability}
                    disabled={!slug || isCheckingSlug || isDeploying}
                  >
                    {isCheckingSlug ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking
                      </>
                    ) : (
                      'Check'
                    )}
                  </Button>
                </div>
                
                {slugChecked && slugAvailable && (
                  <div className="text-sm text-green-600 flex items-center">
                    <Check className="mr-1 h-4 w-4" /> 
                    Slug is available
                  </div>
                )}
                
                {slugChecked && !slugAvailable && (
                  <div className="text-sm text-red-600">
                    This slug is already in use. Please choose another one.
                  </div>
                )}
                
                <p className="text-sm text-gray-500">
                  Your landing page will be deployed at: 
                  <br />
                  <span className="font-medium">
                    {slug ? `${window.location.origin}/sites/${slug}` : `${window.location.origin}/sites/your-new-slug`}
                  </span>
                </p>
              </div>
              
              <DialogFooter className="mt-4 flex-wrap gap-2">
                <Button variant="outline" onClick={cancelChangingSlug}>
                  Cancel
                </Button>
                <Button
                  onClick={deployPage}
                  disabled={!slug || !slugChecked || !slugAvailable || isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Deploy to New URL
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (publishedUrl || existingDeployment) ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">
                  {publishedUrl ? 'Successfully Deployed!' : 'Deployment Active'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your page is live at:
                </p>
                <div className="flex items-center justify-center">
                  <a 
                    href={publishedUrl || `${window.location.origin}/sites/${existingDeployment?.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 underline break-all"
                  >
                    {publishedUrl || `${window.location.origin}/sites/${existingDeployment?.slug}`}
                  </a>
                </div>
                
                {existingDeployment && !publishedUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Made changes? Use "Redeploy" to update your live site.
                  </p>
                )}
              </div>

              {(slug || existingDeployment?.slug) && (
                <div className="border-t pt-4">
                  <CustomDomainManager 
                    deploymentSlug={slug || existingDeployment?.slug || ''} 
                    onDomainConnected={() => {}}
                  />
                </div>
              )}
              
              <DialogFooter className="mt-4 flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleOpen(false)}>
                  Close
                </Button>
                {existingDeployment && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={startChangingSlug}
                      disabled={isDeploying}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Change URL
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={redeployPage}
                      disabled={isDeploying}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redeploying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Redeploy
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Button onClick={openDeployedPage}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Page
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="slug"
                      placeholder="my-landing-page"
                      value={slug}
                      onChange={handleSlugChange}
                      disabled={isDeploying}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={checkSlugAvailability}
                      disabled={!slug || isCheckingSlug || isDeploying}
                    >
                      {isCheckingSlug ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking
                        </>
                      ) : (
                        'Check'
                      )}
                    </Button>
                  </div>
                  
                  {slugChecked && slugAvailable && (
                    <div className="text-sm text-green-600 flex items-center">
                      <Check className="mr-1 h-4 w-4" /> 
                      Slug is available
                    </div>
                  )}
                  
                  {slugChecked && !slugAvailable && (
                    <div className="text-sm text-red-600">
                      This slug is already in use. Please choose another one.
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-500">
                    Your landing page will be deployed at: 
                    <br />
                    <span className="font-medium">
                      {slug ? `${window.location.origin}/sites/${slug}` : `${window.location.origin}/sites/your-slug`}
                    </span>
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpen(false)}
                  disabled={isDeploying}
                >
                  Cancel
                </Button>
                <Button
                  onClick={deployPage}
                  disabled={!slug || !slugChecked || !slugAvailable || isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Deploy
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}