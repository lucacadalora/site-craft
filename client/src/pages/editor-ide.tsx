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
  PanelLeftOpen,
  X,
  Files
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
  const [showFileExplorer, setShowFileExplorer] = useState(false);
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
    const cssFile = getFileByName('style.css');
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
                  content: stripCursor(file.content)
                });
              });
              incompleteFiles.clear(); // Clear all incomplete markers
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
          
          // Try to parse accumulated content using the enhanced parser
          try {
            const parsed = processAiResponse(accumulatedContent);
            
            if (parsed.projectName) {
              projectName = parsed.projectName;
              isMultiFile = true;
            }
            
            if (parsed.files.length > 0) {
              isMultiFile = true;
              
              // Get existing files for search/replace operations
              const existingFilesArray = Array.from(currentFiles.values());
              
              // Convert parsed files to project files with search/replace support
              const newFiles = convertToProjectFiles(parsed.files, existingFilesArray);
              
              // Merge new files with existing ones
              const mergedFiles = new Map(currentFiles);
              
              for (const file of newFiles) {
                // Update or add each file
                mergedFiles.set(file.name, file);
                incompleteFiles.add(file.name); // Mark as incomplete during streaming
              }
              
              currentFiles = mergedFiles;
              updateFilesRealtime();
            } else if (!isMultiFile && (accumulatedContent.includes('<!DOCTYPE html') || accumulatedContent.includes('<html'))) {
              // Fallback: Single file mode - treat as HTML
              if (!currentFiles.has('index.html')) {
                currentFiles.set('index.html', {
                  name: 'index.html',
                  content: '',
                  language: 'html'
                });
                incompleteFiles.add('index.html'); // Mark as incomplete
              }
              
              const file = currentFiles.get('index.html')!;
              currentFiles.set('index.html', {
                ...file,
                content: accumulatedContent
              });
              
              updateFilesRealtime();
            }
          } catch (parseError) {
            // If parsing fails during streaming, continue accumulating
            // This is normal as content builds up progressively
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
      <header className="border-b px-4 py-2 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">DeepSite</h1>
          {project && (
            <span className="text-sm text-gray-400">
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
          {/* Code Editor - 20% width */}
          <div className="w-[20%] min-w-[300px] bg-[#1e1e1e] flex flex-col border-r border-gray-800">
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
          <div className="flex-1 bg-white">
            <iframe
              ref={previewRef}
              className="w-full h-full"
              sandbox="allow-scripts allow-forms allow-same-origin"
              title="Preview"
              data-testid="iframe-preview"
            />
          </div>

          {/* Prompt Input - Bottom Left Corner */}
          <div className="absolute bottom-0 left-0 w-[300px] p-4 bg-[#1e1e1e]/95 backdrop-blur-sm border-t border-r border-gray-800 z-30">
            <Textarea
              placeholder="Ask DeepSite anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleGenerate();
                }
              }}
              className="min-h-[80px] resize-none mb-2 bg-[#2d2d30] border-gray-700 text-gray-100 placeholder:text-gray-400 text-sm"
              disabled={isGenerating}
              data-testid="input-prompt"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={isGenerating ? handleStopGeneration : handleGenerate}
                disabled={!prompt.trim() && !isGenerating}
                size="sm"
                className="flex-1"
                variant={isGenerating ? "destructive" : "default"}
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>Stop</>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => createNewProject()}
                title="New Project"
                className="bg-transparent border-gray-700 hover:bg-gray-800 px-2"
                data-testid="button-new-project"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};