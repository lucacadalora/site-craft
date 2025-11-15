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
      
      // Prepare the request body
      const requestBody = {
        prompt,
        apiConfig: {
          ...initialApiConfig,
          useMultiFile: true
        },
        // Include existing files for follow-up prompts
        ...(isFollowUp && {
          existingFiles: project.files,
          previousPrompts: project.prompts
        })
      };

      // Create EventSource for SSE streaming
      const response = await fetch('/api/sambanova/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let currentFiles: ProjectFile[] = [];
      let isMultiFile = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.event === 'chunk') {
                accumulatedContent += data.content || '';
                
                // Check if we're in multi-file mode
                if (data.isMultiFile !== undefined) {
                  isMultiFile = data.isMultiFile;
                }
                
                // Try to parse accumulated content for files
                if (isMultiFile && accumulatedContent.includes('NEW_FILE_END')) {
                  const parsed = processAiResponse(accumulatedContent);
                  if (parsed.files.length > 0) {
                    const files = convertToProjectFiles(parsed.files);
                    currentFiles = files;
                    setProjectFiles(files);
                  }
                }
              } else if (data.event === 'complete') {
                // Final parsing of all content
                if (isMultiFile) {
                  const parsed = processAiResponse(accumulatedContent);
                  if (parsed.files.length > 0) {
                    const files = convertToProjectFiles(parsed.files);
                    setProjectFiles(files);
                  }
                } else {
                  // Single file mode - create index.html
                  setProjectFiles([{
                    name: 'index.html',
                    content: data.html || accumulatedContent,
                    language: 'html'
                  }]);
                }
                
                // Update token usage
                if (data.tokenUsage) {
                  setTokenUsage(prev => prev + data.tokenUsage);
                }
                if (data.generationCount) {
                  setGenerationCount(data.generationCount);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
      
      toast({
        title: "Success",
        description: "Generation completed successfully"
      });
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Generation Stopped",
          description: "Generation was stopped by user",
        });
      } else {
        console.error('Generation error:', error);
        toast({
          title: "Error",
          description: "Failed to generate content",
          variant: "destructive"
        });
      }
    } finally {
      setIsGenerating(false);
      streamControllerRef.current = null;
      setPrompt('');
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