import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useProject, ProjectFile } from '@/contexts/ProjectContext';
import { FileBrowser } from '@/components/FileBrowser';
import { EditorTabs } from '@/components/EditorTabs';
import { MultiFileEditor } from '@/components/MultiFileEditor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { UserProfile } from '@/components/user-profile';
import { DeployButton } from '@/components/deploy-button';
import { GenerationProgressBar } from '@/components/GenerationProgressBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Send, 
  Zap, 
  Download, 
  Save, 
  FolderOpen,
  Plus,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Files,
  AtSign,
  Paperclip,
  Edit3,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processAiResponse, convertToProjectFiles } from '@/lib/process-ai-response';
import { rewritePrompt } from '@/lib/rewrite-prompt';
import { EnhancedSettings } from '@shared/schema';

interface EditorIDEProps {
  initialApiConfig?: any;
  onApiConfigChange?: (newConfig: any) => void;
  isDisposable?: boolean;
}

export default function EditorIDE({ initialApiConfig, onApiConfigChange, isDisposable = false }: EditorIDEProps) {
  const { sessionId: routeSessionId } = useParams(); // Changed from id to sessionId
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Add auth context
  const { 
    project, 
    createNewProject, 
    setProjectFiles, 
    addPrompt,
    saveProject,
    loadProject,
    getFileByName,
    openFile
  } = useProject();
  
  // Get URL parameters for disposable generation
  const [urlParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return {
        prompt: params.get('prompt') || '',
        model: params.get('model') || 'cerebras'
      };
    }
    return { prompt: '', model: 'cerebras' };
  });
  
  // UI State
  const [prompt, setPrompt] = useState(urlParams.prompt ? decodeURIComponent(urlParams.prompt) : '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState(
    urlParams.model === 'sambanova' ? 'sambanova-deepseek-v3' :
    urlParams.model === 'cerebras' ? 'cerebras-glm-4.6' : 'cerebras-glm-4.6'
  );
  
  // Enhanced Settings with localStorage persistence
  const [enhancedSettings, setEnhancedSettings] = useState<EnhancedSettings>(() => {
    const saved = localStorage.getItem('enhanced_settings');
    return saved ? JSON.parse(saved) : { isActive: true };
  });
  
  // Persist enhancedSettings to localStorage
  useEffect(() => {
    localStorage.setItem('enhanced_settings', JSON.stringify(enhancedSettings));
  }, [enhancedSettings]);
  
  // Refs
  const previewRef = useRef<HTMLIFrameElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  // Load project if sessionId is provided
  useEffect(() => {
    const initProject = async () => {
      try {
        if (routeSessionId === 'new' || !routeSessionId) {
          // Create a fresh new project
          createNewProject();
          
          // If this is a disposable session with URL params, auto-start generation
          if (isDisposable && urlParams.prompt) {
            // Wait a bit for the project to initialize
            setTimeout(() => {
              handleGenerate();
            }, 500);
          }
        } else {
          // Try to load existing project by sessionId
          await loadProject(routeSessionId);
        }
      } catch (error) {
        console.error('Failed to initialize project:', error);
        // If loading fails, create new project instead
        createNewProject();
      }
    };
    
    initProject();
  }, [routeSessionId]);

  // Update preview when active file changes
  useEffect(() => {
    if (!project || !previewRef.current) return;
    
    const htmlFile = getFileByName('index.html');
    const cssFile = getFileByName('style.css');
    const jsFile = getFileByName('script.js');
    const navbarFile = getFileByName('components/navbar.js');
    const footerFile = getFileByName('components/footer.js');
    
    if (htmlFile) {
      let fullHtml = htmlFile.content;
      
      // Create a virtual file system for multi-page navigation
      const allHtmlFiles = project.files.filter(f => f.name.endsWith('.html'));
      const fileSystem = allHtmlFiles.reduce((acc, file) => {
        acc[file.name] = file.content;
        return acc;
      }, {} as Record<string, string>);
      
      // Always inject CSS inline (remove any external references first)
      if (cssFile) {
        // Remove external CSS references
        fullHtml = fullHtml.replace(/<link[^>]*href=["']style\.css["'][^>]*>/gi, '');
        
        // Inject CSS inline
        const headEnd = fullHtml.indexOf('</head>');
        if (headEnd > -1) {
          fullHtml = fullHtml.slice(0, headEnd) + 
            `\n<style>\n${cssFile.content}\n</style>\n` + 
            fullHtml.slice(headEnd);
        }
      }
      
      // Build complete JavaScript including components
      let completeJs = '';
      
      // Add component files first
      if (navbarFile) {
        completeJs += `\n// navbar.js\n${navbarFile.content}\n`;
      }
      if (footerFile) {
        completeJs += `\n// footer.js\n${footerFile.content}\n`;
      }
      
      // Add main script file
      if (jsFile) {
        completeJs += `\n// script.js\n${jsFile.content}\n`;
      }
      
      // Add client-side routing for multi-page apps
      if (allHtmlFiles.length > 1) {
        completeJs += `
// Client-side routing for multi-page preview
(function() {
  const fileSystem = ${JSON.stringify(fileSystem)};
  
  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//')) {
      return; // Let normal navigation happen for anchors and external links
    }
    
    e.preventDefault();
    
    // Handle the navigation
    let targetFile = href;
    if (href === '/' || href === '') {
      targetFile = 'index.html';
    } else if (!href.endsWith('.html')) {
      targetFile = href + '.html';
    }
    
    // Strip leading slash if present
    if (targetFile.startsWith('/')) {
      targetFile = targetFile.substring(1);
    }
    
    // Load the target page content
    if (fileSystem[targetFile]) {
      let newContent = fileSystem[targetFile];
      
      // Inject CSS into the new page
      const cssContent = ${cssFile ? JSON.stringify(cssFile.content) : '""'};
      if (cssContent && !newContent.includes('<style>')) {
        // Remove external CSS references
        newContent = newContent.replace(/<link[^>]*href=["']style\.css["'][^>]*>/gi, '');
        
        const headEnd = newContent.indexOf('</head>');
        if (headEnd > -1) {
          newContent = newContent.slice(0, headEnd) + 
            '<style>' + cssContent + '</style>' + 
            newContent.slice(headEnd);
        }
      }
      
      // Also remove external JS references from new content
      newContent = newContent.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '');
      newContent = newContent.replace(/<script[^>]*src=["']components\/navbar\.js["'][^>]*><\/script>/gi, '');
      newContent = newContent.replace(/<script[^>]*src=["']components\/footer\.js["'][^>]*><\/script>/gi, '');
      
      // Update the document
      document.open();
      document.write(newContent);
      document.close();
      
      // Re-inject all JavaScript (components + main + routing)
      const fullScript = document.createElement('script');
      fullScript.textContent = ${JSON.stringify(completeJs)};
      document.body.appendChild(fullScript);
    } else {
      console.warn('Page not found:', targetFile);
    }
  });
})();
`;
      }
      
      // Always inject complete JS inline (remove any external references first)
      if (completeJs) {
        // Remove external script references
        fullHtml = fullHtml.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '');
        fullHtml = fullHtml.replace(/<script[^>]*src=["']components\/navbar\.js["'][^>]*><\/script>/gi, '');
        fullHtml = fullHtml.replace(/<script[^>]*src=["']components\/footer\.js["'][^>]*><\/script>/gi, '');
        
        // Inject complete JS inline
        const bodyEnd = fullHtml.indexOf('</body>');
        if (bodyEnd > -1) {
          fullHtml = fullHtml.slice(0, bodyEnd) + 
            `\n<script>\n${completeJs}\n</script>\n` + 
            fullHtml.slice(bodyEnd);
        }
      }
      
      // Update the iframe with a small delay to ensure proper rendering
      setTimeout(() => {
        if (previewRef.current) {
          const iframeDoc = previewRef.current.contentDocument;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(fullHtml);
            iframeDoc.close();
          }
        }
      }, 100);
    }
  }, [project?.files, project?.activeFile]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Enhance prompt if enhancement is enabled
    let finalPrompt = prompt;
    if (enhancedSettings.isActive) {
      try {
        toast({
          title: "Enhancing prompt...",
          description: "Adding more details for better results",
        });
        finalPrompt = await rewritePrompt(prompt);
        console.log('Original prompt:', prompt);
        console.log('Enhanced prompt:', finalPrompt);
      } catch (error) {
        console.error('Failed to enhance prompt:', error);
        // Continue with original prompt if enhancement fails
        finalPrompt = prompt;
      }
    }
    
    addPrompt(finalPrompt);
    
    // Create a new AbortController for this generation
    const controller = new AbortController();
    streamControllerRef.current = controller;
    
    try {
      const token = localStorage.getItem('auth_token');
      const isFollowUp = project && project.files.length > 0 && project.prompts.length > 0;
      
      // Create session with POST to avoid URL length limitations
      const sessionPayload: any = {
        prompt: finalPrompt,
        useMultiFile: true
      };
      
      if (isFollowUp) {
        sessionPayload.existingFiles = project.files;
        sessionPayload.previousPrompts = project.prompts;
      }
      
      // Create session first
      const sessionResponse = await fetch('/api/stream/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(sessionPayload)
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }
      
      const { sessionId } = await sessionResponse.json();
      
      const baseUrl = window.location.origin;
      // Select API endpoint based on model
      const apiEndpoint = selectedModel === 'cerebras-glm-4.6' 
        ? `/api/cerebras/stream/${sessionId}`
        : `/api/sambanova/stream/${sessionId}`;
      
      // Add token to query params if available
      const params = new URLSearchParams();
      if (token) {
        params.append('token', token);
      }
      
      const eventSource = new EventSource(
        `${baseUrl}${apiEndpoint}${token ? '?' + params.toString() : ''}`
      );
      
      // Save reference for stop functionality
      streamControllerRef.current = {
        abort: () => eventSource.close(),
        signal: null as any
      };
      
      let accumulatedContent = '';
      let currentFiles: Map<string, ProjectFile> = new Map();
      let incompleteFiles: Set<string> = new Set(); // Track which files are still streaming
      let currentFileName: string | null = null;
      let isMultiFile = false;
      let parsingState: 'project_name' | 'file_start' | 'file_content' | 'file_end' = 'project_name';
      let projectName = '';
      let currentFileContent = '';
      let inCodeBlock = false;
      
      // Helper to add cursor effect
      const addCursor = (text: string) => text + '█';
      
      // Helper to strip cursor from text
      const stripCursor = (text: string) => text.replace(/█/g, '');
      
      // Helper to update files in real-time
      const updateFilesRealtime = () => {
        const filesArray = Array.from(currentFiles.values()).map(f => ({
          name: f.name,
          content: incompleteFiles.has(f.name) ? addCursor(stripCursor(f.content)) : stripCursor(f.content),
          language: f.language as 'html' | 'css' | 'javascript' | 'unknown'
        }));
        
        if (filesArray.length > 0) {
          setProjectFiles(filesArray);
        }
      };
      
      // Helper to start a new file
      const startNewFile = (fileName: string) => {
        // Mark previous file as complete
        if (currentFileName && currentFiles.has(currentFileName)) {
          incompleteFiles.delete(currentFileName); // Mark as complete by removing from incomplete set
        }
        
        currentFileName = fileName;
        const extension = fileName.split('.').pop()?.toLowerCase();
        let language: 'html' | 'css' | 'javascript' | 'unknown' = 'unknown';
        
        if (extension === 'html') language = 'html';
        else if (extension === 'css') language = 'css';
        else if (extension === 'js') language = 'javascript';
        
        currentFiles.set(currentFileName, {
          name: currentFileName,
          content: '',
          language
        });
        incompleteFiles.add(currentFileName); // Mark as incomplete
        
        currentFileContent = '';
        inCodeBlock = false;
      };
      
      eventSource.onmessage = (e) => {
        try {
          // Handle stream completion
          if (e.data === '[DONE]') {
            // Mark all files as complete and remove cursors
            currentFiles.forEach((file, name) => {
              currentFiles.set(name, { 
                ...file, 
                content: stripCursor(file.content)
              });
            });
            incompleteFiles.clear(); // Clear all incomplete markers
            
            // Convert current files to array for final update
            const finalFilesArray = Array.from(currentFiles.values()).map(f => ({
              name: f.name,
              content: stripCursor(f.content),
              language: f.language as 'html' | 'css' | 'javascript' | 'unknown'
            }));
            
            // Update project files one final time before saving
            setProjectFiles(finalFilesArray);
            setIsGenerating(false);
            eventSource.close();
            
            // Show success notification for generation completion
            toast({
              title: "✨ Generation Complete!",
              description: `Successfully generated ${finalFilesArray.length} files using Jatevo LLM Inference`,
              className: "bg-green-900 border-green-700 text-white",
            });
            
            // Auto-save project after generation completes (only if authenticated)
            console.log('Checking auto-save condition:', { routeSessionId, isNew: routeSessionId === 'new', isUndefined: !routeSessionId, user: !!user });
            if (user && (routeSessionId === 'new' || !routeSessionId)) {
              // Generate project name from prompt if not provided
              const autoName = projectName || finalPrompt.substring(0, 50).trim() || 'Untitled Project';
              
              // Show saving notification
              toast({
                title: "💾 Saving Project...",
                description: `Saving your project as "${autoName}"`,
                className: "bg-blue-900 border-blue-700 text-white",
              });
              
              // Save project immediately with explicit files (no delay needed!)
              // Pass finalFilesArray directly to avoid closure/state timing issues
              (async () => {
                try {
                  console.log('Auto-saving project:', { autoName, filesCount: finalFilesArray.length });
                  
                  // Pass finalFilesArray and prompt explicitly to avoid stale closure
                  const savedProject = await saveProject(undefined, autoName, finalFilesArray, finalPrompt);
                  
                  if (savedProject?.id) {
                    // Navigate using slug if available, otherwise fall back to ID
                    const navigateTo = savedProject.slug 
                      ? `/ide/${savedProject.slug}` 
                      : `/ide/${savedProject.id}`;
                    
                    console.log('Navigating to saved project:', navigateTo, savedProject);
                    navigate(navigateTo, { replace: true });
                    
                    toast({
                      title: "✅ Project Saved Successfully!",
                      description: `Your project "${autoName}" has been saved with ID: ${savedProject.id}`,
                      className: "bg-green-900 border-green-700 text-white",
                    });
                  }
                } catch (error) {
                  console.error('Auto-save failed:', error);
                  toast({
                    title: "❌ Auto-save Failed",
                    description: "Your project couldn't be saved automatically. Please use the Save button.",
                    variant: "destructive"
                  });
                }
              })();
            } else if (!user && (routeSessionId === 'new' || !routeSessionId)) {
              // Not authenticated - show login prompt
              toast({
                title: "🔐 Login to Save",
                description: "Sign up or login to save your project",
                className: "bg-yellow-900 border-yellow-700 text-white",
                action: (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-yellow-800 text-white border-yellow-600 hover:bg-yellow-700"
                    onClick={() => navigate('/auth/signup')}
                  >
                    Sign Up
                  </Button>
                )
              });
            } else {
              // Project already has an ID, just update it
              toast({
                title: "✨ Generation Complete!",
                description: "Your changes have been applied successfully.",
                className: "bg-green-900 border-green-700 text-white",
              });
            }
            
            return;
          }
          
          // Ignore keepalive messages
          if (e.data === ': keepalive' || e.data.startsWith(':')) {
            return;
          }
          
          let eventData;
          let contentChunk = '';
          
          // Try to parse as JSON first
          try {
            eventData = JSON.parse(e.data);
            const eventType = eventData.type || eventData.event;
            
            if (eventType === 'chunk' || eventType === 'content') {
              contentChunk = eventData.content || '';
            } else if (eventType === 'error') {
              console.error('Stream error:', eventData.message);
              setIsGenerating(false);
              return;
            } else if (eventType === 'complete') {
              // Handle multi-file completion from backend (Cerebras batch mode)
              if (eventData.files && Array.isArray(eventData.files) && eventData.files.length > 0) {
                console.log('Received multi-file completion from backend:', eventData.files.length, 'files');
                
                // Get existing files for search/replace operations
                const existingFilesArray = Array.from(currentFiles.values());
                
                // Convert parsed files to project files
                const newFiles = convertToProjectFiles(eventData.files, existingFilesArray);
                
                // Clear current files and set new ones
                currentFiles.clear();
                for (const file of newFiles) {
                  currentFiles.set(file.name, {
                    ...file,
                    content: stripCursor(file.content)
                  });
                }
                
                if (eventData.projectName) {
                  projectName = eventData.projectName;
                }
              }
              
              // Mark all files as complete and remove cursors
              currentFiles.forEach((file, name) => {
                currentFiles.set(name, { 
                  ...file, 
                  content: stripCursor(file.content)
                });
              });
              incompleteFiles.clear(); // Clear all incomplete markers
              
              // Convert current files to array for final update
              const finalFilesArray = Array.from(currentFiles.values()).map(f => ({
                name: f.name,
                content: stripCursor(f.content),
                language: f.language as 'html' | 'css' | 'javascript' | 'unknown'
              }));
              
              // Update project files one final time before saving
              setProjectFiles(finalFilesArray);
              updateFilesRealtime();
              setIsGenerating(false);
              eventSource.close();
              
              // Auto-save project after Cerebras batch completion (only if authenticated)
              console.log('Checking auto-save condition for Cerebras batch:', { routeSessionId, isNew: routeSessionId === 'new', isUndefined: !routeSessionId, user: !!user });
              if (user && (routeSessionId === 'new' || !routeSessionId)) {
                // Generate project name from prompt if not provided
                const autoName = projectName || finalPrompt.substring(0, 50).trim() || 'Untitled Project';
                
                // Save project immediately with explicit files
                (async () => {
                  try {
                    console.log('Auto-saving project (Cerebras):', { autoName, filesCount: finalFilesArray.length });
                    
                    // Pass finalFilesArray explicitly to avoid stale closure
                    const savedProject = await saveProject(undefined, autoName, finalFilesArray);
                    
                    if (savedProject?.id) {
                      // Navigate using slug if available, otherwise fall back to ID
                      const navigateTo = savedProject.slug 
                        ? `/ide/${savedProject.slug}` 
                        : `/ide/${savedProject.id}`;
                      
                      console.log('Navigating to saved project:', navigateTo, savedProject);
                      navigate(navigateTo, { replace: true });
                      
                      toast({
                        title: "✅ Project Saved",
                        description: `Your project "${autoName}" has been saved successfully!`,
                      });
                    }
                  } catch (error) {
                    console.error('Auto-save failed:', error);
                    toast({
                      title: "Auto-save Failed",
                      description: "Your project wasn't saved. Please use the Save button.",
                      variant: "destructive"
                    });
                  }
                })();
              } else if (!user && (routeSessionId === 'new' || !routeSessionId)) {
                // Not authenticated - show login prompt
                toast({
                  title: "🔐 Login to Save",
                  description: "Sign up or login to save your project",
                  className: "bg-yellow-900 border-yellow-700 text-white",
                  action: (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-yellow-800 text-white border-yellow-600 hover:bg-yellow-700"
                      onClick={() => navigate('/auth/signup')}
                    >
                      Sign Up
                    </Button>
                  )
                });
              }
              
              return;
            } else if (eventType === 'token-usage-updated') {
              // Dispatch custom event for user profile to update stats in real-time
              const tokenUpdateEvent = new CustomEvent('token-usage-updated', {
                detail: {
                  tokenUsage: eventData.tokenUsage,
                  generationCount: eventData.generationCount
                }
              });
              window.dispatchEvent(tokenUpdateEvent);
              console.log('Dispatched token-usage-updated event:', eventData);
              
              // Also update local state
              if (eventData.tokenUsage) setTokenUsage(eventData.tokenUsage);
              if (eventData.generationCount) setGenerationCount(eventData.generationCount);
              return;
            } else if (eventType === 'stats') {
              // Handle stats if needed
              return;
            }
          } catch (parseError) {
            // If not JSON, treat as plain text token
            contentChunk = e.data;
          }
          
          if (!contentChunk) return;
          
          accumulatedContent += contentChunk;
          
          // REAL-TIME STREAMING: Detect file markers as they arrive
          // Check for project name
          const projectNameMatch = accumulatedContent.match(/<<<<<<< PROJECT_NAME_START\s+(.+?)\s+>>>>>>> PROJECT_NAME_END/);
          if (projectNameMatch && !projectName) {
            projectName = projectNameMatch[1].trim();
            isMultiFile = true;
          }
          
          // Find all NEW_FILE_START markers in accumulated content
          const fileMarkerRegex = /<<<<<<< NEW_FILE_START\s+([^\s>]+)\s+>>>>>>> NEW_FILE_END/g;
          const fileMatches = Array.from(accumulatedContent.matchAll(fileMarkerRegex));
          
          if (fileMatches.length > 0) {
            isMultiFile = true;
            
            // Process each detected file
            fileMatches.forEach((match, index) => {
              const fileName = match[1];
              const fileStartPos = match.index! + match[0].length;
              
              // Find the end of this file (next file marker or end of content)
              let fileEndPos = accumulatedContent.length;
              if (index < fileMatches.length - 1) {
                fileEndPos = fileMatches[index + 1].index!;
              }
              
              // Extract raw content for this file
              const rawFileContent = accumulatedContent.substring(fileStartPos, fileEndPos);
              
              // Extract content from code block if present
              let fileContent = rawFileContent;
              const codeBlockMatch = rawFileContent.match(/```(?:html|css|javascript|js)?\s*\n?([\s\S]*?)(?:```|$)/);
              if (codeBlockMatch) {
                fileContent = codeBlockMatch[1];
              }
              
              // Determine language
              const extension = fileName.split('.').pop()?.toLowerCase();
              let language: 'html' | 'css' | 'javascript' | 'unknown' = 'unknown';
              if (extension === 'html') language = 'html';
              else if (extension === 'css') language = 'css';
              else if (extension === 'js') language = 'javascript';
              
              // Create or update the file immediately
              const isNewFile = !currentFiles.has(fileName);
              
              if (isNewFile) {
                // NEW FILE DETECTED - show it immediately in file browser!
                currentFiles.set(fileName, {
                  name: fileName,
                  content: fileContent,
                  language
                });
                incompleteFiles.add(fileName); // Mark as incomplete during streaming
                console.log(`🎬 Started streaming file: ${fileName}`);
              } else {
                // UPDATE existing file with new content
                const existingFile = currentFiles.get(fileName)!;
                currentFiles.set(fileName, {
                  ...existingFile,
                  content: fileContent
                });
              }
            });
            
            // Update UI immediately to show new files
            updateFilesRealtime();
            
            // AUTO-SWITCH TO LATEST FILE (v3 behavior)
            // When a new file starts generating, switch to it automatically
            if (fileMatches.length > 0) {
              const latestFile = fileMatches[fileMatches.length - 1][1];
              // Check if this is actually a new file being created
              const latestFileInCurrentFiles = currentFiles.get(latestFile);
              if (latestFileInCurrentFiles && project?.activeFile !== latestFile) {
                // Switch to this file in the editor tabs
                openFile(latestFile);
                console.log(`📂 Auto-switched to: ${latestFile}`);
              }
            }
            
          } else if (!isMultiFile && (accumulatedContent.includes('<!DOCTYPE html') || accumulatedContent.includes('<html'))) {
            // Fallback: Single file mode - treat as HTML
            if (!currentFiles.has('index.html')) {
              currentFiles.set('index.html', {
                name: 'index.html',
                content: '',
                language: 'html'
              });
              incompleteFiles.add('index.html');
            }
            
            const file = currentFiles.get('index.html')!;
            currentFiles.set('index.html', {
              ...file,
              content: accumulatedContent
            });
            
            updateFilesRealtime();
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setIsGenerating(false);
        
        toast({
          title: "Error",
          description: "Connection error during generation",
          variant: "destructive"
        });
      };
      
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      
      toast({
        title: "Error",
        description: "Failed to start generation",
        variant: "destructive"
      });
    }
  };

  const handleStopGeneration = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
  };

  const handleDownloadProject = async () => {
    if (!project) return;
    
    try {
      // Create a zip file with all project files
      const zip = await import('jszip').then(m => new m.default());
      
      project.files.forEach(file => {
        zip.file(file.name, file.content);
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Project downloaded successfully"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download project",
        variant: "destructive"
      });
    }
  };

  const getFileLanguage = (fileName: string): ProjectFile['language'] => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      default: return 'unknown';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between bg-[#0a0a0a] relative">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Jatevo Web Builder</h1>
          {project && (
            <span className="text-sm text-gray-400">
              {project.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Check authentication first
              if (!user) {
                toast({
                  title: "🔐 Login Required",
                  description: "Please sign up or login to save your project",
                  className: "bg-yellow-900 border-yellow-700 text-white",
                  action: (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-yellow-800 text-white border-yellow-600 hover:bg-yellow-700"
                      onClick={() => navigate('/auth/signup')}
                    >
                      Sign Up
                    </Button>
                  )
                });
                return;
              }
              
              const projectName = project?.name || prompt.substring(0, 50).trim() || 'Untitled Project';
              try {
                const savedProject = await saveProject(
                  project?.sessionId,  // sessionId is a string, not the ID
                  projectName,
                  project?.files || [],
                  prompt  // Pass the prompt for slug generation
                );
                if (savedProject?.id) {
                  const navigateTo = savedProject.slug 
                    ? `/ide/${savedProject.slug}` 
                    : `/ide/${savedProject.id}`;
                  
                  if (routeSessionId === 'new') {
                    navigate(navigateTo, { replace: true });
                  }
                  
                  toast({
                    title: "✅ Project Saved",
                    description: `Your project "${projectName}" has been saved successfully!`,
                  });
                }
              } catch (error) {
                console.error('Manual save failed:', error);
                toast({
                  title: "Save Failed",
                  description: "Unable to save your project. Please try again.",
                  variant: "destructive"
                });
              }
            }}
            disabled={!project || !project.files || project.files.length === 0 || isGenerating}
            className="bg-transparent border-gray-700 hover:bg-gray-900 text-gray-300"
            data-testid="button-save-project"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProject}
            disabled={!project || project.files.length === 0}
            className="bg-transparent border-gray-700 hover:bg-gray-900 text-gray-300"
            data-testid="button-download-project"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          {project && project.files.length > 0 && (
            <DeployButton 
              html={getFileByName('index.html')?.content || ''}
              css={getFileByName('style.css')?.content}
              projectId={project.id ? parseInt(project.id) : null}
            />
          )}
          
          <UserProfile />
        </div>
      </header>

      {/* Generation Progress Bar */}
      <GenerationProgressBar
        isGenerating={isGenerating}
        onStop={handleStopGeneration}
        tokenCount={0}
        prompt={selectedModel === 'cerebras-glm-4.6' ? 'cerebras' : 'sambanova'}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* File Explorer Overlay - Always rendered but visibility controlled by CSS */}
        <>
          {/* Background overlay */}
          <div 
            className={cn(
              "absolute inset-0 bg-black/50 z-40 transition-opacity duration-300",
              showFileExplorer ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setShowFileExplorer(false)}
          />
          
          {/* Explorer Panel */}
          <div className={cn(
            "absolute left-0 top-0 bottom-0 w-80 bg-[#1e1e1e] border-r border-gray-800 z-50",
            "transform transition-transform duration-300 ease-in-out",
            showFileExplorer ? "translate-x-0" : "-translate-x-full"
          )}>
            {/* Explorer Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">EXPLORER</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileExplorer(false)}
                className="h-6 w-6 p-0 hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
            
            {/* File Browser */}
            <FileBrowser className="flex-1 overflow-auto" />
          </div>
        </>

        {/* Editor and Preview Container */}
        <div className="flex-1 flex relative">
          {/* Code Editor - 30% width */}
          <div className="w-[30%] min-w-[400px] bg-[#1e1e1e] flex flex-col border-r border-gray-800">
            {/* Editor Header with Files Button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileExplorer(!showFileExplorer)}
                className="flex items-center gap-2 text-gray-300 hover:bg-gray-800 px-2"
                data-testid="button-toggle-explorer"
              >
                <Files className="w-4 h-4" />
                <span className="text-sm">Files</span>
              </Button>
              
              <EditorTabs />
            </div>
            
            {/* Code Editor */}
            <MultiFileEditor 
              className="flex-1 overflow-auto"
              onRunCode={() => setShowPreview(true)}
            />
          </div>

          {/* Preview - 80% width */}
          <div className="flex-1 bg-white relative">
            {/* Loading overlay for preview */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                    <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Generating your website...
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                    This may take a moment for complex layouts
                  </p>
                </div>
              </div>
            )}
            
            <iframe
              ref={previewRef}
              className="w-full h-full"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
              title="Preview"
              data-testid="iframe-preview"
              onLoad={() => {
                // Remove any lingering loading indicators when iframe loads
                if (previewRef.current?.contentDocument) {
                  const doc = previewRef.current.contentDocument;
                  // Check if content actually loaded
                  if (doc.body && doc.body.innerHTML.trim()) {
                    console.log('Preview loaded successfully');
                  }
                }
              }}
            />
          </div>

          {/* Prompt Bar - Bottom Left Corner (v3 Design) */}
          <div className="absolute bottom-4 left-4 w-[calc(30%_-_2rem)] min-w-[400px] z-30">
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
              {/* Prompt Input */}
              <Textarea
                placeholder="Ask Jatevo Web Builder for edits"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                    e.preventDefault();
                    if (!isGenerating) {
                      handleGenerate();
                    }
                  }
                }}
                className="min-h-[100px] resize-none border-0 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm px-4 pt-4 pb-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isGenerating}
                data-testid="input-prompt"
              />
              
              {/* Menu Bar */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  {/* Add Context Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    data-testid="button-add-context"
                  >
                    <AtSign className="w-3.5 h-3.5 mr-1.5" />
                    Add Context
                  </Button>
                  
                  {/* Model Selector */}
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger 
                      className="h-8 w-auto min-w-[180px] px-3 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
                      data-testid="select-model"
                    >
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-700">
                      <SelectItem value="deepseek-v3-0324" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                        DeepSeek V3
                      </SelectItem>
                      <SelectItem value="cerebras-glm-4.6" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                        z.ai-GLM 4.6
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Attach Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    data-testid="button-attach"
                  >
                    <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                    Attach
                  </Button>
                  
                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    data-testid="button-edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                  
                  {/* Enhance Toggle */}
                  <div className="flex items-center gap-2 h-8 px-3 text-xs text-gray-400 border-l border-gray-800/50 ml-1 pl-3">
                    <Zap className={cn("w-3.5 h-3.5", enhancedSettings.isActive && "text-yellow-500")} />
                    <span>Enhance</span>
                    <Switch
                      checked={enhancedSettings.isActive}
                      onCheckedChange={(checked) => setEnhancedSettings({ isActive: checked })}
                      className="scale-75"
                      data-testid="switch-enhance"
                    />
                  </div>
                </div>
                
                {/* Send/Stop Button */}
                <Button
                  onClick={isGenerating ? handleStopGeneration : handleGenerate}
                  disabled={!prompt.trim() && !isGenerating}
                  size="sm"
                  className="h-8 px-4 text-xs"
                  variant={isGenerating ? "destructive" : "default"}
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                      Run
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};