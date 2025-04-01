import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PreviewPane } from "@/components/ui/preview-pane";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiConfigComponent } from "@/components/ui/api-config";
import { PublishModal } from "@/components/ui/publish-modal";
import { PageExport } from "@/components/ui/page-export";
import { ApiConfig } from "@shared/schema";
import { generateDeepSite, estimateTokenUsage } from "@/lib/sambanova";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, Zap } from "lucide-react";

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
}

export default function Editor() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Core state
  const [prompt, setPrompt] = useState("");
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

  // No database, so no need to fetch projects
  // We'll use local state and localStorage instead

  // Update token estimate when prompt changes
  useEffect(() => {
    if (prompt) {
      const estimated = estimateTokenUsage(prompt);
      setTokenUsage(estimated);
    } else {
      setTokenUsage(0);
    }
  }, [prompt]);

  // Load project data from localStorage instead of database
  useEffect(() => {
    const savedProject = localStorage.getItem('landingcraft_current_project');
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        setPrompt(project.prompt || '');
        setHtml(project.html || null);
        setCss(project.css || null);
        setProjectId(project.id || null);
      } catch (e) {
        console.error("Failed to parse saved project:", e);
      }
    }
  }, []);

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

  // Instead of mutations to a database, we'll save to localStorage
  const saveProject = (data: any) => {
    try {
      // Generate an ID if it doesn't exist
      if (!data.id) {
        data.id = Date.now();
        setProjectId(data.id);
      }
      
      // Save to localStorage
      localStorage.setItem('landingcraft_current_project', JSON.stringify(data));
      
      // Save to projects list
      const projectsStr = localStorage.getItem('landingcraft_projects');
      let projects = projectsStr ? JSON.parse(projectsStr) : [];
      
      // Check if project exists in the list
      const existingProjectIndex = projects.findIndex((p: any) => p.id === data.id);
      if (existingProjectIndex >= 0) {
        // Update existing project
        projects[existingProjectIndex] = data;
      } else {
        // Add new project
        projects.push(data);
      }
      
      // Save updated projects list
      localStorage.setItem('landingcraft_projects', JSON.stringify(projects));
      
      toast({
        title: "Project Saved",
        description: "Your project has been saved locally",
      });
      
      return data;
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save project locally",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: "Missing Information",
        description: "Please provide a description for your landing page",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Show toast indicating generation
      toast({
        title: "AI Generation",
        description: "Creating your landing page from description...",
      });
      
      // Call the SambaNova API
      const result = await generateDeepSite(
        prompt,
        "general", // Default category
        ["hero", "features", "testimonials", "about", "contact"], // Default sections
        "detailed", // Default content depth
        apiConfig
      );
      
      // Set HTML and CSS for preview
      setHtml(result.html);
      setCss(result.css);
      
      // Save or update project
      const projectData = {
        id: projectId || undefined,
        name: prompt.slice(0, 30) + "...",
        description: prompt,
        prompt,
        category: "general",
        templateId: "default", // Required by schema
        html: result.html,
        css: result.css,
        createdAt: new Date().toISOString()
      };
      
      // Save project to localStorage
      saveProject(projectData);
      
      toast({
        title: "Generation Complete",
        description: "Your landing page has been generated successfully",
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
    if (!html || !css) {
      toast({
        title: "Missing Information",
        description: "Please generate a landing page before saving",
        variant: "destructive",
      });
      return;
    }

    const projectData = {
      id: projectId || undefined,
      name: prompt.slice(0, 30) + "...",
      description: prompt,
      prompt,
      category: "general",
      templateId: "default", // Required by schema
      html,
      css,
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    saveProject(projectData);
    
    toast({
      title: "Saved",
      description: "Your landing page has been saved successfully",
    });
  };

  // Handle new project
  const handleNewProject = () => {
    setPrompt("");
    setHtml(null);
    setCss(null);
    setProjectId(null);
    navigate("/editor");
  };

  // Handle preview refresh
  const handlePreviewRefresh = () => {
    if (!prompt) {
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
        isSaving={false}
      />

      <main className="flex-1 flex flex-col">
        <div className="container mx-auto py-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">LandingCraft</h1>
            <div className="flex items-center">
              <Button variant="outline" onClick={handleNewProject}>
                New Project
              </Button>
              {tokenUsage > 0 && (
                <div className="ml-4 text-sm text-gray-500">
                  Estimated tokens: <span className="font-semibold">{tokenUsage}</span>
                </div>
              )}
            </div>
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
            
            {/* Generate button */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Generate Landing Page</CardTitle>
              </CardHeader>
              <CardContent>                
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
              </CardContent>
            </Card>

            {/* API Configuration */}
            <ApiConfigComponent
              apiConfig={apiConfig}
              onApiConfigChange={setApiConfig}
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