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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface PageExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | null;
}

export function PageExport({ open, onOpenChange, projectId }: PageExportProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = React.useState<'html-css' | 'zip' | 'github'>('html-css');

  // Submit the export request
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) {
        throw new Error('Missing project ID');
      }
      
      const res = await apiRequest('POST', `/api/projects/${projectId}/export`, { format: exportFormat });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Export Complete',
        description: 'Your landing page has been exported successfully.',
      });
      
      // Trigger download
      // In a real application, we would redirect to a download URL provided by the API
      
      // Simulate download after a short delay
      setTimeout(() => {
        const filename = data.filename || `landingpage-${projectId}.${exportFormat === 'zip' ? 'zip' : 'html'}`;
        const link = document.createElement('a');
        
        // This is a mock URL - in a real app this would be a valid download URL
        link.href = '#';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        onOpenChange(false);
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export landing page',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Landing Page</DialogTitle>
          <DialogDescription>
            Export your landing page to use it elsewhere.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <RadioGroup
            value={exportFormat}
            onValueChange={(value: 'html-css' | 'zip' | 'github') => setExportFormat(value)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="html-css" id="format-html" />
              <div className="space-y-1.5">
                <Label htmlFor="format-html" className="font-semibold">
                  Single HTML File
                </Label>
                <p className="text-sm text-gray-500">
                  Export as a self-contained HTML file with CSS included.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="zip" id="format-zip" />
              <div className="space-y-1.5">
                <Label htmlFor="format-zip" className="font-semibold">
                  ZIP Archive
                </Label>
                <p className="text-sm text-gray-500">
                  Export as a ZIP file containing separate HTML, CSS, and assets.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="github" id="format-github" />
              <div className="space-y-1.5">
                <Label htmlFor="format-github" className="font-semibold">
                  GitHub Repository
                </Label>
                <p className="text-sm text-gray-500">
                  Export directly to a new GitHub repository.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={() => exportMutation.mutate()}
            disabled={!projectId || exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}