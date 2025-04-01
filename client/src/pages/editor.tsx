import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PreviewPane } from "@/components/ui/preview-pane";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiConfigComponent } from "@/components/ui/api-config";
import { PublishModal } from "@/components/ui/publish-modal";
import { PageExport } from "@/components/ui/page-export";
import { ApiConfig, SiteStructure } from "@shared/schema";
import { generateDeepSite, estimateTokenUsage } from "@/lib/sambanova";
import { AIAccelerateConfig } from "@/components/ui/deepsite-config";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, Zap } from "lucide-react";

// Categories available for landing pages
const CATEGORIES = [
  { id: "general", name: "General" },
  { id: "education", name: "Education/EdTech" },
  { id: "portfolio", name: "Designer/Portfolio" }, 
  { id: "finance", name: "Finance" },
  { id: "marketplace", name: "Marketplace/E-commerce" },
  { id: "technology", name: "Technology" },
  { id: "healthcare", name: "Healthcare" },
  { id: "real-estate", name: "Real Estate" },
  { id: "restaurant", name: "Restaurant/Food" },
  { id: "nonprofit", name: "Nonprofit/Charity" }
];

// Define project interface
interface Project {
  id: number;
  name: string;
  description?: string;
  prompt: string;
  category: string;
  html?: string | null;
  css?: string | null;
  published?: boolean;
  publishPath?: string;
  userId?: number;
  createdAt?: string;
  siteStructure?: SiteStructure;
}

export default function Editor() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core state
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [html, setHtml] = useState<string | null>(null);
  const [css, setCss] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  
  // API config for SambaNova - using environment variable by default
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    provider: "SambaNova (DeepSeek-V3-0324)",
    apiKey: "",  // This will use the environment variable
    saveToken: false,
  });

  // AI Accelerate configuration
  const [siteStructure, setSiteStructure] = useState<SiteStructure>({
    sections: ["hero", "features", "testimonials", "about", "contact"],
    contentDepth: "detailed"
  });

  // Fetch project if ID is provided
  const projectQuery = useQuery<Project>({
    queryKey: ['/api/projects', id],
    enabled: !!id,
  });

  // Update token estimate when prompt changes
  useEffect(() => {
    if (prompt) {
      const estimated = estimateTokenUsage(prompt);
      setTokenUsage(estimated);
    } else {
      setTokenUsage(0);
    }
  }, [prompt]);

  // Load project data
  useEffect(() => {
    if (projectQuery.data) {
      const project = projectQuery.data;
      setPrompt(project.prompt || '');
      setSelectedCategory(project.category || 'general');
      setHtml(project.html || null);
      setCss(project.css || null);
      setProjectId(project.id || null);
      
      // Load site structure if available
      if (project.siteStructure) {
        setSiteStructure(project.siteStructure);
      }
    }
  }, [projectQuery.data]);

  // Load API config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('landingcraft_api_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setApiConfig(prevConfig => ({
          ...prevConfig,
          ...parsed,
        }));
      } catch (e) {
        console.error("Failed to parse saved API config:", e);
      }
    }
  }, []);

  // Save API config to localStorage when it changes
  useEffect(() => {
    if (apiConfig.saveToken) {
      localStorage.setItem('landingcraft_api_config', JSON.stringify(apiConfig));
    } else {
      localStorage.removeItem('landingcraft_api_config');
    }
  }, [apiConfig]);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setProjectId(data.id);
      toast({
        title: "Project Saved",
        description: "Your project has been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project Updated",
        description: "Your project has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt || !selectedCategory) {
      toast({
        title: "Missing Information",
        description: "Please provide a description and select a category",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Show toast indicating generation
      toast({
        title: "AI Accelerate™ Generation",
        description: "Creating a comprehensive landing page with multiple sections...",
      });
      
      // Call the AI Accelerate API
      const result = await generateDeepSite(
        prompt,
        selectedCategory,
        siteStructure.sections,
        siteStructure.contentDepth,
        apiConfig
      );
      
      // Set HTML and CSS for preview
      setHtml(result.html);
      setCss(result.css);
      
      // Save or update project
      const projectData = {
        name: prompt.slice(0, 30) + "...",
        description: prompt,
        prompt,
        category: selectedCategory,
        templateId: "default", // Required by schema
        html: result.html,
        css: result.css,
        siteStructure,
      };
      
      if (projectId) {
        updateProjectMutation.mutate({ id: projectId, data: projectData });
      } else {
        createProjectMutation.mutate(projectData);
      }
      
      toast({
        title: "AI Accelerate™ Generation Complete",
        description: "Your comprehensive landing page has been generated successfully",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred during generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle save
  const handleSave = () => {
    if (!selectedCategory || !html || !css) {
      toast({
        title: "Missing Information",
        description: "Please generate a landing page before saving",
        variant: "destructive",
      });
      return;
    }

    const projectData = {
      name: prompt.slice(0, 30) + "...",
      description: prompt,
      prompt,
      category: selectedCategory,
      templateId: "default", // Required by schema
      html,
      css,
      siteStructure,
    };
    
    if (projectId) {
      updateProjectMutation.mutate({ id: projectId, data: projectData });
    } else {
      createProjectMutation.mutate(projectData);
    }
  };

  // Handle new project
  const handleNewProject = () => {
    setPrompt("");
    setSelectedCategory("general");
    setHtml(null);
    setCss(null);
    setProjectId(null);
    setSiteStructure({
      sections: ["hero", "features", "testimonials", "about", "contact"],
      contentDepth: "detailed"
    });
    navigate("/editor");
  };

  // Handle preview refresh
  const handlePreviewRefresh = () => {
    if (!prompt || !selectedCategory) {
      toast({
        title: "Missing Information",
        description: "Please provide a description before generating",
        variant: "destructive",
      });
      return;
    }
    
    handleGenerate();
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header
        onSave={handleSave}
        onPublish={() => setPublishModalOpen(true)}
        onExport={() => setExportModalOpen(true)}
        onNewProject={handleNewProject}
        isSaving={createProjectMutation.isPending || updateProjectMutation.isPending}
      />

      <main className="flex-1 flex flex-col">
        <div className="container mx-auto py-4">
          <div className="flex justify-end items-center mb-6">
            {tokenUsage > 0 && (
              <div className="text-sm text-gray-500">
                Estimated tokens: <span className="font-semibold">{tokenUsage}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 p-4 bg-gray-50 overflow-auto">
            {/* Prompt input */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Describe your landing page</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the landing page you want to create..."
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>
            
            {/* Category selection */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Select a category</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="mt-4">
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Landing Page
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Configuration */}
            <ApiConfigComponent
              apiConfig={apiConfig}
              onApiConfigChange={setApiConfig}
            />
            
            {/* AI Accelerate Configuration */}
            <AIAccelerateConfig
              enabled={true}
              onEnabledChange={() => {/* AI Accelerate is always enabled */}}
              siteStructure={siteStructure}
              onSiteStructureChange={setSiteStructure}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>
          
          {/* Preview pane */}
          <PreviewPane
            html={html}
            css={css}
            isLoading={isGenerating}
            onRefresh={handlePreviewRefresh}
          />
        </div>
      </main>

      <Footer />

      <PublishModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        projectId={projectId}
        onSuccess={(url) => {
          toast({
            title: "Published Successfully",
            description: `Your landing page is now live at ${url}`,
          });
        }}
      />

      <PageExport
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        projectId={projectId}
      />
    </div>
  );
}