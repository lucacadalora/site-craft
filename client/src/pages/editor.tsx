import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useToast, toast as showToast } from "@/hooks/use-toast";
import { CodeEditor } from "@/components/ui/code-editor-enhanced";
import { Button } from "@/components/ui/button";
import { ApiConfig } from "@shared/schema";
import { estimateTokenUsage, validateApiKey } from "@/lib/sambanova";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { GenerationStatus } from "@/components/ui/generation-status";
import { UserProfile } from "@/components/user-profile";
import { useAuth } from "@/contexts/auth-context";

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    expectedContentLength?: number;
    inTypingPhase?: boolean;
    generationStartTime?: number;
    totalTokenCount?: number;
    displayPerformanceMetrics?: boolean;
  }
}
import { 
  RefreshCw, 
  Settings,
  Maximize,
  Minimize,
  ArrowLeft,
  Zap,
  CheckCircle,
  Save,
  Edit,
  Eye,
  PlusCircle
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
<html>
  <head>
    <title>My app</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta charset="utf-8">
    <style>
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        height: 100dvh;
        font-family: "Arial", sans-serif;
        text-align: center;
      }
      .arrow {
        position: absolute;
        bottom: 32px;
        left: 0px;
        width: 100px;
        transform: rotate(30deg);
      }
      h1 {
        font-size: 50px;
      }
      h1 span {
        color: #acacac;
        font-size: 32px;
      }
      @media screen and (max-width: 640px) {
        .arrow {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <h1>
      <span>I'm ready to work,</span><br />
      Ask me anything.
    </h1>
    <script></script>
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
  // Settings panel removed - using fixed API key
  // Using tab-based navigation for mobile instead of fullscreen
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>(isMobile ? 'editor' : 'preview');
  const [streamingOutput, setStreamingOutput] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Add ref for editor wrapper to avoid repeated DOM queries
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  // Reference to the current stream controller for stop functionality
  const streamControllerRef = useRef<AbortController | null>(null);
  
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
          // Apply a fixed height to the editor container to ensure scrolling works
          if (!container.style.height) {
            container.style.height = '600px';
          }
          
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
      if (isMobile && activeTab === 'preview') {
        handleRefreshPreview();
      } else {
        // For desktop, immediate update is fine
        previewRef.current.srcdoc = htmlContent;
      }
    }
  }, [htmlContent, activeTab, isMobile]);
  
  // Handle ESC key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Update preview when new HTML content is available or generation completes
  useEffect(() => {
    // Only update preview if we have content
    if (htmlContent) {
      console.log("Generation completed or new content available, updating preview");
      
      // For mobile, handle preview update differently
      if (isMobile) {
        // Only auto-switch to preview on mobile when generation fully completes
        if (!isGenerating) {
          setTimeout(() => {
            setActiveTab('preview');
            
            // Force a refresh of the mobile preview container
            const container = document.getElementById('mobile-preview-container');
            if (container) {
              container.innerHTML = htmlContent;
            }
          }, 300);
        }
      } 
      // For desktop, update iframe in real-time regardless of generation state
      else if (previewRef.current) {
        previewRef.current.srcdoc = htmlContent;
      }
    }
  }, [htmlContent, isGenerating, isMobile, setActiveTab]);
  
  // Special handling for when user switches to preview mode on mobile
  useEffect(() => {
    if (isMobile && activeTab === 'preview' && htmlContent) {
      // Force refresh the preview when user switches to preview tab
      handleRefreshPreview();
    }
  }, [activeTab, isMobile, htmlContent]);

  // Handle HTML editor changes
  const handleHtmlChange = (newCode: string) => {
    setHtmlContent(newCode);
  };
  
  // Handle stopping generation
  const handleStopGeneration = () => {
    // Check if we have an active AbortController
    if (streamControllerRef.current) {
      console.log("Stopping generation...");
      
      // Abort the fetch request
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
      
      // Update the status message
      setStreamingOutput(prev => [...prev, "⏹️ Generation stopped by user"]);
      
      // Set a timeout to clean up the UI
      setTimeout(() => {
        // Mark generation as complete so we can hide the progress bar
        setIsGenerating(false);
        
        // Record partial token usage - estimate tokens based on current HTML length
        if (htmlContent.length > 0) {
          const estimatedTokens = Math.round(htmlContent.length / 4);
          console.log(`Recording partial token usage after stopping: ~${estimatedTokens} tokens`);
          
          // This will trigger token usage recording through the custom event listener
          const tokenEvent = new CustomEvent('token-count-detected', { 
            detail: { tokenCount: estimatedTokens }
          });
          window.dispatchEvent(tokenEvent);
        }
        
        // Notify user that generation was stopped early
        toast({
          title: "Generation Stopped",
          description: "Landing page generation was stopped. You can edit the partially generated content or generate a new page.",
          variant: "default",
        });
      }, 1000);
    }
  };

  // Handle generation with typewriter streaming effect
  const handleGenerate = async () => {
    // Store interval reference outside try/catch scope for cleanup
    let progressInterval: NodeJS.Timeout | undefined;
    if (!prompt) {
      toast({
        title: "Missing Information",
        description: "Please describe what you want to generate",
        variant: "destructive",
      });
      return;
    }

    // If no API key is provided, use the default one from environment
    if (!apiConfig.apiKey) {
      // Set the default API key from App.tsx (9f5d2696-9a9f-43a6-9778-ebe727cd2968)
      setApiConfig({
        ...apiConfig,
        apiKey: "9f5d2696-9a9f-43a6-9778-ebe727cd2968"
      });
    }

    // Mark that we're generating content - this controls showing the status component
    setIsGenerating(true);
    
    // This will track whether we're in the typing phase (after API response received)
    // We will use this to control visibility of status during typing
    window.inTypingPhase = false;
    
    // Record the start time for performance metrics
    window.generationStartTime = Date.now();
    // We'll use this to store total tokens for performance calculation
    window.totalTokenCount = 0;
    // Enable performance metrics display in the UI
    window.displayPerformanceMetrics = true;
    
    // Track total estimated generation time to adjust progress accordingly
    const estimatedGenerationTime = 15000; // 15 seconds base generation time estimate
    
    // Initial expected content length (will be adjusted later based on actual content)
    window.expectedContentLength = 5000; // Initial guess, will be refined
    
    // Reset messages and show initial status
    setStreamingOutput(["Starting AI Accelerate LLM generation..."]);
    
    // Clear any existing HTML content and prepare for streaming visualization
    setHtmlContent("");

    try {
      // Set up SSE (Server-Sent Events) for real-time streaming
      // This provides a direct streaming connection to the server
      
      // Update the user with initial feedback in sequence
      setTimeout(() => {
        setStreamingOutput(prev => [...prev, "Analyzing prompt..."]);
        
        // Show only one processing message with the main prompt topic
        const mainKeywords = prompt.split(' ').slice(0, 3).join(' ');
        if (mainKeywords.length > 0) {
          setStreamingOutput(prev => [...prev, `Processing: ${mainKeywords}`]);
        }
        
        setTimeout(() => {
          setStreamingOutput(prev => [...prev, "Generating HTML with AI Accelerate..."]);
        }, 1500);
      }, 1000);
      
      // Initialize HTML content
      let collectedHtml = "";
      let isHtmlStarted = false;
      
      // Helper to add blinking cursor at current position
      const addCursorToText = (text: string, position: number) => {
        return text.substring(0, position) + 
               '█' + 
               text.substring(position);
      };
      
      // Setup for scrolling
      let lastScrollPosition = 0;
      let lastScrollTime = Date.now();
      let lineHeight = 20; // Default fallback
      let editorHeight = 600; // Default fallback
      let visibleLines = 30; // Default fallback
      
      // Initialize measurements once before starting animation
      if (editorWrapperRef.current) {
        const computedStyles = window.getComputedStyle(editorWrapperRef.current);
        lineHeight = parseFloat(computedStyles.lineHeight) || lineHeight;
        editorHeight = editorWrapperRef.current.clientHeight;
        visibleLines = Math.floor(editorHeight / lineHeight);
        console.log("Initial measurements - lineHeight:", lineHeight, "editorHeight:", editorHeight, "visibleLines:", visibleLines);
      }
      
      // Create fetch request to streaming endpoint
      // Get the base URL for API calls (will work on both custom domain and Replit domain)
      const baseUrl = window.location.origin;
      console.log("Using base URL for streaming API:", baseUrl);
      
      // Create an AbortController to allow stopping the stream
      const controller = new AbortController();
      // Save reference to allow stopping from stop button
      streamControllerRef.current = controller;
      
      const response = await fetch(`${baseUrl}/api/sambanova/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt, 
          apiConfig: {
            ...apiConfig,
            apiKey: apiConfig?.apiKey || "9f5d2696-9a9f-43a6-9778-ebe727cd2968"
          }
        }),
        signal: controller.signal, // Add the abort signal to the fetch request
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Create a reader from the response body stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }
      
      // Setup a TextDecoder to convert the stream chunks to text
      const decoder = new TextDecoder();
      
      // Status variables 
      let done = false;
      let isCompleted = false;
      let totalContent = "";
      
      // Create a more natural progress update based on both time and content
      // This creates a gradual increase that better reflects real API response times
      let lastProgressPercent = 0;
      let startTime = Date.now();
      let lastUpdateTime = startTime;
      let progressIncrement = 0;
      
      // Track when content generation is mostly complete
      let contentNearlyComplete = false;
      let contentCompleteTime: number | null = null;
      
      progressInterval = setInterval(() => {
        if (isCompleted) {
          // When completed, ensure progress shows 100%
          if (lastProgressPercent < 100) {
            lastProgressPercent = 100;
            // Update status with 100% completion message
            setStreamingOutput(prev => {
              // Replace last line if it has percentage
              const lastLine = prev[prev.length - 1];
              if (lastLine && lastLine.includes("Building HTML")) {
                return [
                  ...prev.slice(0, -1), 
                  `Building HTML... 100% complete`
                ];
              }
              return prev;
            });
          }
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = undefined;
          }
          return;
        }
        
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        const timeSinceLastUpdate = (currentTime - lastUpdateTime) / 1000;
        
        // Detect when content generation slows down significantly
        // This indicates we're nearing completion
        if (!contentNearlyComplete && collectedHtml.length > 1000) {
          // Check if content growth has slowed down
          if (elapsedSeconds > 7 && collectedHtml.length > 5000) {
            contentNearlyComplete = true;
            contentCompleteTime = currentTime;
            console.log("Content generation nearly complete, slowing down progress updates");
          }
        }
        
        // Calculate time-based progress component 
        // This ensures progress increases gradually even without content
        let timeProgress;
        
        if (contentNearlyComplete) {
          // When content generation slows, accelerate progress to 90-95%
          const timeInCompletePhase = (currentTime - (contentCompleteTime || currentTime)) / 1000;
          timeProgress = Math.min(70 + Math.floor(timeInCompletePhase * 5), 90);
        } else {
          // Normal time-based progress during active generation
          timeProgress = Math.min(Math.floor((elapsedSeconds / 15) * 70), 70);
        }
        
        // Calculate content-based progress component
        const contentProgress = window.expectedContentLength && collectedHtml.length > 0
          ? Math.min(Math.floor((collectedHtml.length / window.expectedContentLength) * 30), 25)
          : Math.min(Math.floor(elapsedSeconds * 2), 25);
        
        // Combined progress (max 96% until complete)
        const combinedPercent = Math.min(timeProgress + contentProgress, 96);
        
        // Add small random fluctuations to make progress look more natural
        // But only if enough time has passed since the last update
        if (timeSinceLastUpdate > 1) {
          progressIncrement = Math.random() > 0.5 ? 1 : 0;
          lastUpdateTime = currentTime;
        }
        
        // Final percent with the small random fluctuation
        const percent = Math.min(combinedPercent + progressIncrement, 96);
        
        // Only update if we have a meaningful change in percentage
        if (Math.abs(percent - lastProgressPercent) >= 3 || (isCompleted && lastProgressPercent < 100)) {
          lastProgressPercent = percent;
          setStreamingOutput(prev => {
            // Replace last line if it has percentage, otherwise don't add a percentage yet
            const lastLine = prev[prev.length - 1];
            if (lastLine && lastLine.includes("Building HTML")) {
              return [
                ...prev.slice(0, -1), 
                `Building HTML... ${percent}% complete`
              ];
            }
            // Don't add a new line here, we'll add it when content generation is confirmed
            return prev;
          });
        }
      }, 600);
      
      // Main loop to process stream data
      while (!done) {
        try {
          // Read the next chunk from the stream
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (done) {
            // Stream is complete
            break;
          }
          
          // Decode the chunk data
          const chunkText = decoder.decode(value, { stream: true });
          
          // Process each event (lines starting with "data: ")
          const eventLines = chunkText.split("\n\n");
          for (const eventLine of eventLines) {
            if (!eventLine.trim().startsWith("data:")) continue;
            
            try {
              // Parse the event data
              const jsonStr = eventLine.trim().substring(5).trim();
              const event = JSON.parse(jsonStr);
              
              // Handle different event types
              switch (event.event) {
                case 'start':
                  console.log("Stream started:", event.message);
                  // Don't add duplicate stream started message
                  window.inTypingPhase = true;
                  break;
                  
                case 'chunk':
                  // We received a content chunk, add it to our HTML
                  const contentChunk = event.content;
                  
                  if (event.isHtml && !isHtmlStarted) {
                    isHtmlStarted = true;
                    
                    // Instead of immediately showing success, wait for some content first
                    // This creates a more realistic progress experience 
                    if (collectedHtml.length > 200) {
                      setStreamingOutput(prev => [...prev, `✅ Content successfully generated by AI Accelerate LLM!`]);
                      
                      // Calculate a more realistic progress (never 100% until complete)
                      // This makes the progress bar more meaningful
                      const generationTime = (Date.now() - (window.generationStartTime || Date.now())) / 1000;
                      const elapsedPercent = Math.min(Math.floor((generationTime / 15) * 100), 60);
                      
                      // Use a combination of time and content metrics for a smoother experience
                      // This ensures progress doesn't jump to 100% immediately
                      const percent = Math.min(
                        Math.floor((collectedHtml.length / (window.expectedContentLength || 5000)) * 40) + elapsedPercent, 
                        95
                      );
                      
                      setStreamingOutput(prev => [...prev, `Building HTML... ${percent}% complete`]);
                    }
                  }
                  
                  // Add the chunk to our collected HTML
                  collectedHtml += contentChunk;
                  totalContent += contentChunk;
                  
                  // Update token count during streaming (rough estimate: 4 chars ≈ 1 token)
                  const currentTokenCount = Math.round(collectedHtml.length / 4);
                  window.totalTokenCount = currentTokenCount;
                  
                  // Make sure generation start time is recorded for metrics 
                  if (!window.generationStartTime) {
                    window.generationStartTime = Date.now();
                  }
                  
                  // Update editor content with cursor effect
                  const contentToShow = addCursorToText(collectedHtml, collectedHtml.length);
                  setHtmlContent(contentToShow);
                  
                  // Real-time preview update
                  if (previewRef.current) {
                    previewRef.current.srcdoc = collectedHtml;
                  }
                  
                  // Estimate total content length for progress bar
                  if (!window.expectedContentLength && totalContent.length > 100) {
                    // Rough estimate based on typical response size
                    window.expectedContentLength = Math.round(totalContent.length * 1.8);
                  }
                  
                  // Handle scroll following for the editor
                  const now = Date.now();
                  const scrollThrottleTime = 50; // ms between scroll updates
                  
                  if (now - lastScrollTime >= scrollThrottleTime && editorWrapperRef.current) {
                    lastScrollTime = now;
                    
                    // Calculate position metrics
                    const lineCount = (collectedHtml.match(/\n/g) || []).length;
                    const totalLines = lineCount + 20; // Estimate more lines to come
                    const isNearEnd = false; // Never assume we're near the end during streaming
                    
                    // Calculate target position - keep cursor in middle of viewable area
                    const targetLine = Math.max(0, lineCount - Math.floor(visibleLines * 0.6));
                    let scrollTarget = targetLine * lineHeight;
                    
                    // Don't scroll until we have enough content
                    if (lineCount < visibleLines * 0.5) {
                      scrollTarget = 0;
                    }
                    
                    // Avoid tiny scrolls
                    if (Math.abs(scrollTarget - lastScrollPosition) < lineHeight * 2) {
                      scrollTarget = lastScrollPosition;
                    } else {
                      lastScrollPosition = scrollTarget;
                      smoothScrollTo(editorWrapperRef.current, scrollTarget, 100);
                    }
                  }
                  break;
                  
                case 'error':
                  console.error("Stream error:", event.message);
                  setStreamingOutput(prev => [...prev, `⚠️ Error: ${event.message}`]);
                  break;
                  
                case 'token-usage-updated':
                  console.log("Token usage updated:", event);
                  // Dispatch a custom event for components listening for token usage updates
                  const tokenUpdateEvent = new CustomEvent('token-usage-updated', { 
                    detail: {
                      tokenUsage: event.tokenUsage,
                      generationCount: event.generationCount
                    }
                  });
                  document.dispatchEvent(tokenUpdateEvent);
                  break;
                  
                case 'complete':
                  console.log("Stream complete", event);
                  isCompleted = true;
                  
                  // Record token usage if available in the complete event
                  if (event.tokenCount && (window as any).recordTokenUsage) {
                    console.log(`Recording token usage from complete event: ${event.tokenCount} tokens`);
                    (window as any).recordTokenUsage(event.tokenCount);
                  }
                  
                  // Store stats for UI reference
                  if (event.stats) {
                    window.totalTokenCount = event.stats.tokens;
                    console.log(`Complete event includes ${event.stats.tokens} tokens`);
                    
                    // Set the token count in a global property for other components to access
                    (window as any).lastGenerationTokens = event.stats.tokens;
                    
                    // Dispatch a custom event for token usage
                    const tokenEvent = new CustomEvent('token-count-detected', { 
                      detail: { tokenCount: event.stats.tokens }
                    });
                    window.dispatchEvent(tokenEvent);
                  }
                  
                  // If we got HTML in the completion event, use it
                  if (event.html) {
                    // Final HTML content from the API
                    collectedHtml = event.html;
                    
                    // Set without cursor
                    setHtmlContent(collectedHtml);
                    
                    // Update expected length for final progress calculation
                    window.expectedContentLength = collectedHtml.length;
                    
                    // Update status with performance metrics
                    // Calculate token count - rough estimate based on 4 chars per token
                    const tokenCount = Math.round(collectedHtml.length / 4);
                    window.totalTokenCount = tokenCount;
                    
                    // Calculate generation time in seconds
                    const endTime = Date.now();
                    const generationTime = (endTime - (window.generationStartTime || endTime)) / 1000;
                    
                    // Calculate tokens per second
                    const tokensPerSecond = tokenCount / Math.max(generationTime, 0.1); // Avoid division by zero
                    
                    // Make metrics persistent for display in UI
                    // These will be shown in the editor header
                    window.totalTokenCount = tokenCount;
                    window.generationStartTime = (window.generationStartTime || endTime);
                    window.displayPerformanceMetrics = true; // Enable display of performance metrics
                    
                    // Force the interval to update first with 100%
                    lastProgressPercent = 100;
                    setStreamingOutput(prev => {
                      // First update completion percentage to 100%
                      const lastLine = prev[prev.length - 1];
                      if (lastLine && lastLine.includes("Building HTML")) {
                        return [
                          ...prev.slice(0, -1), 
                          `Building HTML... 100% complete`
                        ];
                      }
                      return prev;
                    });
                    
                    // Small delay to ensure the progress update is visible first
                    setTimeout(() => {
                      if (event.source === "api") {
                        // First mark as complete with 100% in the Building HTML line
                        setStreamingOutput(prev => {
                          const newOutput = [...prev];
                          // Find and replace any existing Building HTML line with 100% complete
                          const buildingLineIndex = newOutput.findIndex(line => line.includes("Building HTML"));
                          if (buildingLineIndex >= 0) {
                            newOutput[buildingLineIndex] = "Building HTML... 100% complete";
                          }
                          return newOutput;
                        });
                        
                        // Add a clear, prominent completion message (with extra spacing for visibility)
                        setStreamingOutput(prev => [...prev, ""]);  // Empty line for spacing
                        setStreamingOutput(prev => [...prev, "✅ Content successfully generated by AI Accelerate LLM Inference!"]);
                        
                        // Add detailed performance metrics in a separate message
                        setStreamingOutput(prev => [...prev, 
                          `🚀 ${tokensPerSecond.toFixed(2)} t/s | ⏱️ ${generationTime.toFixed(2)}s total | ${tokenCount} tokens`
                        ]);
                        
                        // Update progress to 100% on completion
                        window.expectedContentLength = collectedHtml.length;
                      } else if (event.source === "fallback") {
                        setStreamingOutput(prev => [
                          ...prev,
                          "⚠️ API error - using fallback template"
                        ]);
                      }
                    }, 300);
                  }
                  
                  // Final update for preview
                  if (previewRef.current) {
                    previewRef.current.srcdoc = collectedHtml;
                  }
                  
                  // Final scroll to see the end result
                  setTimeout(() => {
                    if (editorWrapperRef.current) {
                      // Force scrollbar to be visible
                      editorWrapperRef.current.style.overflowY = 'scroll';
                      
                      // Scroll to a position just above the bottom
                      const scrollableHeight = editorWrapperRef.current.scrollHeight - editorWrapperRef.current.clientHeight;
                      editorWrapperRef.current.scrollTop = Math.max(0, scrollableHeight - 100);
                      
                      // Focus the editor
                      const textarea = editorWrapperRef.current.querySelector('textarea');
                      if (textarea) {
                        textarea.focus();
                      }
                    }
                    
                    // Mobile preview handling
                    if (isMobile) {
                      setTimeout(() => {
                        setActiveTab('preview');
                        
                        setTimeout(() => {
                          const container = document.getElementById('mobile-preview-container');
                          if (container) {
                            container.innerHTML = collectedHtml;
                          }
                        }, 300);
                      }, 500);
                    }
                  }, 500);
                  break;
                  
                default:
                  console.log("Unknown stream event type:", event);
              }
            } catch (e) {
              console.error("Error parsing event:", e, eventLine);
            }
          }
        } catch (e) {
          console.error("Stream reading error:", e);
          setStreamingOutput(prev => [...prev, `⚠️ Error reading stream: ${e instanceof Error ? e.message : "Unknown error"}`]);
          done = true;
        }
      }
      
      console.log("Stream processing complete");
      
      // Final clean up
      clearInterval(progressInterval);
      
      // Delay setting isGenerating to false to allow time to see completion status
      setTimeout(() => {
        window.inTypingPhase = false;
        setIsGenerating(false);
        
        // Get the actual token count displayed in the UI
        const tokenCountElement = document.querySelector('.token-count');
        const displayedTokenCount = tokenCountElement ? 
          parseInt(tokenCountElement.textContent?.replace(/[^\d]/g, '') || '0') : 
          Math.round(htmlContent.length / 4);
        
        console.log(`Detected token count: ${displayedTokenCount}`);
        
        // Record the token usage using our manual tracking method
        if (displayedTokenCount > 0 && (window as any).recordTokenUsage) {
          console.log(`Recording token usage of ${displayedTokenCount} tokens`);
          (window as any).recordTokenUsage(displayedTokenCount);
        }
        
        // Dispatch custom event to notify token usage has been updated
        window.dispatchEvent(new CustomEvent('landing-page-generated', { 
          detail: { tokenCount: displayedTokenCount }
        }));
        console.log('Dispatched landing-page-generated event with token count:', displayedTokenCount);
        
        // Show a toast notification with completion message
        // This will appear after the generation status popup disappears
        toast({
          title: "Generation Complete",
          description: "✅ Content successfully generated by AI Accelerate LLM Inference!",
          // Using default variant with custom styling to achieve success look
          className: "bg-green-100 border-green-500 text-green-800",
          duration: 5000, // Show for 5 seconds
        });
      }, 2000);
      
      // Final update with clean HTML (no cursor)
      if (collectedHtml) {
        setHtmlContent(collectedHtml);
      } else {
        throw new Error("No HTML content received from API");
      }
    } catch (error) {
      console.error('Error setting up generation:', error);
      
      // Check if this is an AbortError (from manually stopping generation)
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Generation was stopped by user');
        // No need to show error toast, already handled in handleStopGeneration
      } else {
        toast({
          title: "Generation Failed",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
        setStreamingOutput(prev => [...prev, "Error: Generation failed"]);
      }
      
      // Always clean up
      setIsGenerating(false);
      
      // Reset the controller reference
      streamControllerRef.current = null;
    } finally {
      // Clear any intervals we may have set
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
      }
    }
  };

  // Helper function for smooth scrolling with requestAnimationFrame
  const smoothScrollTo = (element: HTMLElement, targetScrollTop: number, duration = 200) => {
    // Make sure we can see the very end of the content by adding extra padding
    // when scrolling near the bottom of the content
    const maxScroll = element.scrollHeight - element.clientHeight;
    
    // Make sure the scrollbar is visible
    element.style.overflowY = 'scroll';
    
    // If target is within 10% of the max scroll, go all the way to the bottom
    // This ensures we always can see the last lines of content
    if (targetScrollTop > maxScroll * 0.9) {
      targetScrollTop = maxScroll;
    }
    
    // Safety check: ensure targetScrollTop is within bounds
    targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));
    
    const startScrollTop = element.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    
    // Don't animate if distance is too small or if we're already at target
    if (Math.abs(distance) < 10 || startScrollTop === targetScrollTop) {
      element.scrollTop = targetScrollTop;
      return;
    }
    
    // Throttle animation to reduce CPU usage and shaking
    // Only run animation if we're not already in the middle of one
    if (element.dataset.isScrolling === "true") {
      // Just set the final position if another scroll is in progress
      element.scrollTop = targetScrollTop;
      return;
    }
    
    // Mark that we're currently scrolling
    element.dataset.isScrolling = "true";
    
    let startTime: number | null = null;
    let lastPosition = startScrollTop;

    function animation(currentTime: number) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simplified easing function for less CPU usage
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
      // Apply the calculated scroll position
      const newPosition = startScrollTop + distance * easeProgress;
      element.scrollTop = newPosition;
      
      // Check if we're actually making progress (avoid infinite loop in case of DOM issues)
      const isMoving = Math.abs(newPosition - lastPosition) > 0.5;
      lastPosition = newPosition;
      
      // Ensure scrollbar is visible during animation
      element.style.overflowY = 'scroll';
      
      // Continue animation if we're not done and still making progress
      if (progress < 1 && isMoving) {
        requestAnimationFrame(animation);
      } else {
        // When finished or stuck, make sure we're exactly at target (no rounding errors)
        element.scrollTop = targetScrollTop;
        // Mark that we're done scrolling
        element.dataset.isScrolling = "false";
      }
    }
    
    // Start the animation
    requestAnimationFrame(animation);
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
      // Make sure we're on the preview tab
      setActiveTab('preview');
      
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
    } else if (previewRef.current) {
      // Desktop approach using iframe with force refresh technique
      const current = previewRef.current;
      
      // Force the iframe to reload by clearing the content first
      current.srcdoc = '';
      
      // Then after a small delay, set the content again
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.srcdoc = contentToUse;
          console.log("Iframe content refreshed with force reload technique");
        }
      }, 50);
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
            <span className={`${isMobile ? 'hidden' : 'inline'} text-xs text-gray-500 ml-2 font-normal`}>Powered by AI Accelerate LLM Inference</span>
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
            onClick={() => window.location.href = '/editor'}
          >
            <PlusCircle className="h-4 w-4 md:mr-1" />
            <span className={`${isMobile ? 'hidden' : 'inline'} text-sm`}>New</span>
          </Button>
          
          {/* User Profile with token usage tracking */}
          <div className="ml-2 border-l border-gray-700 pl-2">
            <UserProfile />
          </div>
          {/* Settings button removed as we're using a fixed API key */}
        </div>
      </div>

      {/* API Settings Panel removed - using fixed API key */}

      {/* Mobile Mode Tabs - Only shown on mobile */}
      {isMobile && (
        <div className="bg-[#1e293b] px-4 py-2 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-2 gap-1 bg-[#111827] p-1 rounded-lg" style={{ width: '60%' }}>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('editor')}
                className={activeTab === 'editor'
                  ? "bg-blue-600 text-white rounded-md" 
                  : "bg-transparent text-gray-400 hover:text-gray-300 rounded-md"}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Editor
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('preview');
                  // Force refresh when switching to preview
                  setTimeout(handleRefreshPreview, 100);
                }}
                className={activeTab === 'preview'
                  ? "bg-blue-600 text-white rounded-md" 
                  : "bg-transparent text-gray-400 hover:text-gray-300 rounded-md"}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
            </div>
            
            {activeTab === 'preview' && (
              <Button 
                variant="outline"
                size="sm"
                onClick={handleRefreshPreview}
                className="text-blue-400 border-blue-400/30"
                title="Refresh Preview"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isMobile ? 'flex flex-col' : 'flex'} flex-1 overflow-hidden editor-container`}>
        {/* Editor Panel - Visibility controlled by tabs on mobile */}
        <div 
          className={`editor-panel ${isMobile ? (activeTab === 'preview' ? 'hidden' : 'w-full h-full') : 'w-1/2 h-full'} flex flex-col overflow-hidden bg-[#0f172a]`}
        >
          <div className="flex-1 flex flex-col p-4">
          {/* Prompt Input and Generation Status */}
          <div className="mb-2">
            {isGenerating ? (
              <GenerationStatus 
                status={streamingOutput}
                processingItem={prompt.split(' ').slice(0, 2).join(' ')} 
                percentComplete={
                  window.expectedContentLength && htmlContent.length > 0
                    ? Math.floor((htmlContent.length / window.expectedContentLength) * 100)
                    : 0
                } 
                onStop={handleStopGeneration}
              />
            ) : (
              <>
                <label className="block text-sm font-medium text-white mb-1">Describe your landing page</label>
                <div className="rounded-md overflow-hidden border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <input
                    className="w-full p-2 bg-[#1e293b] text-white border-0 text-sm focus:outline-none"
                    type="text"
                    placeholder="Describe the landing page you want to generate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  />
                </div>
                <div className="flex justify-end items-center mt-2 text-xs text-gray-400">
                  {/* Removed "Powered by AI Accelerate LLM Inference" text to save space */}
                </div>
              </>
            )}
          </div>
          
          {/* Generate Button - Always visible */}
          <Button 
            className={`w-full ${isGenerating ? 'mb-2' : 'mb-4'} py-3 ${isGenerating ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-all duration-200 transform hover:translate-y-[-1px]`} 
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
          
          {/* HTML Editor - Always visible */}
          <div className="flex-1 overflow-visible bg-[#111827] rounded-md border border-gray-700">
            <div className="flex items-center justify-between bg-[#1e293b] px-3 py-2 border-b border-gray-700">
              <div className="text-xs font-medium text-gray-300">
                {isGenerating ? (
                  <span className="flex items-center">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                    Generating index.html...
                  </span>
                ) : (
                  "index.html"
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium mr-1">
                  {htmlContent.length > 0 ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-300 bg-[#0f172a] px-2 py-0.5 rounded token-count">
                        {Math.round(htmlContent.length / 4)} tokens
                      </span>
                      {!isGenerating && window.totalTokenCount && window.generationStartTime ? (
                        <span className="text-green-400 bg-[#0f172a] px-2 py-0.5 rounded generation-stats">
                          🚀 {(window.totalTokenCount / ((Date.now() - window.generationStartTime) / 1000)).toFixed(2)} t/s
                          | ⏱️ {((Date.now() - window.generationStartTime) / 1000).toFixed(2)}s
                        </span>
                      ) : null}
                    </div>
                  ) : ""}
                </div>
                <div className="flex space-x-1">
                  <div className="px-1.5 py-0.5 bg-blue-500 rounded-md text-xs text-white">HTML</div>
                  <div className="px-1.5 py-0.5 bg-pink-500 rounded-md text-xs text-white">CSS</div>
                </div>
              </div>
            </div>
            <div className="relative w-full h-[calc(100%-32px)] flex flex-col">
              <div className="flex-1 w-full" style={{ height: '600px', maxHeight: '600px', overflow: 'visible' }}>
                <CodeEditor
                  value={htmlContent}
                  onChange={handleHtmlChange}
                  isGenerating={isGenerating}
                  editorWrapperRef={editorWrapperRef}
                />
              </div>
              {/* Typing indicator is now handled in the code-editor-enhanced.tsx component */}
            </div>
          </div>
        </div>
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
          className={`preview-panel ${
            isFullscreen 
              ? 'fixed inset-0 z-50' 
              : isMobile 
                ? (activeTab === 'preview' ? 'w-full h-full' : 'hidden') 
                : 'w-1/2 h-full'
          } flex flex-col bg-white overflow-hidden`}
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
              
              {/* Refresh Button - Keep for both mobile and desktop */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-1.5 text-xs border-gray-300 text-gray-700" 
                onClick={handleRefreshPreview}
                title="Refresh Preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              
              {/* Fullscreen toggle button */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-1.5 text-xs border-gray-300 text-gray-700"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>
          
          {/* Preview Iframe */}
          <div className="flex-1">
            
            {/* We removed the duplicate mobile preview toolbar */}
            <div className="w-full h-full relative">
              {isMobile && !htmlContent && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500 mb-2">Generate a landing page to see the preview</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('editor')}
                      className="text-xs"
                    >
                      Switch to Editor
                    </Button>
                  </div>
                </div>
              )}
              {/* For mobile, we'll use a different approach since iframe srcdoc might have issues */}
              {isMobile ? (
                <div 
                  className="w-full h-full overflow-auto bg-white"
                  style={{ 
                    position: 'relative',
                    height: 'calc(100% - 40px)', /* Adjust for header space */
                    WebkitOverflowScrolling: 'touch', /* For smooth scrolling on iOS */
                    overscrollBehavior: 'contain'
                  }}
                  onClick={(e) => {
                    // Prevent links from redirecting away from the application
                    // when they're clicked in the preview area
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'A' || target.closest('a')) {
                      e.preventDefault();
                      e.stopPropagation();
                      toast({
                        title: "Link Clicked",
                        description: "Links are disabled in preview mode",
                      });
                      return false;
                    }
                  }}
                >
                  {/* Create a container to hold the HTML content directly */}
                  <div
                    id="mobile-preview-container"
                    className="w-full min-h-full"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              ) : (
                <iframe
                  ref={previewRef}
                  title="Preview"
                  className="w-full h-full border-0"
                  srcDoc={htmlContent}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms" 
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