import React, { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiConfig, apiConfigSchema } from "@shared/schema";
import { API_PROVIDERS } from "@/lib/templates";
import { validateApiKey } from "@/lib/openai";

interface ApiConfigProps {
  apiConfig: ApiConfig;
  onApiConfigChange: (config: ApiConfig) => void;
}

export function ApiConfigComponent({ apiConfig, onApiConfigChange }: ApiConfigProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Handle API provider change
  const handleProviderChange = (value: string) => {
    onApiConfigChange({
      ...apiConfig,
      provider: value,
    });
  };

  // Handle API key change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onApiConfigChange({
      ...apiConfig,
      apiKey: e.target.value,
    });
  };

  // Handle save token change
  const handleSaveTokenChange = (checked: boolean) => {
    onApiConfigChange({
      ...apiConfig,
      saveToken: checked,
    });
  };

  // Validate API key
  const handleValidateKey = async () => {
    // Validate with Zod first
    const result = apiConfigSchema.safeParse(apiConfig);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid API key",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateApiKey(apiConfig.apiKey, apiConfig.provider);
      
      if (isValid) {
        toast({
          title: "Success",
          description: "API key is valid and working",
        });
      } else {
        toast({
          title: "Invalid API Key",
          description: "The provided API key could not be verified",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="bg-white p-4 rounded-md border border-gray-200">
      <CardTitle className="text-sm font-semibold text-gray-700 mb-3">API Configuration</CardTitle>
      <CardContent className="p-0 space-y-3">
        <div>
          <Label htmlFor="api-select" className="block text-xs text-gray-500 mb-1">
            API Provider
          </Label>
          <Select
            value={apiConfig.provider}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select API provider" />
            </SelectTrigger>
            <SelectContent>
              {API_PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="api-key" className="block text-xs text-gray-500 mb-1">
            API Key
          </Label>
          <div className="flex">
            <Input
              id="api-key"
              type={showApiKey ? "text" : "password"}
              className="flex-1"
              placeholder="Enter your API key"
              value={apiConfig.apiKey}
              onChange={handleApiKeyChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
              className="ml-2"
            >
              {showApiKey ? "Hide" : "Show"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Your API key is stored securely and never shared.
          </p>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-token"
              checked={apiConfig.saveToken}
              onCheckedChange={handleSaveTokenChange}
            />
            <Label htmlFor="save-token" className="text-xs text-gray-500">
              Save token for future sessions
            </Label>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleValidateKey}
            disabled={isValidating || !apiConfig.apiKey}
          >
            {isValidating ? "Validating..." : "Validate Key"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
