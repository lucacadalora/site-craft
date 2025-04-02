import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ApiConfig } from "@shared/schema";
import { estimateTokenUsage, validateApiKey } from "@/lib/sambanova";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  RefreshCw, 
  Settings,
  Maximize,
  Minimize,
  ArrowLeft,
  Zap,
  CheckCircle,
  Save
} from "lucide-react";
import { Link } from "wouter";

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    header {
      background-color: #4361ee;
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    p {
      font-size: 1.2rem;
      max-width: 800px;
      margin: 0 auto 30px auto;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #fff;
      color: #4361ee;
      padding: 12px 30px;
      border-radius: 5px;
      text-decoration: none;
      font-weight: bold;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }
    
    section {
      padding: 80px 0;
    }
    
    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 60px;
      color: #333;
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .feature {
      background-color: #f8f9fa;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
    }
    
    .feature h3 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      color: #4361ee;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Hello world</h1>
      <p>Hello world</p>
      <a href="#" class="cta-button">Get Started</a>
    </div>
  </header>
  
  <section>
    <div class="container">
      <h2 class="section-title">Key Features</h2>
      <div class="features">
        <div class="feature">
          <h3>Feature 1</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 2</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
        <div class="feature">
          <h3>Feature 3</h3>
          <p>A description of this amazing feature and how it benefits the user.</p>
        </div>
      </div>
    </div>
  </section>
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
  const [prompt, setPrompt] = useState<string>("Hello world");
  const [htmlContent, setHtmlContent] = useState<string>(defaultHTML);
  const [projectId, setProjectId] = useState<number | null>(projectIdParam ? parseInt(projectIdParam) : null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [tokenUsage, setTokenUsage] = useState<number>(0);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [fullscreenPreview, setFullscreenPreview] = useState<boolean>(false);
  const [streamingOutput, setStreamingOutput] = useState<string[]>([]);
  
  // API config for AI Accelerate
  const [apiConfig, setApiConfig] = useState<ApiConfig>(initialApiConfig || {
    provider: "AI Accelerate LLM Inference Router",
    apiKey: "",
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
    if (previewRef.current && htmlContent) {
      // For mobile, use the robust refresh method
      if (isMobile && fullscreenPreview) {
        handleRefreshPreview();
      } else {
        // For desktop, immediate update is fine
        previewRef.current.srcdoc = htmlContent;
      }
    }
  }, [htmlContent, fullscreenPreview]);
  
  // Update preview when switching from generation back to editor mode
  useEffect(() => {
    if (!isGenerating && previewRef.current && htmlContent) {
      console.log("Generation completed, updating preview");
      
      // For mobile, give a slight delay to ensure proper rendering
      if (isMobile) {
        setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.srcdoc = htmlContent;
            // Auto-switch to preview on mobile when generation completes
            setFullscreenPreview(true);
          }
        }, 300);
      } else {
        previewRef.current.srcdoc = htmlContent;
      }
    }
  }, [isGenerating, htmlContent, isMobile]);
  
  // Special handling for when user switches to preview mode on mobile
  useEffect(() => {
    if (isMobile && fullscreenPreview && previewRef.current && htmlContent) {
      // Force refresh the preview when user switches to preview tab
      handleRefreshPreview();
    }
  }, [fullscreenPreview, isMobile]);

  // Handle HTML editor changes
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
  };

  // Handle generation with streaming output
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
        description: "Please provide an AI Accelerate API key in the settings",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setStreamingOutput(["Starting AI Accelerate LLM generation..."]);

    try {
      // For simpler implementation, make a POST request directly
      const response = await fetch('/api/sambanova/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, apiConfig }),
      });

      // Check if the response is ok
      if (!response.ok) {
        // Handle error
        let errorMessage = "Failed to generate content";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMessage);
      }
      
      // Parse the response as JSON
      const responseData = await response.json();
      console.log("API response:", responseData);

      // Simulate token-by-token streaming for UI feedback
      setStreamingOutput(prev => [...prev, "Analyzing prompt..."]);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add processing feedback
      const words = prompt.split(' ');
      for (let i = 0; i < Math.min(words.length, 6); i += 2) { // Reduced for faster feedback
        const chunk = words.slice(i, i + 2).join(' ');
        setStreamingOutput(prev => [...prev, `Processing: ${chunk}`]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Show generation status messages
      setStreamingOutput(prev => [...prev, "Generating HTML with AI Accelerate..."]);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (responseData.source === "api") {
        setStreamingOutput(prev => [...prev, "✅ Content successfully generated by AI Accelerate LLM!"]);
      } else if (responseData.source === "fallback") {
        setStreamingOutput(prev => [
          ...prev, 
          "⚠️ API error - using fallback template",
          `Error: ${responseData.error || "Unknown error"}`
        ]);
      }
      
      // Final step - apply the HTML from API response
      setStreamingOutput(prev => [...prev, "Generation complete! Building HTML..."]);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use the HTML from the response directly, no fallback templates
      if (responseData.html) {
        setHtmlContent(responseData.html);
        
        // Different handling for mobile vs desktop
        if (isMobile) {
          // For mobile, we'll update the preview container and switch to preview tab
          setTimeout(() => {
            setFullscreenPreview(true);
            
            // Force a refresh of the preview content
            setTimeout(() => {
              console.log("Updating mobile preview after generation");
              const container = document.getElementById('mobile-preview-container');
              if (container) {
                container.innerHTML = responseData.html;
              }
            }, 300);
          }, 500);
        } else if (previewRef.current) {
          // For desktop, update the iframe directly
          setTimeout(() => {
            if (previewRef.current) {
              previewRef.current.srcdoc = responseData.html;
            }
          }, 100);
        }
      } else {
        setStreamingOutput(prev => [...prev, "Error: No HTML content received from API"]);
        throw new Error("No HTML content received from API");
      }
      setStreamingOutput(prev => [...prev, 'Generation complete! ✅']);
      setIsGenerating(false);
      
      toast({
        title: "Generation Complete",
        description: "Your landing page has been generated",
      });
    } catch (error) {
      console.error('Error setting up generation:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setStreamingOutput(prev => [...prev, "Error: Generation failed"]);
      setIsGenerating(false);
    }
  };

  // Handle refresh preview with improved mobile support
  const handleRefreshPreview = () => {
    // Set a loading indicator
    toast({
      title: "Refreshing Preview",
      description: "Reloading the preview content...",
    });
    
    // Always use the latest HTML content
    const contentToUse = htmlContent;
    console.log("Refreshing preview with content length:", contentToUse.length);
    
    // For mobile, we use direct DOM injection
    if (isMobile) {
      // Force the React component to re-render by toggling fullscreen state
      setFullscreenPreview(false);
      setTimeout(() => {
        setFullscreenPreview(true);
        
        // Find the mobile preview container and update it directly
        setTimeout(() => {
          const container = document.getElementById('mobile-preview-container');
          if (container) {
            console.log("Updating mobile preview container");
            container.innerHTML = contentToUse;
          } else {
            console.log("Mobile preview container not found");
          }
        }, 100);
      }, 50);
    } else if (previewRef.current) {
      // Desktop approach using iframe
      const current = previewRef.current;
      current.srcdoc = contentToUse;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#111827] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0f172a]">
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white px-1 md:px-3"
            >
              <ArrowLeft className="h-4 w-4 md:mr-1" />
              <span className={`${isMobile ? 'hidden' : 'inline'} text-sm`}>Back</span>
            </Button>
          </Link>
          <div className={`${isMobile ? 'hidden' : 'inline-block'} h-5 border-r border-gray-700 mx-1`}></div>
          <h1 className="text-base md:text-lg font-semibold text-blue-400">Site<span className="text-white">Craft</span> 
            <span className={`${isMobile ? 'hidden' : 'inline'} text-xs text-gray-400 ml-2`}>Editor</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white px-2 md:px-3" 
          >
            <Save className="h-4 w-4 md:mr-1" />
            <span className={`${isMobile ? 'hidden' : 'inline'} text-sm`}>Save</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white px-2 md:px-3" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 md:mr-1" />
            <span className={`${isMobile ? 'hidden' : 'inline'} text-sm`}>Settings</span>
          </Button>
        </div>
      </div>

      {/* API Settings Panel */}
      {showSettings && (
        <div className={`${isMobile ? 'p-3' : 'p-5'} bg-[#1e293b] border-b border-gray-700`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-blue-400 mr-2" />
              <h2 className="text-base font-semibold">API Configuration</h2>
            </div>
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white" 
                onClick={() => setShowSettings(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className={`bg-[#0f172a] ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-gray-700`}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-white mb-1">AI Accelerate API Key</label>
              <div className={`mb-1 text-xs text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Enter your LLM Inference Router API key to enable AI generation
              </div>
              <div className={`${isMobile ? 'flex-col space-y-2' : 'flex space-x-2'} mt-2`}>
                <input
                  type="password"
                  className="flex-1 w-full bg-[#1e293b] border border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`${isMobile ? 'w-full' : ''} bg-blue-600 hover:bg-blue-700 text-white border-blue-700`} 
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
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Validate API Key
                </Button>
              </div>
            </div>
            
            <div className="flex items-center mt-4 bg-[#1e293b] p-3 rounded-md border border-gray-700">
              <input
                type="checkbox"
                id="save-token"
                className="h-4 w-4 rounded border-gray-500 focus:ring-blue-500 text-blue-600"
                checked={apiConfig.saveToken}
                onChange={(e) => setApiConfig({
                  ...apiConfig,
                  saveToken: e.target.checked
                })}
              />
              <label htmlFor="save-token" className="ml-2 text-xs md:text-sm text-gray-300">
                {isMobile ? 'Remember API key locally' : 'Remember API key in local storage (not recommended for shared devices)'}
              </label>
            </div>
          </div>
          
          {isMobile && (
            <Button 
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowSettings(false)}
            >
              Done
            </Button>
          )}
        </div>
      )}

      {/* Mobile Mode Tabs - Only shown on mobile */}
      {isMobile && (
        <div className="bg-[#1e293b] px-4 py-2 border-b border-gray-700">
          <div className="flex flex-col space-y-1">
            <div className="flex space-x-2">
              <Button 
                variant={!fullscreenPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setFullscreenPreview(false)}
                className={!fullscreenPreview ? "bg-blue-600 text-white" : "text-gray-300"}
              >
                Editor
              </Button>
              <Button 
                variant={fullscreenPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setFullscreenPreview(true)}
                className={fullscreenPreview ? "bg-blue-600 text-white" : "text-gray-300"}
              >
                Preview
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleRefreshPreview}
                className="text-blue-400 ml-auto"
                title="Refresh Preview"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isMobile ? 'flex flex-col' : 'flex'} flex-1 overflow-hidden editor-container`}>
        {/* Editor Panel - Visibility controlled by tabs on mobile */}
        <div 
          className={`editor-panel ${isMobile ? (fullscreenPreview ? 'hidden' : 'w-full h-full') : 'w-1/2 h-full'} flex flex-col overflow-hidden bg-[#0f172a]`}
        >
          {!isGenerating ? (
            <div className="flex-1 flex flex-col p-4">
              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-1">Describe your landing page</label>
                <div className="rounded-md overflow-hidden border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <textarea
                    className="w-full p-3 bg-[#1e293b] text-white border-0 text-sm focus:outline-none"
                    placeholder="Describe the landing page you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={isMobile ? 3 : 4}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                  <div>Estimated tokens: {tokenUsage}</div>
                  <div className={`${isMobile ? 'hidden' : 'block'}`}>Powered by AI Accelerate</div>
                </div>
              </div>
              
              {/* Generate Button */}
              <Button 
                className="w-full mb-4 py-3 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 transform hover:translate-y-[-1px]" 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isMobile ? 'Generating...' : 'Generating your landing page...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Landing Page
                  </>
                )}
              </Button>
              
              {/* HTML Editor */}
              <div className="flex-1 overflow-hidden bg-[#111827] rounded-md border border-gray-700">
                <div className="flex items-center justify-between bg-[#1e293b] px-3 py-2 border-b border-gray-700">
                  <div className="text-xs font-medium text-gray-300">HTML + CSS</div>
                  <div className="flex space-x-1">
                    <div className="px-1.5 py-0.5 bg-blue-500 rounded-md text-xs text-white">HTML</div>
                    <div className="px-1.5 py-0.5 bg-pink-500 rounded-md text-xs text-white">CSS</div>
                  </div>
                </div>
                <textarea
                  ref={editorRef}
                  className="w-full h-[calc(100%-32px)] p-3 bg-[#111827] text-gray-300 font-mono text-sm leading-tight focus:outline-none resize-none"
                  value={htmlContent}
                  onChange={handleHtmlChange}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            /* Generation Output Area */
            <div className="flex-1 p-6 overflow-auto bg-[#111827]">
              <div className="flex items-center mb-4">
                <RefreshCw className="h-5 w-5 text-blue-400 mr-2 animate-spin" />
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-white`}>Generating with AI Accelerate</h3>
              </div>
              
              <div className="p-4 bg-[#0f172a] rounded-lg border border-gray-700 font-mono text-sm">
                <div className="space-y-1">
                  {streamingOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap text-xs md:text-sm">
                      {line.startsWith("Error") ? (
                        <span className="text-red-400">{line}</span>
                      ) : line.includes("✅") ? (
                        <span className="text-green-400">{line}</span>
                      ) : line.includes("⚠️") ? (
                        <span className="text-yellow-400">{line}</span>
                      ) : (
                        <span className="text-gray-300">{line}</span>
                      )}
                    </div>
                  ))}
                </div>
                {isGenerating && (
                  <div className="mt-2 animate-pulse text-blue-400">▌</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resizer - Only shown on desktop */}
        {!isMobile && (
          <div 
            ref={resizeRef}
            className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0"
          ></div>
        )}

        {/* Preview Panel - Visibility controlled by tabs on mobile */}
        <div 
          className={`preview-panel ${isMobile ? (fullscreenPreview ? 'w-full h-full' : 'hidden') : 'w-1/2 h-full'} flex flex-col bg-white overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-center">
              <div className="flex space-x-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-sm font-medium text-gray-800">
                Preview <span className={`${isMobile ? 'hidden' : 'inline'} text-gray-500 text-xs`}>- Generated Landing Page</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isMobile && (
                <div className="flex items-center h-8 px-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-md">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></div>
                  <span>Live Preview</span>
                </div>
              )}
              
              {/* Refresh Button - Added for mobile devices */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-1.5 text-xs border-gray-300 text-gray-700" 
                onClick={handleRefreshPreview}
                title="Refresh Preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 ${isMobile ? 'px-1.5' : 'px-2'} text-xs border-gray-300 text-gray-700`} 
                onClick={() => setFullscreenPreview(!fullscreenPreview)}
              >
                {fullscreenPreview ? (
                  <>
                    <Minimize className="h-3.5 w-3.5 mr-1" />
                    {!isMobile && <span>Exit Fullscreen</span>}
                  </>
                ) : (
                  <>
                    <Maximize className="h-3.5 w-3.5 mr-1" />
                    {!isMobile && <span>Fullscreen</span>}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Preview Iframe */}
          <div className={`flex-1 ${fullscreenPreview && !isMobile ? 'fixed inset-0 z-50 bg-white pt-10' : ''}`}>
            {fullscreenPreview && !isMobile && (
              <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 p-2 flex justify-between items-center">
                <div className="text-sm font-medium text-gray-800">
                  Fullscreen Preview
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-xs" 
                  onClick={() => setFullscreenPreview(false)}
                >
                  <Minimize className="h-3.5 w-3.5 mr-1" />
                  Exit
                </Button>
              </div>
            )}
            
            {/* Mobile preview toolbar */}
            {isMobile && fullscreenPreview && (
              <div className="bg-gray-100 border-b border-gray-200 p-2 flex justify-between items-center">
                <div className="text-sm font-medium text-gray-800">
                  Preview
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs text-blue-500" 
                  onClick={handleRefreshPreview}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            )}
            <div className="w-full h-full relative">
              {isMobile && !htmlContent && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">Generate a landing page to see the preview</p>
                    {fullscreenPreview && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFullscreenPreview(false)}
                        className="text-xs"
                      >
                        Switch to Editor
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {/* For mobile, we'll use a different approach since iframe srcdoc might have issues */}
              {isMobile ? (
                <div 
                  className="w-full h-full overflow-auto bg-white"
                  style={{ 
                    position: 'relative',
                    overflowX: 'hidden'
                  }}
                >
                  {/* Create a container to hold the HTML content directly */}
                  <div
                    id="mobile-preview-container"
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              ) : (
                <iframe
                  ref={previewRef}
                  title="Preview"
                  className="w-full h-full border-0"
                  srcDoc={htmlContent}
                  sandbox="allow-scripts" 
                  style={{ backgroundColor: "white" }}
                  onLoad={() => {
                    console.log("Preview iframe loaded", htmlContent.length > 0 ? "with content" : "empty");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}