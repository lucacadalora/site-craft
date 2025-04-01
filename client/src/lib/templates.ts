import { Template } from "@shared/schema";

// Categories for templates
export const TEMPLATE_CATEGORIES = [
  {
    id: "education",
    name: "Education/EduTech",
  },
  {
    id: "portfolio",
    name: "Designer/Portfolio",
  },
  {
    id: "finance",
    name: "Finance",
  },
  {
    id: "marketplace",
    name: "Marketplace",
  },
  {
    id: "general",
    name: "General Project",
  },
];

// Color schemes for templates
export const COLOR_SCHEMES = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#f59e0b" },
];

// Font options for templates
export const FONT_OPTIONS = [
  { name: "Inter (Default)", value: "Inter" },
  { name: "Poppins", value: "Poppins" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Montserrat", value: "Montserrat" },
];

// Layout options for templates
export const LAYOUT_OPTIONS = [
  { name: "Standard", value: "standard" },
  { name: "Centered", value: "centered" },
  { name: "Full Width", value: "full-width" },
  { name: "Split", value: "split" },
];

// API provider options
export const API_PROVIDERS = [
  { name: "OpenAI (GPT-4o)", value: "OpenAI (GPT-4o)" },
  { name: "OpenAI (GPT-3.5 Turbo)", value: "OpenAI (GPT-3.5 Turbo)" },
  { name: "Anthropic Claude", value: "Anthropic Claude" },
  { name: "Other", value: "Other" },
];

// Helper function to get template thumbnails URLs
export function getTemplateThumbnailUrl(categoryId: string, templateId: string): string {
  return `https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80`;
}

// Helper function to fetch templates by category
export async function fetchTemplatesByCategory(categoryId: string): Promise<Template[]> {
  try {
    const response = await fetch(`/api/templates?category=${categoryId}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
}
