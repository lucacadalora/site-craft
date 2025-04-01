import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Sidebar } from "@/components/ui/sidebar";
import { EditorToolbar } from "@/components/ui/editor-toolbar";
import { PreviewPane } from "@/components/ui/preview-pane";
import { PromptInput } from "@/components/ui/prompt-input";
import { TemplateSelector } from "@/components/ui/template-selector";
import { ApiConfigComponent } from "@/components/ui/api-config";
import { PublishModal } from "@/components/ui/publish-modal";
import { PageExport } from "@/components/ui/page-export";
import { Template, Settings, ApiConfig, settingsSchema } from "@shared/schema";
import { fetchTemplatesByCategory, getTemplateThumbnailUrl } from "@/lib/templates";
import { generateLandingPage, estimateTokenUsage } from "@/lib/openai";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Default settings
const defaultSettings: Settings = {
  colors: {
    primary: "#3b82f6",
  },
  font: "Inter",
  layout: "Standard",
};

interface EditorProps {
  id?: string;
  apiConfig: ApiConfig;
  onApiConfigChange: (config: ApiConfig) => void;
}

export default function Editor({ id, apiConfig, onApiConfigChange }: EditorProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [html, setHtml] = useState<string | null>(null);
  const [css, setCss] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  // Define project type for type safety
  interface Project {
    id: number;
    name: string;
    description?: string;
    prompt: string;
    templateId: string;
    category: string;
    html?: string | null;
    css?: string | null;
    settings?: any;
    published?: boolean;
    publishPath?: string;
    userId?: number;
    createdAt?: string;
  }

  // Fetch project if ID is provided
  const projectQuery = useQuery<Project>({
    queryKey: ['/api/projects', id],
    enabled: !!id,
  });

  // Load project data
  useEffect(() => {
    if (projectQuery.data) {
      const project = projectQuery.data;
      if (project) {
        setPrompt(project.prompt || '');
        setSelectedCategory(project.category || null);
        setSelectedTemplate(project.templateId || null);
        setSettings(project.settings || defaultSettings);
        setHtml(project.html || null);
        setCss(project.css || null);
        setProjectId(project.id || null);

        // Load templates for this category if there is one
        if (project.category) {
          fetchTemplatesByCategory(project.category).then(setTemplates);
        }
      }
    }
  }, [projectQuery.data]);

  // No need to load API config from localStorage as it's passed through props

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

  // Handle category selection
  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedTemplate(null);
    
    try {
      const templates = await fetchTemplatesByCategory(categoryId);
      setTemplates(templates);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load templates for this category",
        variant: "destructive",
      });
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Estimate token usage
    if (prompt) {
      estimateTokenUsage(prompt, templateId).then(setTokenUsage);
    }
  };

  // Handle generation
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerate = async () => {
    if (!prompt || !selectedTemplate || !selectedCategory) {
      toast({
        title: "Missing Information",
        description: "Please provide a description and select a template",
        variant: "destructive",
      });
      return;
    }

    // API key is now optional because we use the environment variable
    // This validation is no longer needed

    setIsGenerating(true);
    try {
      const result = await generateLandingPage(
        prompt,
        selectedTemplate,
        selectedCategory,
        settings,
        apiConfig
      );
      
      setHtml(result.html);
      setCss(result.css);
      
      // Save or update project
      const projectData = {
        name: prompt.slice(0, 30) + "...",
        description: prompt,
        prompt,
        templateId: selectedTemplate,
        category: selectedCategory,
        settings,
        html: result.html,
        css: result.css,
      };
      
      if (projectId) {
        updateProjectMutation.mutate({ id: projectId, data: projectData });
      } else {
        createProjectMutation.mutate(projectData);
      }
      
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
    if (!selectedTemplate || !selectedCategory) {
      toast({
        title: "Missing Information",
        description: "Please select a template and category before saving",
        variant: "destructive",
      });
      return;
    }

    const projectData = {
      name: prompt.slice(0, 30) + "...",
      description: prompt,
      prompt,
      templateId: selectedTemplate,
      category: selectedCategory,
      settings,
      html,
      css,
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
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setHtml(null);
    setCss(null);
    setProjectId(null);
    setSettings(defaultSettings);
    setTemplates([]);
    navigate("/editor");
  };

  // Handle preview
  const handlePreview = () => {
    // This is handled by the PreviewPane component
    // Just make sure we have something to preview
    if (!html) {
      toast({
        title: "No Preview Available",
        description: "Generate a landing page first to preview it",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Header
        onSave={handleSave}
        onPublish={() => setPublishModalOpen(true)}
        onExport={() => setExportModalOpen(true)}
        isSaving={createProjectMutation.isPending || updateProjectMutation.isPending}
      />

      <main className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          onNewProject={handleNewProject}
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
          settings={settings}
          onSettingsChange={setSettings}
        />

        <div className="flex-1 flex flex-col">
          <EditorToolbar
            tokenUsage={tokenUsage}
            totalTokens={1000}
            onPreview={handlePreview}
          />

          <div className="flex-1 flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 p-4 bg-gray-50 overflow-auto">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                disabled={isGenerating}
              />

              <TemplateSelector
                selectedCategory={selectedCategory}
                templates={templates}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />

              {/* API config panel - temporarily commenting out as we use env var */}
              {/* <ApiConfigComponent
                apiConfig={apiConfig}
                onApiConfigChange={onApiConfigChange}
              /> */}
            </div>
            
            <PreviewPane
              html={html}
              css={css}
              isLoading={isGenerating}
              onRefresh={handleGenerate}
            />
          </div>
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
