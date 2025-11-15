import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useProject, ProjectFile } from '@/contexts/ProjectContext';
import { FileBrowser } from '@/components/FileBrowser';
import { EditorTabs } from '@/components/EditorTabs';
import { MultiFileEditor } from '@/components/MultiFileEditor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserProfile } from '@/components/user-profile';
import { DeployButton } from '@/components/deploy-button';
import { GenerationStatus } from '@/components/ui/generation-status';
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
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processAiResponse, convertToProjectFiles } from '@/lib/process-ai-response';

interface EditorIDEProps {
  initialApiConfig?: any;
  onApiConfigChange?: (newConfig: any) => void;
}

export default function EditorIDE({ initialApiConfig, onApiConfigChange }: EditorIDEProps) {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { 
    project, 
    createNewProject, 
    setProjectFiles, 
    addPrompt,
    saveProject,
    loadProject,
    getFileByName 
  } = useProject();
  
  // UI State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);
  
  // Refs
  const previewRef = useRef<HTMLIFrameElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  // Load project if ID is provided
  useEffect(() => {
    if (id) {
      loadProject(id).catch(error => {
        toast({
          title: "Error",
          description: "Failed to load project",
          variant: "destructive"
        });
        console.error('Failed to load project:', error);
      });
    } else if (!project) {
      createNewProject();
    }
  }, [id]);

  // Update preview when active file changes
  useEffect(() => {
    if (!project || !previewRef.current) return;
    
    const htmlFile = getFileByName('index.html');
    const cssFile = getFileByName('styles.css');
    const jsFile = getFileByName('script.js');
    
    if (htmlFile) {
      let fullHtml = htmlFile.content;
      
      // Inject CSS if exists
      if (cssFile && !fullHtml.includes('<style>')) {
        const headEnd = fullHtml.indexOf('</head>');
        if (headEnd > -1) {
          fullHtml = fullHtml.slice(0, headEnd) + 
            `<style>${cssFile.content}</style>` + 
            fullHtml.slice(headEnd);
        }
      }
      
      // Inject JS if exists
      if (jsFile && !fullHtml.includes('<script>')) {
        const bodyEnd = fullHtml.indexOf('</body>');
        if (bodyEnd > -1) {
          fullHtml = fullHtml.slice(0, bodyEnd) + 
            `<script>${jsFile.content}</script>` + 
            fullHtml.slice(bodyEnd);
        }
      }
      
      const iframeDoc = previewRef.current.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(fullHtml);
        iframeDoc.close();
      }
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
    addPrompt(prompt);
    
    // Create a new AbortController for this generation
    const controller = new AbortController();
    streamControllerRef.current = controller;
    
    try {
      const token = localStorage.getItem('token');
      const isFollowUp = project && project.files.length > 0 && project.prompts.length > 0;
      
      // Use EventSource for real-time SSE streaming
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const encodedPrompt = encodeURIComponent(prompt);
      
      // Build query params
      const params = new URLSearchParams({
        prompt: encodedPrompt,
        useMultiFile: 'true'
      });
      
      if (token) {
        params.append('token', token);
      }
      
      if (isFollowUp) {
        params.append('existingFiles', JSON.stringify(project.files));
        params.append('previousPrompts', JSON.stringify(project.prompts));
      }
      
      const baseUrl = window.location.origin;
      const eventSource = new EventSource(
        `${baseUrl}/api/sambanova/stream/${sessionId}?${params.toString()}`
      );
      
      // Save reference for stop functionality
      streamControllerRef.current = {
        abort: () => eventSource.close(),
        signal: null as any
      };
      
      let accumulatedContent = '';
      let currentFiles: Map<string, { name: string; content: string; language: string; isComplete: boolean }> = new Map();
      let currentFileName: string | null = null;
      let isMultiFile = false;
      
      // Helper to add cursor effect
      const addCursor = (text: string) => text + '█';
      
      // Helper to update files in real-time
      const updateFilesRealtime = () => {
        const filesArray = Array.from(currentFiles.values()).map(f => ({
          name: f.name,
          content: f.isComplete ? f.content : addCursor(f.content),
          language: f.language as 'html' | 'css' | 'javascript' | 'unknown'
        }));
        
        if (filesArray.length > 0) {
          setProjectFiles(filesArray);
        }
      };
      
      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          const eventType = event.type || event.event;
          
          switch (eventType) {
            case 'chunk':
              const contentChunk = event.content || '';
              accumulatedContent += contentChunk;
              
              // Check for multi-file markers
              if (accumulatedContent.includes('NEW_FILE_START') || accumulatedContent.includes('UPDATE_FILE_START')) {
                isMultiFile = true;
                
                // Parse current file from accumulated content
                const fileStartMatch = accumulatedContent.match(/(?:NEW_FILE_START|UPDATE_FILE_START): ([\w.-]+)/);
                if (fileStartMatch && fileStartMatch[1] !== currentFileName) {
                  // Starting a new file
                  if (currentFileName && currentFiles.has(currentFileName)) {
                    // Mark previous file as complete
                    const prevFile = currentFiles.get(currentFileName)!;
                    currentFiles.set(currentFileName, { ...prevFile, isComplete: true });
                  }
                  
                  currentFileName = fileStartMatch[1];
                  const extension = currentFileName.split('.').pop()?.toLowerCase();
                  let language: 'html' | 'css' | 'javascript' | 'unknown' = 'unknown';
                  
                  if (extension === 'html') language = 'html';
                  else if (extension === 'css') language = 'css';
                  else if (extension === 'js') language = 'javascript';
                  
                  currentFiles.set(currentFileName, {
                    name: currentFileName,
                    content: '',
                    language,
                    isComplete: false
                  });
                }
                
                // Extract content for current file
                if (currentFileName) {
                  const fileStartRegex = new RegExp(`(?:NEW_FILE_START|UPDATE_FILE_START): ${currentFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)(?:(?:NEW_FILE_END|UPDATE_FILE_END)|$)`);
                  const fileMatch = accumulatedContent.match(fileStartRegex);
                  
                  if (fileMatch && fileMatch[1]) {
                    const file = currentFiles.get(currentFileName)!;
                    currentFiles.set(currentFileName, {
                      ...file,
                      content: fileMatch[1]
                    });
                  }
                }
                
                updateFilesRealtime();
              } else if (!isMultiFile) {
                // Single file mode - treat as HTML
                if (!currentFiles.has('index.html')) {
                  currentFiles.set('index.html', {
                    name: 'index.html',
                    content: '',
                    language: 'html',
                    isComplete: false
                  });
                  currentFileName = 'index.html';
                }
                
                const file = currentFiles.get('index.html')!;
                currentFiles.set('index.html', {
                  ...file,
                  content: accumulatedContent
                });
                
                updateFilesRealtime();
              }
              break;
              
            case 'complete':
              // Mark all files as complete (remove cursors)
              currentFiles.forEach((file, name) => {
                currentFiles.set(name, { ...file, isComplete: true });
              });
              updateFilesRealtime();
              
              // Update token usage
              if (event.tokenCount || event.stats?.tokens) {
                const tokens = event.tokenCount || event.stats?.tokens || 0;
                setTokenUsage(prev => prev + tokens);
              }
              if (event.generationCount) {
                setGenerationCount(event.generationCount);
              }
              
              eventSource.close();
              setIsGenerating(false);
              
              toast({
                title: "Success",
                description: "Generation completed successfully"
              });
              break;
              
            case 'error':
              console.error('Stream error:', event.message);
              eventSource.close();
              setIsGenerating(false);
              
              toast({
                title: "Error",
                description: event.message || "Generation failed",
                variant: "destructive"
              });
              break;
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
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">DeepSite IDE</h1>
          {project && (
            <span className="text-sm text-muted-foreground">
              {project.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isGenerating && (
            <GenerationStatus 
              status={["Generating..."]}
              onStop={handleStopGeneration}
            />
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProject}
            disabled={!project || project.files.length === 0}
            data-testid="button-download-project"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          {project && project.files.length > 0 && (
            <DeployButton 
              html={getFileByName('index.html')?.content || ''}
              css={getFileByName('styles.css')?.content}
              projectId={project.id ? parseInt(project.id) : null}
            />
          )}
          
          <UserProfile />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 border-r flex flex-col">
            <FileBrowser className="flex-1 overflow-auto" />
            
            {/* Prompt Input */}
            <div className="p-4 border-t">
              <Textarea
                placeholder={project && project.prompts.length > 0 
                  ? "Enter a follow-up prompt to modify the project..." 
                  : "Describe what you want to build..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleGenerate();
                  }
                }}
                className="min-h-[100px] resize-none mb-2"
                disabled={isGenerating}
                data-testid="input-prompt"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={isGenerating ? handleStopGeneration : handleGenerate}
                  disabled={!prompt.trim() && !isGenerating}
                  className="flex-1"
                  variant={isGenerating ? "destructive" : "default"}
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>Stop Generation</>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => createNewProject()}
                  title="New Project"
                  data-testid="button-new-project"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
          data-testid="button-toggle-sidebar"
        >
          {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </Button>

        {/* Editor and Preview */}
        <div className="flex-1 flex flex-col">
          <EditorTabs />
          
          <div className="flex-1 flex overflow-hidden">
            {/* Code Editor */}
            <div className={cn(
              "flex-1 flex flex-col",
              showPreview && "border-r"
            )}>
              <MultiFileEditor 
                className="flex-1"
                onRunCode={() => setShowPreview(true)}
              />
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="flex-1 flex flex-col">
                <div className="px-4 py-2 border-b flex items-center justify-between bg-background">
                  <span className="text-sm font-medium">Preview</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                    data-testid="button-hide-preview"
                  >
                    <EyeOff className="w-4 h-4" />
                  </Button>
                </div>
                
                <iframe
                  ref={previewRef}
                  className="flex-1 w-full bg-white"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                  title="Preview"
                  data-testid="iframe-preview"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};