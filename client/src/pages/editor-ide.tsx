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
          content: f.isComplete ? stripCursor(f.content) : addCursor(stripCursor(f.content)),
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
          const prevFile = currentFiles.get(currentFileName)!;
          currentFiles.set(currentFileName, { ...prevFile, isComplete: true });
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
          language,
          isComplete: false
        });
        
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
                content: stripCursor(file.content),
                isComplete: true 
              });
            });
            updateFilesRealtime();
            setIsGenerating(false);
            eventSource.close();
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
              // Mark all files as complete and remove cursors
              currentFiles.forEach((file, name) => {
                currentFiles.set(name, { 
                  ...file, 
                  content: stripCursor(file.content),
                  isComplete: true 
                });
              });
              updateFilesRealtime();
              setIsGenerating(false);
              eventSource.close();
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
              
              // Parse the content using a state machine approach
              // Look for markers: PROJECT_NAME_START/END, NEW_FILE_START/END
              
              // Check for project name
              if (accumulatedContent.includes('<<<<<<< PROJECT_NAME_START')) {
                isMultiFile = true;
                const projectMatch = accumulatedContent.match(/<<<<<<< PROJECT_NAME_START\s*(.*?)\s*>>>>>>> PROJECT_NAME_END/);
                if (projectMatch) {
                  projectName = projectMatch[1];
                  parsingState = 'file_start';
                }
              }
              
              // Check for file markers (with spaces as defined in prompts.ts)
              // NEW_FILE_START = "<<<<<<< NEW_FILE_START "
              // NEW_FILE_END = " >>>>>>> NEW_FILE_END"
              if (isMultiFile) {
                // Process files sequentially
                let processBuffer = accumulatedContent;
                
                // Look for new file start markers
                const fileStartPattern = /<<<<<<< NEW_FILE_START\s+([\w.-]+)\s+>>>>>>> NEW_FILE_END/;
                const fileMatch = processBuffer.match(fileStartPattern);
                
                if (fileMatch) {
                  const fileName = fileMatch[1];
                  const markerEndIdx = fileMatch.index! + fileMatch[0].length;
                  
                  // Start the new file
                  if (fileName !== currentFileName) {
                    startNewFile(fileName);
                  }
                  
                  // Look for code block after this marker
                  const afterMarker = processBuffer.slice(markerEndIdx);
                  
                  // Check if we have a complete code block
                  const codeBlockRegex = /```(?:html|css|javascript)?\n([\s\S]*?)```/;
                  const codeMatch = afterMarker.match(codeBlockRegex);
                  
                  if (codeMatch) {
                    // Complete code block found
                    const fileContent = codeMatch[1];
                    const file = currentFiles.get(fileName);
                    if (file) {
                      currentFiles.set(fileName, {
                        ...file,
                        content: fileContent,
                        isComplete: false // Will be marked complete when next file starts
                      });
                    }
                  } else {
                    // Incomplete code block - extract partial content
                    const partialRegex = /```(?:html|css|javascript)?\n([\s\S]*)/;
                    const partialMatch = afterMarker.match(partialRegex);
                    
                    if (partialMatch) {
                      const partialContent = partialMatch[1];
                      const file = currentFiles.get(fileName);
                      if (file) {
                        currentFiles.set(fileName, {
                          ...file,
                          content: partialContent,
                          isComplete: false
                        });
                      }
                    }
                  }
                }
                
                updateFilesRealtime();
              } else if (accumulatedContent.includes('<!DOCTYPE html') || accumulatedContent.includes('<html')) {
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