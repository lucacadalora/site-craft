import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | null;
  onSuccess: (url: string) => void;
}

export function PublishModal({ open, onOpenChange, projectId, onSuccess }: PublishModalProps) {
  const { toast } = useToast();
  const [slug, setSlug] = React.useState('');
  const [slugAvailable, setSlugAvailable] = React.useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = React.useState(false);

  // Check if the slug is available
  const checkSlug = async () => {
    if (!slug) return;
    
    setCheckingSlug(true);
    
    try {
      // This would be a real API call in a production application
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For demo purposes, we'll just pretend the slug is available
      setSlugAvailable(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check slug availability',
        variant: 'destructive',
      });
      setSlugAvailable(false);
    } finally {
      setCheckingSlug(false);
    }
  };

  // Submit the publish request
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !slug) {
        throw new Error('Missing project ID or slug');
      }
      
      const res = await apiRequest('POST', `/api/projects/${projectId}/publish`, { slug });
      return res.json();
    },
    onSuccess: (data) => {
      // Use the actual publishUrl from the API response if available
      const publishedUrl = data.publishUrl || `/sites/${slug}`;
      
      // For custom domain use cases, replace the domain dynamically
      const fullUrl = window.location.origin + publishedUrl;
      
      onSuccess(fullUrl);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Publish Failed',
        description: error instanceof Error ? error.message : 'Failed to publish landing page',
        variant: 'destructive',
      });
    },
  });
  
  // Reset state when the modal is opened
  React.useEffect(() => {
    if (open) {
      setSlug('');
      setSlugAvailable(null);
    }
  }, [open]);

  // Handle slug change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
      
    setSlug(value);
    setSlugAvailable(null);
  };

  // Handle publish
  const handlePublish = () => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'No project to publish',
        variant: 'destructive',
      });
      return;
    }
    
    if (!slug) {
      toast({
        title: 'Error',
        description: 'Please enter a URL slug',
        variant: 'destructive',
      });
      return;
    }
    
    if (slugAvailable !== true) {
      toast({
        title: 'Error',
        description: 'Please check slug availability first',
        variant: 'destructive',
      });
      return;
    }
    
    publishMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Publish Landing Page</DialogTitle>
          <DialogDescription>
            This will publish your landing page to a public URL.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-right">
              URL Slug
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                value={slug}
                onChange={handleSlugChange}
                placeholder="my-landing-page"
                className="flex-1"
                disabled={publishMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkSlug}
                disabled={!slug || checkingSlug || publishMutation.isPending}
              >
                {checkingSlug ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : (
                  'Check'
                )}
              </Button>
            </div>
            {slugAvailable === true && (
              <div className="text-sm text-green-600 flex items-center">
                <Check className="mr-1 h-4 w-4" /> Slug is available
              </div>
            )}
            {slugAvailable === false && (
              <div className="text-sm text-red-600">
                Slug is not available
              </div>
            )}
            <p className="text-sm text-gray-500">
              Your landing page will be published at: <span className="font-medium">{slug ? `${window.location.origin}/sites/${slug}` : `${window.location.origin}/sites/your-slug`}</span>
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publishMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handlePublish}
            disabled={!slug || slugAvailable !== true || publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}