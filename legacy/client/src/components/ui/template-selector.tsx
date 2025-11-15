import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { Template } from "@shared/schema";

interface TemplateSelectorProps {
  selectedCategory: string | null;
  templates: Template[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function TemplateSelector({
  selectedCategory,
  templates,
  selectedTemplate,
  onTemplateSelect,
  onGenerate,
  isGenerating,
}: TemplateSelectorProps) {
  // Get category name from ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Select a Template";
    
    const categories = {
      education: "Education",
      portfolio: "Designer/Portfolio",
      finance: "Finance",
      marketplace: "Marketplace",
      general: "General Project",
    };
    
    return categories[categoryId as keyof typeof categories] || categoryId;
  };

  return (
    <Card className="mb-4 bg-white border border-gray-200">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">
          Selected Template: {getCategoryName(selectedCategory)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => onTemplateSelect(template.id)}
              className={`template-card ${
                selectedTemplate === template.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="h-32 bg-gray-200 relative">
                {/* Use SVG placeholder if no thumbnail */}
                {!template.thumbnail ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                      />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={template.thumbnail}
                    className="w-full h-full object-cover"
                    alt={`${template.name} template thumbnail`}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition">
                  <span className="text-white text-xs font-medium px-2 py-1 bg-black bg-opacity-50 rounded">
                    Preview
                  </span>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700">{template.name}</p>
                <p className="text-xs text-gray-500">{template.description}</p>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-2 p-6 text-center text-gray-500">
              <p>Select a category to view available templates</p>
            </div>
          )}
        </div>
        
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !selectedTemplate}
          className="w-full bg-primary hover:bg-blue-600 text-white"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Landing Page
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
