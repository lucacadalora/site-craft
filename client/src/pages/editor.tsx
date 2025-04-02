import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PageExport } from "@/components/ui/page-export";
import { ApiConfig } from "@shared/schema";
import { estimateTokenUsage, validateApiKey } from "@/lib/sambanova";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  RefreshCw, 
  Zap, 
  Save, 
  Download, 
  Settings,
  Maximize,
  Minimize
} from "lucide-react";

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

// Default HTML template
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Landing Page</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 800px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #3b82f6;
    }
    p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s ease;
    }
    .cta-button:hover {
      background-color: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to DeepSite</h1>
    <p>Create stunning landing pages with the power of AI. Describe your business, product, or service in the prompt area and click "Generate" to see the magic happen!</p>
    <a href="#" class="cta-button">Get Started</a>
  </div>
</body>
</html>`;

interface EditorProps {
  id?: string;
  initialApiConfig?: ApiConfig;
  onApiConfigChange?: (newConfig: ApiConfig) => void;
}

export default function Editor({ 
  id: idParam, 
  initialApiConfig,
  onApiConfigChange
}: EditorProps) {
  const { id } = useParams();
  const projectIdParam = idParam || id; // Use either the prop or the URL param
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Core state
  const [prompt, setPrompt] = useState("");
  const [htmlContent, setHtmlContent] = useState(defaultHTML);
  const [projectId, setProjectId] = useState<number | null>(projectIdParam ? parseInt(projectIdParam) : null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  // API config for SambaNova - using environment variable by default
  const [apiConfig, setApiConfig] = useState<ApiConfig>(initialApiConfig || {
    provider: "SambaNova (DeepSeek-V3-0324)",
    apiKey: "",  // This will use the environment variable
    saveToken: false,
  });
  
  // Update the parent's API config if it changes and if handler provided
  useEffect(() => {
    if (onApiConfigChange) {
      onApiConfigChange(apiConfig);
    }
  }, [apiConfig, onApiConfigChange]);

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
  // Set up resize handler for editor/preview panes
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (resizeRef.current && resizeRef.current.contains(e.target as Node)) {
        setIsResizing(true);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const container = document.querySelector('.editor-container') as HTMLElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const newEditorWidth = e.clientX - containerRect.left;
          const totalWidth = containerRect.width;
          
          // Ensure minimum width for editor and preview
          if (newEditorWidth > 300 && totalWidth - newEditorWidth > 300) {
            const editorElement = document.querySelector('.editor-panel') as HTMLElement;
            const previewElement = document.querySelector('.preview-panel') as HTMLElement;
            
            if (editorElement && previewElement) {
              const editorPercent = (newEditorWidth / totalWidth) * 100;
              const previewPercent = 100 - editorPercent;
              
              editorElement.style.width = `${editorPercent}%`;
              previewElement.style.width = `${previewPercent}%`;
            }
          }
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isResizing]);

  // Load API config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('deepsite_api_config');
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
      localStorage.setItem('deepsite_api_config', JSON.stringify(apiConfig));
    } else {
      localStorage.removeItem('deepsite_api_config');
    }
  }, [apiConfig]);

  // Update preview iframe when HTML changes
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = htmlContent;
    }
  }, [htmlContent]);

  // Debounce editor changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (previewRef.current) {
        previewRef.current.srcdoc = htmlContent;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [htmlContent]);

  // Save project
  const saveProject = () => {
    if (!prompt && !htmlContent) {
      toast({
        title: "Missing Information",
        description: "Nothing to save. Please create content first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const id = projectId || Date.now();
      const projectData = {
        id,
        name: prompt ? prompt.slice(0, 30) + "..." : "Untitled Project",
        description: prompt || "No description",
        prompt: prompt || "",
        category: "general",
        html: htmlContent,
        createdAt: new Date().toISOString()
      };
      
      // Save to localStorage
      localStorage.setItem('deepsite_current_project', JSON.stringify(projectData));
      setProjectId(id);
      
      // Also save to projects list
      const projectsStr = localStorage.getItem('deepsite_projects');
      let projects = projectsStr ? JSON.parse(projectsStr) : [];
      
      const existingIndex = projects.findIndex((p: any) => p.id === id);
      if (existingIndex >= 0) {
        projects[existingIndex] = projectData;
      } else {
        projects.push(projectData);
      }
      
      localStorage.setItem('deepsite_projects', JSON.stringify(projects));
      
      toast({
        title: "Saved",
        description: "Your project has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your project",
        variant: "destructive",
      });
    }
  };

  // Handle HTML editor changes
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
  };

  // Handle generation with streaming output using the SSE endpoint
  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: "Missing Information",
        description: "Please describe what you want to generate",
        variant: "destructive",
      });
      return;
    }

    if (!apiConfig.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please provide a SambaNova API key in the settings",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setStreamingOutput([]);
    
    // Generate a unique client ID for this session
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      // First establish the SSE connection
      const eventSource = new EventSource(`/api/sambanova/generate-stream?_=${clientId}`);
      
      // Setup event listeners right away
      eventSource.addEventListener('start', (event) => {
        try {
          const data = JSON.parse(event.data);
          setStreamingOutput([data.message]);
        } catch (e) {
          console.error('Error parsing SSE start event data:', e);
        }
      });

      eventSource.addEventListener('token', (event) => {
        try {
          const data = JSON.parse(event.data);
          setStreamingOutput(prev => [...prev, data.message]);
        } catch (e) {
          console.error('Error parsing SSE token event data:', e);
        }
      });

      eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          setHtmlContent(data.html);
          setStreamingOutput(prev => [...prev, 'Generation complete! ✅']);
          eventSource.close();
          setIsGenerating(false);
          
          toast({
            title: "Generation Complete",
            description: "Your landing page has been generated",
          });
        } catch (e) {
          console.error('Error parsing SSE complete event data:', e);
        }
      });

      eventSource.addEventListener('error', (event) => {
        console.error('EventSource error:', event);
        setStreamingOutput(prev => [...prev, 'Error: Generation failed']);
        eventSource.close();
        setIsGenerating(false);
        
        toast({
          title: "Generation Failed",
          description: "The streaming connection encountered an error",
          variant: "destructive",
        });
      });
      
      // Wait for the connection to open
      eventSource.onopen = async () => {
        console.log('SSE connection established, sending generation request');
        
        try {
          // Now send the POST request with the same client ID to start generation
          const response = await fetch(`/api/sambanova/generate-stream?_=${clientId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt,
              apiConfig,
              clientId
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to start generation');
          }
          
        } catch (error) {
          console.error('Error sending POST data:', error);
          eventSource.close();
          setIsGenerating(false);
          
          toast({
            title: "Generation Failed",
            description: error instanceof Error ? error.message : "Failed to start generation",
            variant: "destructive",
          });
        }
      };

      // Clean up on component unmount
      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setStreamingOutput([...streamingOutput, "Error: Generation failed"]);
      setIsGenerating(false);
    }
  };

  // Handle refresh preview
  const handleRefreshPreview = () => {
    if (previewRef.current) {
      const current = previewRef.current;
      const content = current.srcdoc;
      current.srcdoc = '';
      setTimeout(() => {
        current.srcdoc = content;
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-white">
      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-[#1e1e1e]">
        <div className="flex items-center">
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVwD7JQXy8I9gkxZQYaD2hXgM1DEjcqsKJnTQkPBDrXA&s" 
            alt="DeepSite" 
            className="h-8 mr-2"
          />
          <h1 className="text-lg font-semibold">DeepSite</h1>
        </div>
        <div className="text-xs text-gray-400">Powered by <span className="text-blue-400">DeepSeek</span></div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={saveProject}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => setExportModalOpen(true)}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs bg-pink-500 hover:bg-pink-600 border-0"
          >
            Deploy DeepSite
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden editor-container">
        <div className="editor-panel w-1/2 h-full flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-[#1e1e1e]">
            <div className="text-sm font-medium">index.html</div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0" 
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {showSettings && (
            <div className="p-4 bg-[#252525] border-b border-gray-800">
              <h2 className="text-sm font-semibold mb-3">API Configuration</h2>
              <div className="space-y-2">
                <div className="text-xs text-gray-400">SambaNova API Key</div>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    className="flex-1 bg-[#333] border border-gray-700 rounded-sm p-1 text-sm"
                    placeholder="Enter your API key"
                    value={apiConfig.apiKey}
                    onChange={(e) => setApiConfig({
                      ...apiConfig,
                      apiKey: e.target.value
                    })}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs" 
                    onClick={async () => {
                      if (!apiConfig.apiKey) {
                        toast({
                          title: "API Key Required",
                          description: "Please enter an API key to validate",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      const isValid = await validateApiKey(apiConfig.apiKey);
                      
                      if (isValid) {
                        toast({
                          title: "API Key Valid",
                          description: "Your API key has been validated successfully",
                        });
                      } else {
                        toast({
                          title: "API Key Invalid",
                          description: "The API key could not be validated",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Validate
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="save-token"
                    checked={apiConfig.saveToken}
                    onChange={(e) => setApiConfig({
                      ...apiConfig,
                      saveToken: e.target.checked
                    })}
                  />
                  <label htmlFor="save-token" className="text-xs text-gray-400">
                    Remember API key (saved locally)
                  </label>
                </div>
              </div>
            </div>
          )}

          {!isGenerating ? (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b border-gray-800 bg-[#1e1e1e]">
                <textarea
                  className="w-full p-2 bg-[#252525] border border-gray-700 rounded text-sm"
                  placeholder="Describe your landing page and click 'Generate'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
                <Button 
                  className="w-full mt-2 bg-blue-500 hover:bg-blue-600" 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Landing Page
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto p-0 bg-[#1e1e1e]">
                <textarea
                  ref={editorRef}
                  className="w-full h-full p-2 bg-[#1e1e1e] text-gray-300 font-mono text-sm leading-tight focus:outline-none resize-none"
                  value={htmlContent}
                  onChange={handleHtmlChange}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-auto bg-[#1e1e1e] font-mono text-sm">
              <div className="text-green-400 mb-2">AI Running (DeepSeek-V3-0324)...</div>
              <div className="p-2 bg-[#252525] rounded">
                {streamingOutput.map((line, i) => (
                  <div key={i} className="mb-1 whitespace-pre-wrap">
                    {line.startsWith("Error") ? (
                      <span className="text-red-400">{line}</span>
                    ) : (
                      <span className="text-gray-300">{line}</span>
                    )}
                  </div>
                ))}
                {isGenerating && (
                  <div className="animate-pulse text-blue-400">▌</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div 
          ref={resizeRef}
          className="w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize flex-shrink-0"
        ></div>

        <div className="preview-panel w-1/2 h-full flex flex-col bg-white overflow-hidden">
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-100">
            <div className="text-sm font-medium text-gray-700">Preview</div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-gray-600" 
                onClick={handleRefreshPreview}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 text-gray-600" 
                onClick={() => setFullscreenPreview(!fullscreenPreview)}
              >
                {fullscreenPreview ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className={`flex-1 ${fullscreenPreview ? 'fixed inset-0 z-50 bg-white' : ''}`}>
            <iframe
              ref={previewRef}
              title="Preview"
              className="w-full h-full border-0"
              srcDoc={htmlContent}
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </div>

      <PageExport
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        projectId={projectId}
      />
    </div>
  );
}