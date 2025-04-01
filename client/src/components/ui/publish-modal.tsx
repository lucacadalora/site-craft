import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { publishLandingPage } from "@/lib/openai";

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | null;
  onSuccess?: (url: string) => void;
}

export function PublishModal({ open, onOpenChange, projectId, onSuccess }: PublishModalProps) {
  const [siteName, setSiteName] = useState("");
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  // Handle domain type change
  const handleDomainTypeChange = (value: string) => {
    setUseCustomDomain(value === "custom");
  };

  // Handle publish
  const handlePublish = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected for publishing",
        variant: "destructive",
      });
      return;
    }

    if (!siteName) {
      toast({
        title: "Error",
        description: "Please enter a site name",
        variant: "destructive",
      });
      return;
    }

    if (useCustomDomain && !customDomain) {
      toast({
        title: "Error",
        description: "Please enter a custom domain or select free subdomain",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishLandingPage(
        projectId,
        siteName,
        useCustomDomain,
        customDomain
      );
      
      toast({
        title: "Success",
        description: "Your landing page has been published!",
      });
      
      if (onSuccess) {
        onSuccess(result.url);
      }
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Publishing failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Publish Landing Page</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="site-name" className="text-right">
              Site Name
            </Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="my-landing-page"
              className="col-span-3"
            />
          </div>
          
          <div className="text-xs col-start-2 col-span-3 text-gray-500 -mt-3">
            Your site will be available at landingcraft.io/sites/your-site-name
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="domain-type" className="text-right">
              Domain
            </Label>
            <Select
              onValueChange={handleDomainTypeChange}
              defaultValue="free"
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select domain type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free subdomain (yourdomain.landingcraft.io)</SelectItem>
                <SelectItem value="custom">Custom domain (requires Pro plan)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {useCustomDomain && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="custom-domain" className="text-right">
                Custom Domain
              </Label>
              <Input
                id="custom-domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="example.com"
                className="col-span-3"
              />
            </div>
          )}
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Token usage for publish</p>
              <p className="text-xs text-gray-500">Estimated: 150 tokens</p>
            </div>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Within free tier</span>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing || !projectId || !siteName || (useCustomDomain && !customDomain)}
            className="bg-primary hover:bg-blue-600"
          >
            {isPublishing ? "Publishing..." : "Publish Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
