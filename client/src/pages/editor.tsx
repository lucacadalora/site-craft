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
  
  // API config for SambaNova
  const [apiConfig, setApiConfig] = useState<ApiConfig>(initialApiConfig || {
    provider: "SambaNova (DeepSeek-V3-0324)",
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
    if (previewRef.current) {
      previewRef.current.srcdoc = htmlContent;
    }
  }, [htmlContent]);

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
        description: "Please provide a SambaNova API key in the settings",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    setIsGenerating(true);
    setStreamingOutput(["Starting DeepSeek-V3 generator..."]);

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
      setStreamingOutput(prev => [...prev, "Generating HTML with SambaNova API..."]);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (responseData.source === "api") {
        setStreamingOutput(prev => [...prev, "✅ Content successfully generated by SambaNova API!"]);
      } else if (responseData.source === "fallback") {
        setStreamingOutput(prev => [
          ...prev, 
          "⚠️ SambaNova API error - using fallback template",
          `Error: ${responseData.error || "Unknown error"}`
        ]);
      }
      
      // Final step - apply the HTML from API response
      setStreamingOutput(prev => [...prev, "Generation complete! Building HTML..."]);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use the HTML from the response directly, no fallback templates
      if (responseData.html) {
        setHtmlContent(responseData.html);
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
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-black">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold">index.html</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* API Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-[#111] border-b border-gray-800">
          <h2 className="text-sm font-semibold mb-3">API Configuration</h2>
          <div className="space-y-2">
            <div className="text-xs text-gray-400">SambaNova API Key</div>
            <div className="flex space-x-2">
              <input
                type="password"
                className="flex-1 bg-[#222] border border-gray-700 rounded-sm p-1 text-sm"
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden editor-container">
        {/* Editor Panel */}
        <div className="editor-panel w-1/2 h-full flex flex-col overflow-hidden">
          {!isGenerating ? (
            <div className="flex-1 flex flex-col">
              {/* Prompt Input */}
              <textarea
                className="w-full p-2 mb-2 bg-black border border-gray-800 rounded text-sm"
                placeholder="Hello world"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              
              {/* Generate Button */}
              <Button 
                className="w-full mb-4 py-2 bg-blue-600 hover:bg-blue-700" 
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
                    Generate Landing Page
                  </>
                )}
              </Button>
              
              {/* HTML Editor */}
              <div className="flex-1 overflow-auto p-0 bg-black">
                <textarea
                  ref={editorRef}
                  className="w-full h-full p-2 bg-black text-gray-300 font-mono text-sm leading-tight focus:outline-none resize-none"
                  value={htmlContent}
                  onChange={handleHtmlChange}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            /* Generation Output Area */
            <div className="flex-1 p-4 overflow-auto bg-black font-mono text-sm">
              <div className="text-green-400 mb-2">AI Running (SambaNova API)...</div>
              <div className="p-2 bg-[#111] rounded">
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

        {/* Resizer */}
        <div 
          ref={resizeRef}
          className="w-1 bg-gray-800 hover:bg-blue-600 cursor-col-resize flex-shrink-0"
        ></div>

        {/* Preview Panel */}
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
          
          {/* Preview Iframe */}
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
    </div>
  );
}