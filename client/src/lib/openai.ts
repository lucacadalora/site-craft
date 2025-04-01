import { ApiConfig } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Function to generate landing page HTML and CSS
export async function generateLandingPage(
  prompt: string,
  templateId: string,
  category: string,
  settings: any,
  apiConfig: ApiConfig
): Promise<{ html: string; css: string }> {
  try {
    const response = await apiRequest("POST", "/api/generate", {
      prompt,
      templateId,
      category,
      settings,
      apiConfig,
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating landing page:", error);
    throw error;
  }
}

// Function to validate API key
export async function validateApiKey(
  apiKey: string,
  provider: string
): Promise<boolean> {
  try {
    const response = await apiRequest("POST", "/api/validate-api-key", {
      apiKey,
      provider,
    });

    return response.ok;
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
}

// Function to estimate token usage
export async function estimateTokenUsage(
  prompt: string,
  templateId: string
): Promise<number> {
  try {
    const response = await apiRequest("POST", "/api/estimate-tokens", {
      prompt,
      templateId,
    });

    if (!response.ok) {
      throw new Error(`Failed to estimate tokens: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tokenEstimate;
  } catch (error) {
    console.error("Error estimating token usage:", error);
    return 0;
  }
}

// Function to publish a landing page
export async function publishLandingPage(
  projectId: number,
  siteName: string,
  useCustomDomain: boolean = false,
  customDomain?: string
): Promise<{ url: string }> {
  try {
    const response = await apiRequest("POST", "/api/publish", {
      projectId,
      siteName,
      useCustomDomain,
      customDomain,
    });

    if (!response.ok) {
      throw new Error(`Publishing failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error publishing landing page:", error);
    throw error;
  }
}

// Function to export a landing page
export async function exportLandingPage(
  projectId: number,
  format: "html" | "pdf"
): Promise<Blob> {
  try {
    const response = await fetch(`/api/export/${projectId}?format=${format}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("Error exporting landing page:", error);
    throw error;
  }
}
