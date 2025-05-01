import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Globe } from 'lucide-react';

interface DeployButtonProps {
  html: string;
  css?: string;
  projectId?: number | null;
}

export function DeployButton({ html, css = '', projectId }: DeployButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [slug, setSlug] = useState('');
  const [slugChecked, setSlugChecked] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  
  // When the dialog opens, reset states
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset all states when closing
      setSlug('');
      setSlugChecked(false);
      setSlugAvailable(false);
      setPublishedUrl(null);
    }
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
      // Make a real API call to check slug availability
      const response = await fetch(`/api/check-slug?slug=${slug}`);
      const data = await response.json();
      
      setSlugChecked(true);
      setSlugAvailable(!data.exists);
      
      if (data.exists) {
        toast({
          title: 'Slug Unavailable',
          description: 'This slug is already in use. Please choose another one.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Fallback to allowing the slug if the check fails
      console.error('Error checking slug availability:', error);
      setSlugChecked(true);
      setSlugAvailable(true);
      
      toast({
        title: 'Warning',
        description: 'Could not verify slug availability. Proceeding anyway.',
        variant: 'default',
      });
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Deploy the page
  const deployPage = async () => {
    if (!html) {
      toast({
        title: 'Error',
        description: 'No HTML content to deploy',
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
      // Use the direct deploy API that doesn't require authentication
      const deployResponse = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          css,
          slug,
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        throw new Error(errorData.error || 'Failed to deploy page');
      }

      const deployData = await deployResponse.json();
      const url = deployData.publishUrl || `/sites/${slug}`;
      const fullUrl = window.location.origin + url;
      
      setPublishedUrl(fullUrl);

      toast({
        title: 'Success!',
        description: 'Your page has been deployed successfully!',
      });
    } catch (error) {
      console.error('Error deploying page:', error);
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Failed to deploy page',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const openDeployedPage = () => {
    if (publishedUrl) {
      window.open(publishedUrl, '_blank');
    }
  };

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        onClick={() => handleOpen(true)}
        disabled={!html}
        className="flex items-center gap-1"
      >
        <Globe className="h-4 w-4 mr-1" />
        Deploy
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deploy Landing Page</DialogTitle>
            <DialogDescription>
              Deploy your generated landing page to a public URL.
            </DialogDescription>
          </DialogHeader>

          {publishedUrl ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Successfully Deployed!</h3>
                <p className="text-sm text-muted-foreground">
                  Your page is now live at:
                </p>
                <div className="flex items-center justify-center">
                  <a 
                    href={publishedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 underline break-all"
                  >
                    {publishedUrl}
                  </a>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => handleOpen(false)}>
                  Close
                </Button>
                <Button onClick={openDeployedPage}>
                  <Globe className="mr-2 h-4 w-4" />
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