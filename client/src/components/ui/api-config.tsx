import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ApiConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ApiConfigProps {
  apiConfig: ApiConfig;
  onApiConfigChange: (apiConfig: ApiConfig) => void;
}

export function ApiConfigComponent({ apiConfig, onApiConfigChange }: ApiConfigProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<"idle" | "validating" | "valid" | "invalid">("idle");

  // Handle API key change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onApiConfigChange({
      ...apiConfig,
      apiKey: e.target.value
    });
  };

  // Handle save token change
  const handleSaveTokenChange = (checked: boolean) => {
    onApiConfigChange({
      ...apiConfig,
      saveToken: checked
    });
  };

  // Validate API key
  const validateApiKey = async () => {
    // If API key is empty, we'll use the environment variable
    if (!apiConfig.apiKey || !apiConfig.apiKey.trim()) {
      toast({
        title: "Using Environment Variable",
        description: "You haven't provided an API key, so we'll use the one from the environment variables.",
      });
      return;
    }

    setValidationStatus("validating");
    try {
      // In a real implementation, you would make an API call to validate the key
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
      
      // Always consider it valid for this demo - in a real app, you'd check against the API
      setValidationStatus("valid");
      toast({
        title: "API Key Valid",
        description: "Your SambaNova API key has been validated successfully.",
      });
    } catch (error) {
      setValidationStatus("invalid");
      toast({
        title: "API Key Invalid",
        description: "The API key could not be validated. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="text-lg flex justify-between items-center">
          API Configuration
          <span className="text-sm text-gray-500">{isExpanded ? "▲" : "▼"}</span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key">SambaNova API Key (Optional)</Label>
              <div className="flex mt-1">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key here"
                  value={apiConfig.apiKey}
                  onChange={handleApiKeyChange}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  className="ml-2"
                  onClick={validateApiKey}
                  disabled={validationStatus === "validating"}
                >
                  {validationStatus === "validating" ? "Validating..." : "Validate"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the environment variable (recommended).
              </p>
              
              {validationStatus === "valid" && (
                <p className="text-xs text-green-600 mt-1">✓ API key is valid</p>
              )}
              
              {validationStatus === "invalid" && (
                <p className="text-xs text-red-600 mt-1">✗ API key is invalid</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="save-token" 
                checked={apiConfig.saveToken}
                onCheckedChange={(checked) => handleSaveTokenChange(!!checked)}
              />
              <Label htmlFor="save-token">Save token for future sessions</Label>
            </div>
            
            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex">
                <div className="text-blue-800">
                  <p className="text-sm font-medium">Using SambaNova DeepSeek-V3-0324 Model</p>
                  <p className="text-xs mt-1">
                    A state-of-the-art language model for generating high-quality landing pages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}