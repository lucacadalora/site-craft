import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { VersionHistory } from '@/components/VersionHistory';
import { History } from '@/components/History';
import { MediaFilesManager, getFileType } from '@/components/MediaFilesManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
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
  ChevronUp,
  Dices,
  Paintbrush,
  Crosshair,
  Code,
  XCircle,
  ArrowUp,
  Undo2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processAiResponse, convertToProjectFiles } from '@/lib/process-ai-response';
import { rewritePrompt } from '@/lib/rewrite-prompt';
import { EnhancedSettings } from '@shared/schema';
import { PROMPTS_FOR_AI, FOLLOW_UP_SYSTEM_PROMPT } from '@/lib/prompts';
import { queryClient } from '@/lib/queryClient';

interface EditorIDEProps {
  initialApiConfig?: any;
  onApiConfigChange?: (newConfig: any) => void;
  isDisposable?: boolean;
}

// Undo Button Component - Restores previous version
function UndoButton() {
  const { project, setProject } = useProject();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch versions for the current project - sorted descending (newest first)
  const { data: versions = [], refetch } = useQuery<any[]>({
    queryKey: [`/api/projects/${project?.id}/versions`],
    enabled: !!project?.id,
  });
  
  const handleUndo = async () => {
    if (!project?.id || versions.length < 2) {
      toast({
        title: "Nothing to undo",
        description: "No previous version available.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Versions are sorted descending: [newest, previous, older...]
      // versions[0] = current version, versions[1] = previous version
      const previousVersion = versions[1];
      
      console.log('[Undo] Restoring to version:', previousVersion.id, 'from', versions.length, 'versions');
      
      // Call the restore API
      const response = await fetch(`/api/projects/${project.id}/versions/${previousVersion.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Undo] Restore failed:', response.status, errorText);
        throw new Error('Failed to restore version');
      }
      
      // Parse files from the restored version
      const versionFiles = typeof previousVersion.files === 'string' 
        ? JSON.parse(previousVersion.files) 
        : previousVersion.files;
      
      console.log('[Undo] Restoring files:', versionFiles?.length || 0, 'files');
      
      // Update the project with the restored version's files
      setProject({
        ...project,
        files: versionFiles
      });
      
      // Invalidate and refetch versions to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/versions`] });
      await refetch();
      
      toast({
        title: "Undone",
        description: `Restored to version ${previousVersion.versionNumber}`,
        className: "bg-green-900 border-green-700 text-white"
      });
    } catch (error) {
      console.error('[Undo] Failed:', error);
      toast({
        title: "Undo failed",
        description: "Could not restore previous version.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Only show if there are at least 2 versions (something to undo to)
  if (!project?.id || versions.length < 2) {
    return null;
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleUndo}
      disabled={isLoading}
      className="h-8 px-3 text-xs gap-1.5 text-gray-300 hover:bg-gray-800"
      title="Undo last change"
      data-testid="button-undo"
    >
      <Undo2 className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
      <span>Undo</span>
    </Button>
  );
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
    openFile,
    createVersion,
    loadProjectVersions
  } = useProject();
  
  // Get URL parameters for disposable generation
  const [urlParams] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return {
        prompt: params.get('prompt') || '',
        model: params.get('model') || 'cerebras',
        enhance: params.get('enhance') === 'true',
        style: params.get('style') || 'default'
      };
    }
    return { prompt: '', model: 'cerebras', enhance: true, style: 'default' };
  });
  
  // UI State
  const [prompt, setPrompt] = useState(() => {
    if (urlParams.prompt) {
      try {
        return decodeURIComponent(urlParams.prompt);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);
  const [randomPromptLoading, setRandomPromptLoading] = useState(false);
  const [redesignUrl, setRedesignUrl] = useState('');
  const [redesignLoading, setRedesignLoading] = useState(false);
  const [redesignOpen, setRedesignOpen] = useState(false);
  
  // Edit mode state - allows users to click elements in preview to target them for AI edits
  const [isEditableModeEnabled, setIsEditableModeEnabled] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [redesignData, setRedesignData] = useState<{ markdown: string; url: string } | null>(() => {
    const storedRedesignData = sessionStorage.getItem('redesignData');
    if (storedRedesignData) {
      try {
        const parsed = JSON.parse(storedRedesignData);
        sessionStorage.removeItem('redesignData');
        return parsed;
      } catch {
        sessionStorage.removeItem('redesignData');
        return null;
      }
    }
    return null;
  });
  const [selectedModel, setSelectedModel] = useState(
    urlParams.model === 'sambanova' ? 'sambanova-deepseek-v3' :
    urlParams.model === 'cerebras' ? 'cerebras-glm-4.6' : 
    urlParams.model === 'gradient' ? 'gradient-qwen3-coder' : 'cerebras-glm-4.6'
  );
  
  // Media files state - for image/video/audio attachments
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Style preference with localStorage persistence, prioritizing URL param
  const [stylePreference, setStylePreferenceInternal] = useState<'default' | 'v1' | 'v2'>(() => {
    // If style is in URL params, use that (guest users from landing page)
    if (urlParams.style === 'v1') return 'v1';
    if (urlParams.style === 'v2') return 'v2';
    
    // Otherwise, check localStorage
    const savedStyle = localStorage.getItem('jatevo_style_preference');
    return (savedStyle === 'v1' || savedStyle === 'v2') ? savedStyle as 'v1' | 'v2' : 'default';
  });
  
  // Wrapper to save to localStorage whenever style changes
  const setStylePreference = (value: 'default' | 'v1' | 'v2') => {
    localStorage.setItem('jatevo_style_preference', value);
    console.log('Style preference changed to:', value);
    setStylePreferenceInternal(value);
  };
  
  // Enhanced Settings with localStorage persistence, prioritizing URL param
  const [enhancedSettings, setEnhancedSettings] = useState<EnhancedSettings>(() => {
    // If enhance is in URL params, use that (guest users from landing page)
    if (urlParams.prompt && typeof urlParams.enhance !== 'undefined') {
      return { isActive: urlParams.enhance };
    }
    
    // Otherwise, check localStorage
    const saved = localStorage.getItem('enhanced_settings');
    return saved ? JSON.parse(saved) : { isActive: true };
  });
  
  // Store previous enhance state to restore when switching from v1 back to default
  const [previousEnhanceState, setPreviousEnhanceState] = useState(enhancedSettings.isActive);
  
  // Persist enhancedSettings to localStorage
  useEffect(() => {
    localStorage.setItem('enhanced_settings', JSON.stringify(enhancedSettings));
  }, [enhancedSettings]);
  
  // Save style preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('jatevo_style_preference', stylePreference);
  }, [stylePreference]);
  
  // Auto-disable enhance when v1 experimental or v2 mobile style is selected
  // v1 and v2 have their own comprehensive prompt instructions that conflict with enhancement
  useEffect(() => {
    if (stylePreference === 'v1' || stylePreference === 'v2') {
      // Save current enhance state before disabling
      if (enhancedSettings.isActive) {
        setPreviousEnhanceState(true);
      }
      setEnhancedSettings({ isActive: false });
    } else if (stylePreference === 'default') {
      // Restore previous enhance state when switching back to default
      setEnhancedSettings({ isActive: previousEnhanceState });
    }
  }, [stylePreference]);
  
  // Refs
  const previewRef = useRef<HTMLIFrameElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);

  // Handle element selection in edit mode
  useEffect(() => {
    if (!previewRef.current?.contentDocument) return;
    
    const iframeDocument = previewRef.current.contentDocument;
    
    const handleMouseOver = (event: MouseEvent) => {
      if (!isEditableModeEnabled) return;
      
      const targetElement = event.target as HTMLElement;
      if (targetElement === iframeDocument.body || targetElement === iframeDocument.documentElement) return;
      
      // Remove previous hover styling
      if (hoveredElementRef.current && hoveredElementRef.current !== targetElement) {
        hoveredElementRef.current.classList.remove('jatevo-hovered-element');
      }
      
      // Add hover styling to new element
      targetElement.classList.add('jatevo-hovered-element');
      hoveredElementRef.current = targetElement;
    };
    
    const handleMouseOut = (event: MouseEvent) => {
      if (!isEditableModeEnabled) return;
      
      const targetElement = event.target as HTMLElement;
      targetElement.classList.remove('jatevo-hovered-element');
    };
    
    const handleClick = (event: MouseEvent) => {
      if (!isEditableModeEnabled) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      const targetElement = event.target as HTMLElement;
      if (targetElement === iframeDocument.body || targetElement === iframeDocument.documentElement) return;
      
      // Remove hover class and add selected class
      targetElement.classList.remove('jatevo-hovered-element');
      
      // Remove selected class from previously selected element
      if (selectedElement) {
        selectedElement.classList.remove('jatevo-selected-element');
      }
      
      targetElement.classList.add('jatevo-selected-element');
      setSelectedElement(targetElement);
      setIsEditableModeEnabled(false);
    };
    
    if (isEditableModeEnabled) {
      iframeDocument.addEventListener('mouseover', handleMouseOver);
      iframeDocument.addEventListener('mouseout', handleMouseOut);
      iframeDocument.addEventListener('click', handleClick, true);
    }
    
    return () => {
      iframeDocument.removeEventListener('mouseover', handleMouseOver);
      iframeDocument.removeEventListener('mouseout', handleMouseOut);
      iframeDocument.removeEventListener('click', handleClick, true);
      
      // Clean up hover styling
      if (hoveredElementRef.current) {
        hoveredElementRef.current.classList.remove('jatevo-hovered-element');
        hoveredElementRef.current = null;
      }
    };
  }, [isEditableModeEnabled, previewRef.current?.contentDocument, selectedElement]);

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

  // Load project versions when project changes
  useEffect(() => {
    const loadVersions = async () => {
      if (project?.id) {
        try {
          await loadProjectVersions(project.id);
          console.log('Loaded version history for project:', project.id);
        } catch (error) {
          console.error('Failed to load version history:', error);
          // Non-critical, continue without version history
        }
      }
    };
    
    loadVersions();
  }, [project?.id, loadProjectVersions]);

  // Load media files when project changes
  useEffect(() => {
    const loadMediaFiles = async () => {
      if (project?.id) {
        try {
          const response = await fetch(`/api/projects/${project.id}/media`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setMediaFiles(data.files || []);
          }
        } catch (error) {
          console.error('Failed to load media files:', error);
        }
      } else {
        setMediaFiles([]);
        setSelectedMediaFiles([]);
      }
    };
    
    loadMediaFiles();
  }, [project?.id]);

  // Handle media file upload
  const handleMediaUpload = async (files: FileList) => {
    if (!project?.id || files.length === 0) return;
    
    setIsUploadingMedia(true);
    
    try {
      const filePromises = Array.from(files).map((file) => {
        return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              data: reader.result as string
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
          reader.readAsDataURL(file);
        });
      });
      
      const fileData = await Promise.all(filePromises);
      
      const response = await fetch(`/api/projects/${project.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ files: fileData })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload media files');
      }
      
      const data = await response.json();
      
      // Add new files to state
      setMediaFiles(prev => [...prev, ...data.uploadedFiles]);
      
      toast({
        title: "Media uploaded",
        description: `Successfully uploaded ${files.length} file(s)`,
        className: "bg-green-900 border-green-700 text-white"
      });
    } catch (error) {
      console.error('Failed to upload media files:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload media files",
        variant: "destructive"
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Handle messages from iframe for navigation (v3 approach)
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Only handle messages from our iframe
      if (!previewRef.current || event.source !== previewRef.current.contentWindow) {
        return;
      }

      const { type, targetFile, href, external, notFound } = event.data;

      if (type === 'preview-navigation') {
        // Handle internal navigation by updating the active file
        const htmlFile = project?.files.find(f => f.name === targetFile);
        if (htmlFile) {
          // Simply switch to the target HTML file in the editor
          openFile(targetFile);
          toast({
            title: "Navigation",
            description: `Switched to ${targetFile}`,
          });
        }
      } else if (type === 'preview-link-click') {
        if (external) {
          toast({
            title: "External Link",
            description: `External navigation disabled in preview: ${href}`,
          });
        } else if (notFound) {
          toast({
            title: "Page Not Found",
            description: `Page "${href}" doesn't exist in this project`,
            variant: "destructive"
          });
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [project, openFile]);

  // Detect if code contains React/JSX - STRICT detection to avoid false positives
  // Only detect React if there are actual React imports or explicit React API usage
  const detectReact = (code: string): boolean => {
    // Primary indicators: Must have React imports or explicit React API calls
    const hasReactImport = /from\s+['"]react['"]/.test(code);
    const hasReactDOM = /ReactDOM\.(render|createRoot)/.test(code);
    const hasReactAPI = /React\.(createElement|Component|Fragment)/.test(code);
    
    // Secondary indicators: React hooks (but only if found with other context)
    const hasReactHooks = /(useState|useEffect|useRef|useMemo|useCallback)\s*\(/.test(code);
    
    // Must have primary indicator OR (hooks + JSX syntax together)
    const hasJSXWithHooks = hasReactHooks && /<[A-Z][a-zA-Z]*[\s>\/]/.test(code);
    
    // Require strong evidence of React
    return hasReactImport || hasReactDOM || hasReactAPI || hasJSXWithHooks;
  };
  
  // Ref to maintain last successful React render to handle transient empty states
  const lastReactSnapshotRef = useRef<{ html: string; fileHash: string } | null>(null);
  
  // Memoize derived file arrays to prevent unnecessary re-renders
  const jsFiles = useMemo(() => 
    project?.files.filter(f => 
      f.name.endsWith('.js') || 
      f.name.endsWith('.jsx') || 
      f.name.endsWith('.tsx') || 
      f.name.endsWith('.ts')
    ) || [],
  [project?.files]);
  
  const cssFiles = useMemo(() => 
    project?.files.filter(f => f.name.endsWith('.css')) || [],
  [project?.files]);

  // Detect libraries from imports
  const detectLibraries = (code: string): Set<string> => {
    const libraries = new Set<string>();
    const importRegex = /import\s+(?:[\s\S]*?)from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      const lib = match[1];
      
      // Map common library imports to their CDN requirements
      if (lib.includes('react-router') || lib.includes('wouter')) {
        libraries.add('react-router');
      }
      if (lib.includes('@mui/material') || lib.includes('@material-ui')) {
        libraries.add('material-ui');
      }
      if (lib.includes('antd')) {
        libraries.add('antd');
      }
      if (lib.includes('axios')) {
        libraries.add('axios');
      }
      if (lib.includes('lodash')) {
        libraries.add('lodash');
      }
      if (lib.includes('date-fns')) {
        libraries.add('date-fns');
      }
      if (lib.includes('moment')) {
        libraries.add('moment');
      }
      if (lib.includes('framer-motion')) {
        libraries.add('framer-motion');
      }
      if (lib.includes('recharts')) {
        libraries.add('recharts');
      }
      if (lib.includes('chart.js')) {
        libraries.add('chartjs');
      }
      if (lib.includes('three')) {
        libraries.add('threejs');
      }
      if (lib.includes('@emotion') || lib.includes('styled-components')) {
        libraries.add('styled-components');
      }
    }
    
    return libraries;
  };
  
  // Generate CDN links for detected libraries
  const generateLibraryCDNs = (libraries: Set<string>): string => {
    let cdnLinks = '';
    
    const cdnMap: Record<string, string> = {
      'react-router': `
  <!-- React Router -->
  <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>`,
      'material-ui': `
  <!-- Material-UI -->
  <script crossorigin src="https://unpkg.com/@mui/material@latest/umd/material-ui.production.min.js"></script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />`,
      'antd': `
  <!-- Ant Design -->
  <script crossorigin src="https://unpkg.com/antd@5/dist/antd.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/antd@5/dist/reset.css" />`,
      'axios': `
  <!-- Axios -->
  <script src="https://unpkg.com/axios/dist/axios.min.js"></script>`,
      'lodash': `
  <!-- Lodash -->
  <script src="https://unpkg.com/lodash@4/lodash.min.js"></script>`,
      'date-fns': `
  <!-- Date-fns -->
  <script src="https://unpkg.com/date-fns@2/index.js"></script>`,
      'moment': `
  <!-- Moment.js -->
  <script src="https://unpkg.com/moment@2/moment.min.js"></script>`,
      'framer-motion': `
  <!-- Framer Motion -->
  <script crossorigin src="https://unpkg.com/framer-motion@10/dist/framer-motion.js"></script>`,
      'recharts': `
  <!-- Recharts -->
  <script crossorigin src="https://unpkg.com/recharts@2/dist/Recharts.js"></script>`,
      'chartjs': `
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`,
      'threejs': `
  <!-- Three.js -->
  <script src="https://unpkg.com/three@0.150.0/build/three.min.js"></script>`,
      'styled-components': `
  <!-- Styled Components -->
  <script crossorigin src="https://unpkg.com/styled-components@5/dist/styled-components.min.js"></script>`
    };
    
    libraries.forEach(lib => {
      if (cdnMap[lib]) {
        cdnLinks += cdnMap[lib];
      }
    });
    
    return cdnLinks;
  };

  // Generate React-compatible HTML wrapper
  const generateReactHTML = (jsCode: string, cssCode: string, exportedNames: string[] = []): string => {
    // Detect what libraries are needed
    const detectedLibraries = detectLibraries(jsCode);
    const additionalCDNs = generateLibraryCDNs(detectedLibraries);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  
  <!-- React and ReactDOM from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  
  <!-- Babel Standalone for JSX transformation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <!-- Lucide React Icons (if needed) -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  
  <!-- Tailwind CSS for styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  ${additionalCDNs}
  
  <style>
    ${cssCode}
    
    /* Base styles for React apps */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    #root {
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    // Make Lucide icons available globally if used
    if (typeof lucide !== 'undefined') {
      const icons = lucide.icons;
      
      // Create React components for Lucide icons
      window.LucideIcons = {};
      Object.keys(icons).forEach(name => {
        const iconData = icons[name];
        window.LucideIcons[name] = (props) => {
          return React.createElement('svg', {
            ...props,
            xmlns: 'http://www.w3.org/2000/svg',
            width: props.size || 24,
            height: props.size || 24,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: props.strokeWidth || 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            dangerouslySetInnerHTML: { __html: iconData }
          });
        };
      });
      
      // Map common Lucide React imports to window.LucideIcons
      const iconNames = [
        'ArrowRight', 'TrendingUp', 'Activity', 'Globe', 'Shield', 'Zap',
        'BarChart3', 'PieChart', 'Layers', 'Menu', 'X', 'ChevronRight', 
        'ChevronDown', 'Briefcase', 'Landmark', 'Cpu', 'ArrowUpRight',
        'MousePointer2', 'Check', 'ChevronLeft', 'Search', 'Settings',
        'User', 'Users', 'Home', 'FileText', 'Calendar', 'Mail', 'Phone'
      ];
      
      iconNames.forEach(name => {
        if (window.LucideIcons[name]) {
          window[name] = window.LucideIcons[name];
        }
      });
    }
    
    // Import React hooks and utilities into global scope
    const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer, useLayoutEffect, memo, forwardRef, createContext } = React;
    
    // Make Fragment available for JSX fragments <> </>
    const Fragment = React.Fragment;
    
    // Inject the user's code
    ${jsCode}
    
    // Expose tracked exported components to window for auto-detection
    // This ensures const/arrow components are findable
    ${exportedNames.map(name => `
    try {
      if (typeof ${name} !== 'undefined') {
        window.${name} = ${name};
        console.log('[React Preview] Exposed component:', '${name}');
      }
    } catch (e) { /* Component not defined */ }
    `).join('')}
    
    // Auto-detect and render the main component
    (function() {
      console.log('[React Preview] Starting component auto-detection...');
      
      let MainComponent = null;
      
      // UNIVERSAL APPROACH: Scan the entire window object for React components
      // This works with ANY export pattern or component name
      const allWindowKeys = Object.keys(window);
      console.log('[React Preview] Total window keys:', allWindowKeys.length);
      
      // Filter to potential component candidates (uppercase first letter)
      const potentialComponents = allWindowKeys.filter(key => {
        try {
          return typeof window[key] === 'function' && 
                 key[0] === key[0].toUpperCase() &&
                 key !== 'React' && 
                 key !== 'ReactDOM' &&
                 key !== 'Babel' &&
                 key !== 'Fragment' &&
                 !key.startsWith('Lucide') &&
                 !key.includes('Icon') &&
                 !key.startsWith('use') &&
                 !key.startsWith('HTML') &&
                 !key.startsWith('SVG') &&
                 !key.startsWith('Audio') &&
                 !key.startsWith('Video');
        } catch (e) {
          return false;
        }
      });
      
      console.log('[React Preview] Found potential components:', potentialComponents);
      
      // Priority order: Try exported names first, then common names, then everything else
      const exportedNames = ${JSON.stringify(exportedNames)};
      const commonNames = ['App', 'Main', 'Root', 'Component'];
      
      // Build priority list
      const priorityList = [
        ...exportedNames,
        ...commonNames,
        ...potentialComponents.filter(name => !exportedNames.includes(name) && !commonNames.includes(name))
      ];
      
      console.log('[React Preview] Priority search order:', priorityList);
      
      // Try each candidate in order
      for (const name of priorityList) {
        if (typeof window[name] === 'function') {
          const candidate = window[name];
          
          try {
            // Quick validation: check if function looks like it returns JSX
            const fnString = candidate.toString();
            const looksLikeComponent = 
              fnString.includes('return') && 
              (fnString.includes('React.createElement') || 
               fnString.includes('jsx') ||
               fnString.includes('<') && fnString.includes('>'));
            
            if (looksLikeComponent) {
              MainComponent = candidate;
              console.log('[React Preview] ✓ Selected component:', name);
              break;
            }
          } catch (e) {
            console.log('[React Preview] ✗ Skipped', name, '- not a valid component');
          }
        }
      }
      
      // Last resort: check if there's a direct function that returns JSX
      if (!MainComponent && typeof App !== 'undefined') {
        MainComponent = App;
      }
      
      if (MainComponent) {
        try {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(MainComponent));
          console.log('React app rendered successfully');
        } catch (error) {
          console.error('Error rendering React component:', error);
          document.getElementById('root').innerHTML = \`
            <div style="padding: 20px; font-family: monospace; color: red;">
              <h2>React Render Error</h2>
              <p>\${error.message}</p>
              <pre style="background: #f0f0f0; padding: 10px; color: #333; overflow: auto;">
\${error.stack}
              </pre>
            </div>
          \`;
        }
      } else {
        console.error('No React component found to render');
        // Show helpful error in the DOM
        document.getElementById('root').innerHTML = \`
          <div style="padding: 20px; font-family: monospace; color: red;">
            <h2>React Component Not Found</h2>
            <p>Please ensure your React component is defined properly.</p>
            <p>Example:</p>
            <pre style="background: #f0f0f0; padding: 10px; color: #333;">
function App() {
  return <div>Hello World</div>;
}

// or

const App = () => {
  return <div>Hello World</div>;
};
            </pre>
          </div>
        \`;
      }
    })();
  </script>
</body>
</html>`;
  };

  // Update preview when active file changes
  useEffect(() => {
    if (!project || !previewRef.current) return;
    
    // Create a file hash to detect real changes
    const fileHash = JSON.stringify({
      jsFiles: jsFiles.map(f => ({ name: f.name, content: f.content })),
      cssFiles: cssFiles.map(f => ({ name: f.name, content: f.content }))
    });
    
    // Guard against transient empty states (React StrictMode double-execution)
    if (jsFiles.length === 0 && cssFiles.length === 0 && lastReactSnapshotRef.current) {
      // Don't update preview - keep the last successful React render
      return;
    }
    
    // Check if this is a React project - PRIORITIZE React over HTML
    // Even if there's an index.html, if we detect React code, use React preview
    const allJsCode = jsFiles.map(f => f.content).join('\n');
    const isReactProject = jsFiles.length > 0 && detectReact(allJsCode);
    
    if (isReactProject) {
      // Handle React project
      let combinedCss = '';
      cssFiles.forEach(cssFile => {
        combinedCss += `\n/* ${cssFile.name} */\n${cssFile.content}\n`;
      });
      
      // Combine all JS/JSX files
      let combinedJs = '';
      
      // Track ALL exported component names across all files
      const allExportedNames: string[] = [];
      
      // Sort to ensure proper load order
      const componentFiles = jsFiles.filter(f => 
        f.name.includes('component') || 
        f.name.includes('Component') ||
        f.name.startsWith('components/')
      );
      const otherJsFiles = jsFiles.filter(f => !componentFiles.includes(f));
      
      // Add components first
      componentFiles.forEach(jsFile => {
        combinedJs += `\n// ${jsFile.name}\n${jsFile.content}\n`;
      });
      
      // Add other files
      otherJsFiles.forEach(jsFile => {
        // Process the content more carefully to preserve component structure
        let content = jsFile.content;
        
        // Strip TypeScript type annotations if present
        if (jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.ts')) {
          // Remove type imports
          content = content.replace(/^import\s+type\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
          // Remove interface declarations
          content = content.replace(/^interface\s+\w+\s*{[^}]*}/gm, '');
          // Remove type aliases
          content = content.replace(/^type\s+\w+\s*=\s*[^;]+;/gm, '');
          // Remove type annotations from parameters and variables
          content = content.replace(/:\s*[\w\[\]<>,\s|&{}]+(?=[,\)])/g, '');
          content = content.replace(/:\s*[\w\[\]<>,\s|&{}]+(?=\s*[=;])/g, '');
          // Remove generic type parameters
          content = content.replace(/<[\w\s,]+>(?=\()/g, '');
          // Remove 'as' type assertions
          content = content.replace(/\s+as\s+[\w\[\]<>,\s|&{}]+/g, '');
        }
        
        // Remove ES6 module imports (they'll be replaced with globals)
        content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
        
        // Track exported component names for auto-detection priority
        const exportedNames: string[] = [];
        
        // Handle various export patterns - SIMPLIFIED APPROACH
        // Just strip exports and track names, auto-detection will find components
        
        // export default function ComponentName() {...}
        content = content.replace(/^export\s+default\s+function\s+(\w+)/gm, (match, name) => {
          exportedNames.push(name);
          return `function ${name}`;
        });
        
        // export default class ComponentName {...}
        content = content.replace(/^export\s+default\s+class\s+(\w+)/gm, (match, name) => {
          exportedNames.push(name);
          return `class ${name}`;
        });
        
        // export default const ComponentName = 
        content = content.replace(/^export\s+default\s+const\s+(\w+)/gm, (match, name) => {
          exportedNames.push(name);
          return `const ${name}`;
        });
        
        // const Component = () => {}; export default Component;
        content = content.replace(/^export\s+default\s+(\w+);?\s*$/gm, (match, name) => {
          exportedNames.push(name);
          return `// ${name} is exported`;
        });
        
        // export default () => {} or export default {...}
        content = content.replace(/^export\s+default\s+(\(|{)/gm, (match, bracket) => {
          exportedNames.push('App');
          return `const App = ${bracket}`;
        });
        
        // Handle remaining export default  
        content = content.replace(/^export\s+default\s+/gm, () => {
          exportedNames.push('App');
          return 'const App = ';
        });
        
        // Handle named exports - CAPTURE NAMES FIRST
        // export const/let/var ComponentName = ... or export [async] function ComponentName() ...
        content = content.replace(/^export\s+(?:async\s+)?(const|let|var|function|class)\s+(\w+)/gm, (match, keyword, name) => {
          // Only track capitalized names (likely components)
          if (name[0] === name[0].toUpperCase()) {
            exportedNames.push(name);
          }
          // Preserve async keyword if it was present
          const hasAsync = match.includes('async');
          return hasAsync ? `async ${keyword} ${name}` : `${keyword} ${name}`;
        });
        
        // export { ComponentName, AnotherComponent, default as App }
        content = content.replace(/^export\s+{([^}]+)}(?:\s+from\s+['"][^'"]+['"])?[^;]*;?\s*$/gm, (match: string, names: string) => {
          // Extract individual names, handling aliases
          const nameList = names.split(',').map((n: string) => n.trim());
          nameList.forEach((item: string) => {
            // Handle "Foo as Bar" or "default as App" - we want the alias (Bar/App)
            const parts = item.split(/\s+as\s+/);
            const exportedName = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            if (exportedName && exportedName[0] === exportedName[0].toUpperCase()) {
              exportedNames.push(exportedName);
            }
          });
          return ''; // Remove the export statement
        });
        
        // Add to global tracking for auto-detection priority
        if (exportedNames.length > 0) {
          allExportedNames.push(...exportedNames);
        }
        
        // Handle module.exports (CommonJS)
        content = content.replace(/^module\.exports\s*=\s*/gm, 'const App = ');
        content = content.replace(/^exports\.\w+\s*=\s*/gm, '');
        
        combinedJs += `\n// ${jsFile.name}\n${content}\n`;
      });
      
      // Generate React-compatible HTML with dynamic component names
      const reactHtml = generateReactHTML(combinedJs, combinedCss, allExportedNames);
      
      // Store successful React render for future guard
      lastReactSnapshotRef.current = {
        html: reactHtml,
        fileHash: fileHash
      };
      
      // Set the preview
      if (previewRef.current) {
        previewRef.current.srcdoc = reactHtml;
      }
      
      return; // Exit early for React projects
    }
    
    // Original HTML preview logic (non-React)
    const htmlFile = getFileByName('index.html');
    
    // If there's no HTML file, show appropriate message based on content
    if (!htmlFile) {
      // If React was already handled above, we shouldn't reach here
      // But if we do, check if there are any files at all
      if (project.files.length === 0) {
        // No files at all
        if (previewRef.current) {
          previewRef.current.srcdoc = `
            <html>
            <head>
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .empty-state {
                  text-align: center;
                  color: white;
                  padding: 40px;
                }
                .empty-state h2 {
                  font-size: 24px;
                  margin-bottom: 10px;
                }
                .empty-state p {
                  opacity: 0.9;
                  font-size: 16px;
                }
              </style>
            </head>
            <body>
              <div class="empty-state">
                <h2>Ready to Create! 🚀</h2>
                <p>Start by describing what you want to build in the prompt below.</p>
              </div>
            </body>
            </html>
          `;
        }
      } else {
        // Files exist but no index.html and React wasn't detected
        // This shouldn't normally happen if React files exist
        const fileList = project.files.map(f => `<li>${f.name}</li>`).join('');
        if (previewRef.current) {
          previewRef.current.srcdoc = `
            <html>
            <head>
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  padding: 20px;
                  background: #f5f5f5;
                }
                .info {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                h2 { color: #333; }
                ul { 
                  list-style: none; 
                  padding: 0;
                }
                li {
                  padding: 8px;
                  margin: 4px 0;
                  background: #f9f9f9;
                  border-radius: 4px;
                  font-family: monospace;
                }
                .note {
                  color: #666;
                  font-size: 14px;
                  margin-top: 20px;
                  padding: 12px;
                  background: #fff3cd;
                  border-radius: 4px;
                  border-left: 4px solid #ffc107;
                }
                .error {
                  color: #721c24;
                  background: #f8d7da;
                  border-left-color: #dc3545;
                }
              </style>
            </head>
            <body>
              <div class="info">
                <h2>Project Files</h2>
                <ul>${fileList}</ul>
                <div class="note error">
                  ⚠️ React code detected but not rendering. Please check your component is properly exported.
                </div>
              </div>
            </body>
            </html>
          `;
        }
      }
      return; // Exit since there's no HTML to process
    }
    
    // Process the HTML file
    let fullHtml = htmlFile.content;
    
    // Create a virtual file system for multi-page navigation
    const allHtmlFiles = project.files.filter(f => f.name.endsWith('.html'));
    const fileSystem = allHtmlFiles.reduce((acc, file) => {
      acc[file.name] = file.content;
      return acc;
    }, {} as Record<string, string>);
      
    // Remove the base href hack - it breaks relative URLs
    // We'll handle links properly instead
    
    // Inject ALL CSS files inline
    if (cssFiles.length > 0) {
      // Remove ALL external CSS references
      fullHtml = fullHtml.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
      fullHtml = fullHtml.replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, '');
      
      // Build combined CSS from all CSS files
      let combinedCss = '';
      cssFiles.forEach(cssFile => {
        combinedCss += `\n/* ${cssFile.name} */\n${cssFile.content}\n`;
      });
      
      // Inject combined CSS inline
      const headEnd = fullHtml.indexOf('</head>');
      if (headEnd > -1) {
        fullHtml = fullHtml.slice(0, headEnd) + 
          `\n<style>\n${combinedCss}\n</style>\n` + 
          fullHtml.slice(headEnd);
      }
    }
    
    // Build complete JavaScript including ALL JS files
    let completeJs = '';
    
    // Sort JS files to ensure components load before main scripts
    // Components first, then other JS files
    const componentFiles = jsFiles.filter(f => f.name.includes('component') || f.name.includes('navbar') || f.name.includes('footer'));
    const otherJsFiles = jsFiles.filter(f => !componentFiles.includes(f));
    
    // Add component files first
    componentFiles.forEach(jsFile => {
      completeJs += `\n// ${jsFile.name}\n${jsFile.content}\n`;
    });
    
    // Add all other JS files
    otherJsFiles.forEach(jsFile => {
      completeJs += `\n// ${jsFile.name}\n${jsFile.content}\n`;
    });
    
    // Add a DOM ready handler and re-initialization script
    completeJs += `
// Ensure DOM is ready and reinitialize event listeners
(function() {
  function initializeEventHandlers() {
    // Re-run any initialization functions that might exist
    if (typeof init === 'function') init();
    if (typeof initializeApp === 'function') initializeApp();
    if (typeof initializeComponents === 'function') initializeComponents();
    if (typeof setupEventListeners === 'function') setupEventListeners();
    if (typeof main === 'function') main();
    
    // Initialize common UI libraries
    // Feather Icons
    if (typeof feather !== 'undefined' && feather.replace) {
      try {
        feather.replace();
      } catch (e) {
        console.warn('Failed to initialize Feather icons:', e);
      }
    }
    
    // Lucide Icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try {
        lucide.createIcons();
      } catch (e) {
        console.warn('Failed to initialize Lucide icons:', e);
      }
    }
    
    // Alpine.js (if present)
    if (typeof Alpine !== 'undefined' && Alpine.start) {
      try {
        Alpine.start();
      } catch (e) {
        console.warn('Failed to initialize Alpine.js:', e);
      }
    }
    
    // Re-initialize any IntersectionObservers for animations
    if (typeof IntersectionObserver !== 'undefined') {
      // Find elements with reveal animations
      const revealElements = document.querySelectorAll('.reveal-text, .fade-in, .animate-on-scroll, [data-aos]');
      if (revealElements.length > 0) {
        const observerOptions = {
          root: null,
          rootMargin: '0px',
          threshold: 0.1
        };
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible', 'aos-animate', 'animated', 'in-view');
            }
          });
        }, observerOptions);
        
        revealElements.forEach(el => observer.observe(el));
      }
    }
    
    // Re-bind scroll event handlers for parallax effects
    const parallaxElements = document.querySelectorAll('.parallax, .parallax-img, [data-parallax], [data-speed]');
    if (parallaxElements.length > 0) {
      const handleParallax = () => {
        const scrolled = window.pageYOffset;
        parallaxElements.forEach(element => {
          const speed = element.getAttribute('data-speed') || 0.5;
          const yPos = -(scrolled * speed * 0.2);
          element.style.transform = \`translateY(\${yPos}px)\`;
        });
      };
      
      window.addEventListener('scroll', handleParallax);
      handleParallax(); // Initialize immediately
    }
    
    // Enhanced custom cursor handling
    const cursor = document.getElementById('cursor') || document.querySelector('.cursor, .custom-cursor');
    const cursorFollower = document.getElementById('cursor-follower') || document.querySelector('.cursor-follower');
    
    if (cursor || cursorFollower) {
      let mouseX = 0, mouseY = 0;
      let cursorX = 0, cursorY = 0;
      let followerX = 0, followerY = 0;
      
      // Track mouse position
      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Direct cursor update (no lag)
        if (cursor) {
          cursor.style.transform = \`translate(\${mouseX}px, \${mouseY}px)\`;
        }
      });
      
      // Smooth follower animation
      if (cursorFollower) {
        const animateFollower = () => {
          followerX += (mouseX - followerX) * 0.1;
          followerY += (mouseY - followerY) * 0.1;
          cursorFollower.style.transform = \`translate(\${followerX}px, \${followerY}px)\`;
          requestAnimationFrame(animateFollower);
        };
        animateFollower();
      }
      
      // Handle hover states
      const hoverTriggers = document.querySelectorAll('.hover-trigger, .magnetic-btn, a, button, [role="button"], [data-cursor]');
      hoverTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', () => {
          document.body.classList.add('hover-active');
          if (cursor) cursor.classList.add('hovered', 'hover', 'active');
          if (cursorFollower) cursorFollower.classList.add('hovered', 'hover', 'active');
        });
        trigger.addEventListener('mouseleave', () => {
          document.body.classList.remove('hover-active');
          if (cursor) cursor.classList.remove('hovered', 'hover', 'active');
          if (cursorFollower) cursorFollower.classList.remove('hovered', 'hover', 'active');
        });
      });
    }
    
    // Re-initialize carousels
    const carousels = document.querySelectorAll('.carousel, #carousel, [data-carousel]');
    carousels.forEach(carousel => {
      // Initialize carousel navigation
      const prevBtn = carousel.querySelector('#prevBtn, .carousel-prev, [data-carousel-prev]');
      const nextBtn = carousel.querySelector('#nextBtn, .carousel-next, [data-carousel-next]');
      const dots = carousel.querySelectorAll('.carousel-dot, .dot, [data-carousel-dot]');
      
      if (prevBtn || nextBtn || dots.length > 0) {
        // Re-bind carousel events if they exist
        if (typeof initCarousel === 'function') {
          initCarousel(carousel);
        }
      }
    });
    
    // Ensure any loader/splash screen click handlers work
    const loaders = document.querySelectorAll('[id*="loader"], [class*="loader"], [id*="splash"], [class*="splash"], [id*="loading"], [class*="loading"], .loading-screen');
    loaders.forEach(loader => {
      // If there's an onclick attribute, ensure it's properly bound
      if (loader.getAttribute('onclick')) {
        // Re-evaluate onclick to ensure it's bound
        const onclickCode = loader.getAttribute('onclick');
        loader.onclick = new Function(onclickCode);
      }
      
      // Check for data attributes that might indicate click behavior
      if (loader.dataset.clickToHide === 'true' || loader.dataset.dismiss === 'true') {
        loader.style.cursor = 'pointer';
        loader.addEventListener('click', function() {
          this.style.display = 'none';
        });
      }
    });
    
    // CRITICAL FIX: Aggressive auto-hide for ALL types of loading screens, overlays, and popups
    // This ensures loading screens always disappear even if JavaScript has errors
    function hideStuckOverlays() {
      // Extended selector for loading elements with many patterns
      const loadingSelectors = [
        '.loading-screen', '.loader-container', '.splash-screen', '.preloader',
        '.loading-overlay', '.page-loader', '.site-loader', '.content-loader',
        '[id*="loading"]', '[id*="loader"]', '[id*="splash"]', '[id*="preloader"]',
        '[class*="loading"]', '[class*="loader"]', '[class*="splash"]', '[class*="preloader"]',
        '[class*="overlay"]', '[class*="popup"]', '[class*="modal"]', '[class*="Popup"]', '[class*="Modal"]'
      ].join(', ');
      
      const allLoadingElements = document.querySelectorAll(loadingSelectors);
      
      allLoadingElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Check various conditions that indicate a blocking overlay
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
        const isPositioned = ['fixed', 'absolute'].includes(style.position);
        const coversViewport = (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5);
        const hasHighZIndex = parseInt(style.zIndex || '0') > 10;
        const isCentered = (rect.left < window.innerWidth * 0.3 && rect.right > window.innerWidth * 0.7);
        
        // Check if element or its children contain loading-related text
        const textContent = element.textContent?.toLowerCase() || '';
        const hasLoadingText = ['loading', 'memuat', 'wait', 'please wait', 'mohon tunggu', 'sedang', 'proses'].some(t => textContent.includes(t));
        
        // Check for animation (common in loading spinners)
        const hasAnimation = style.animation !== 'none' || style.animationName !== 'none';
        const hasAnimatedChild = element.querySelector('[class*="spin"], [class*="pulse"], [class*="bounce"], [class*="animate"]');
        
        // Hide if it looks like a loading overlay
        if (isVisible && isPositioned && (
          (coversViewport && hasHighZIndex) || 
          (hasLoadingText && (isPositioned || hasHighZIndex)) ||
          (hasAnimation && coversViewport) ||
          (hasAnimatedChild && coversViewport)
        )) {
          console.log('[Preview] Auto-hiding stuck overlay:', element.className || element.id || 'unnamed');
          element.style.transition = 'opacity 0.3s ease';
          element.style.opacity = '0';
          element.style.pointerEvents = 'none';
          setTimeout(() => {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
          }, 300);
        }
      });
      
      // Also scan for elements by their visual appearance (centered, covering viewport)
      document.querySelectorAll('*').forEach(element => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Skip if already hidden or is body/html
        if (element === document.body || element === document.documentElement) return;
        if (style.display === 'none' || style.visibility === 'hidden') return;
        
        const isFixed = style.position === 'fixed';
        const coversViewport = (rect.width >= window.innerWidth && rect.height >= window.innerHeight);
        const hasHighZIndex = parseInt(style.zIndex || '0') >= 50;
        const hasDarkBackground = style.backgroundColor.includes('rgba') && parseFloat(style.backgroundColor.split(',')[3] || '1') > 0.3;
        
        // Full-screen fixed overlay with dark background = likely a loading screen or modal backdrop
        if (isFixed && coversViewport && (hasHighZIndex || hasDarkBackground)) {
          const textContent = element.textContent?.toLowerCase() || '';
          const isMainContent = textContent.length > 1000; // Likely actual content, not a loader
          
          if (!isMainContent) {
            console.log('[Preview] Auto-hiding full-screen overlay:', element.className || 'unnamed');
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '0';
            element.style.pointerEvents = 'none';
            setTimeout(() => {
              element.style.display = 'none';
            }, 300);
          }
        }
      });
    }
    
    // Run at multiple intervals to catch late-appearing loaders
    setTimeout(hideStuckOverlays, 500);  // Quick first check
    setTimeout(hideStuckOverlays, 1500); // Second check
    setTimeout(hideStuckOverlays, 3000); // Final aggressive check
    
    // Fix any buttons or clickable elements that might not be working
    document.querySelectorAll('[onclick]').forEach(element => {
      const onclickCode = element.getAttribute('onclick');
      if (onclickCode) {
        try {
          element.onclick = new Function('event', onclickCode);
        } catch (e) {
          console.warn('Failed to bind onclick:', e);
        }
      }
    });
    
    // Handle any addEventListener calls in the original script
    // These often get lost in iframe reloads
    document.querySelectorAll('[data-click], [data-event]').forEach(element => {
      const eventType = element.dataset.event || 'click';
      const handler = element.dataset.handler || element.dataset.click;
      if (handler && typeof window[handler] === 'function') {
        element.addEventListener(eventType, window[handler]);
      }
    });
  }
  
  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventHandlers);
  } else {
    // DOM is already ready
    initializeEventHandlers();
  }
  
  // Also run on window load for any resources that need to be fully loaded
  window.addEventListener('load', function() {
    initializeEventHandlers();
  });
})();
`;
      
      // Add simple link interception for multi-page apps (v3 approach)
      // Instead of complex navigation, just notify parent window when a link is clicked
      if (allHtmlFiles.length > 1) {
        completeJs += `
// Simple link click handling for multi-page preview (v3 approach)
(function() {
  const fileSystem = ${JSON.stringify(fileSystem)};
  
  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Allow external links and anchors to work normally
    if (href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      // For external links, prevent navigation and notify user
      if (href.startsWith('http') || href.startsWith('//')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('External link clicked:', href);
        // Send message to parent for toast notification
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'preview-link-click',
            href: href,
            external: true
          }, '*');
        }
      }
      return;
    }
    
    // Prevent internal navigation that would break the preview
    e.preventDefault();
    e.stopPropagation();
    
    // Determine target file
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
    
    // Check if the target page exists
    if (fileSystem[targetFile]) {
      // Send message to parent to handle navigation
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-navigation',
          targetFile: targetFile
        }, '*');
      }
    } else {
      console.warn('Page not found:', targetFile);
      // Send message to parent for not found notification
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'preview-link-click',
          href: targetFile,
          notFound: true
        }, '*');
      }
    }
  }, true); // Use capture phase
})();
`;
      }
      
      // Handle JavaScript injection - preserve external CDN scripts
      if (completeJs) {
        // Only remove LOCAL script references (not CDN scripts)
        // This regex matches only local script files (script.js, app.js, components/xxx.js, etc.)
        // But preserves CDN scripts (https://, http://, //)
        fullHtml = fullHtml.replace(/<script[^>]*src=["'](?!https?:\/\/|\/\/)[^"']*\.js["'][^>]*><\/script>/gi, '');
        
        // Wait for external libraries to load, then inject our code
        const libraryLoader = `
// Wait for external libraries to load before running our code
(function() {
  let attempts = 0;
  const maxAttempts = 50;
  
  function checkLibraries() {
    attempts++;
    
    // Check if GSAP is expected and wait for it
    const hasGSAPScript = document.querySelector('script[src*="gsap"]');
    if (hasGSAPScript && typeof gsap === 'undefined' && attempts < maxAttempts) {
      setTimeout(checkLibraries, 100);
      return;
    }
    
    // Check if ScrollTrigger is expected and wait for it
    const hasScrollTriggerScript = document.querySelector('script[src*="ScrollTrigger"]');
    if (hasScrollTriggerScript && typeof ScrollTrigger === 'undefined' && attempts < maxAttempts) {
      setTimeout(checkLibraries, 100);
      return;
    }
    
    // Libraries are loaded (or timeout reached), run our code
    runApplicationCode();
  }
  
  function runApplicationCode() {
    ${completeJs}
    
    // If GSAP is available, refresh ScrollTrigger after DOM updates
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    }
  }
  
  // Start checking for libraries
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLibraries);
  } else {
    checkLibraries();
  }
})();
`;
        
        // Inject complete JS inline at the end of body
        const bodyEnd = fullHtml.indexOf('</body>');
        if (bodyEnd > -1) {
          fullHtml = fullHtml.slice(0, bodyEnd) + 
            `\n<script>\n${libraryLoader}\n</script>\n` + 
            fullHtml.slice(bodyEnd);
        }
      }
      
      // Use srcdoc instead of document.write to preserve event listeners
      // This is the key fix that will make interactive elements work!
      if (previewRef.current) {
        previewRef.current.srcdoc = fullHtml;
      }
  }, [jsFiles, cssFiles, project?.activeFile, getFileByName]);

  const randomPrompt = () => {
    setRandomPromptLoading(true);
    setTimeout(() => {
      setPrompt(
        PROMPTS_FOR_AI[Math.floor(Math.random() * PROMPTS_FOR_AI.length)]
      );
      setRandomPromptLoading(false);
    }, 400);
  };

  const checkIfUrlIsValid = (url: string) => {
    const urlPattern = new RegExp(
      /^https?:\/\/([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      'i'
    );
    return urlPattern.test(url);
  };
  
  const normalizeUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleRedesign = async () => {
    if (redesignLoading || isGenerating) return;
    if (!redesignUrl) {
      toast({
        title: "Error",
        description: "Please enter a URL.",
        variant: "destructive",
      });
      return;
    }
    
    const normalizedUrl = normalizeUrl(redesignUrl);
    
    if (!checkIfUrlIsValid(normalizedUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid URL (e.g., https://example.com).",
        variant: "destructive",
      });
      return;
    }
    
    setRedesignLoading(true);
    
    try {
      toast({
        title: "Fetching website",
        description: "Reading the website content...",
      });
      
      const response = await fetch('/api/re-design', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to fetch website content.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && data.markdown) {
        setRedesignOpen(false);
        setRedesignUrl('');
        
        setRedesignData({ markdown: data.markdown, url: normalizedUrl });
        setRedesignLoading(false);
        
        toast({
          title: "Ready to redesign",
          description: "Press Enter or click Generate to redesign your site!",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch website content.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch website content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRedesignLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !redesignData && !selectedElement) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Capture selectedElementHtml before clearing
    let selectedElementHtml: string | null = null;
    if (selectedElement) {
      selectedElementHtml = selectedElement.outerHTML;
      // Clear the selected element styling
      selectedElement.classList.remove('jatevo-selected-element');
      setSelectedElement(null);
      setIsEditableModeEnabled(false);
    }
    
    // Build the prompt based on context
    let basePrompt = prompt.trim();
    
    // Build the prompt based on redesign context
    if (redesignData) {
      const userInstructions = basePrompt ? `\n\nAdditional instructions: ${basePrompt}` : '';
      basePrompt = `Redesign the following website with a modern, beautiful look. Keep the same content structure but make it visually stunning with better typography, colors, spacing, and animations.

Original website URL: ${redesignData.url}

Website content:
${redesignData.markdown}

Create a complete multi-file project with index.html, style.css, and script.js. Use modern CSS and Tailwind CSS for styling. Make it responsive and add smooth hover effects.${userInstructions}`;
      
      setRedesignData(null);
      
      toast({
        title: "Redesigning",
        description: "Jatevo Web Builder is redesigning your site! Let it cook...",
      });
    }
    
    // Enhance prompt ONLY for new projects when enhancement is enabled
    // Never enhance when editing existing projects or redesigning
    const isNewProject = routeSessionId === 'new' || (project?.files?.length ?? 0) <= 1;
    let finalPrompt = basePrompt;
    if (enhancedSettings.isActive && isNewProject && !redesignData) {
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
      // Only treat as follow-up if we have generated files
      const isFollowUp = !!((project?.files?.length ?? 0) > 1);
      
      // Create session with POST to avoid URL length limitations
      const sessionPayload: any = {
        prompt: finalPrompt,
        useMultiFile: true,
        // Use follow-up system prompt for incremental updates when modifying existing files
        useFollowUpPrompt: isFollowUp,
        systemPrompt: isFollowUp ? FOLLOW_UP_SYSTEM_PROMPT : undefined,
        // Only include style preference for initial generation, not for follow-up edits
        ...(isFollowUp ? {} : { stylePreference: stylePreference }),
        // Include selected element HTML for targeted edits (v3 style)
        ...(selectedElementHtml ? { selectedElementHtml } : {}),
        // Include selected media files for AI context
        ...(selectedMediaFiles.length > 0 ? { mediaFiles: selectedMediaFiles } : {})
      };
      
      if (isFollowUp && project) {
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
        : selectedModel === 'gradient-qwen3-coder'
        ? `/api/gradient/stream/${sessionId}`
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
      // Initialize currentFiles with existing project files if this is a follow-up edit
      let currentFiles: Map<string, ProjectFile> = new Map();
      if (isFollowUp && project?.files) {
        // Pre-populate with existing files so SEARCH/REPLACE can work
        project.files.forEach(file => {
          currentFiles.set(file.name, { ...file });
        });
      }
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
            setPrompt(''); // Clear prompt after successful generation
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
                    // Create a version FIRST, before navigation to ensure it completes
                    // We need to manually call the API here because the project context hasn't updated yet
                    let versionCreated = false;
                    try {
                      console.log('Creating initial version for project:', savedProject.id);
                      const token = localStorage.getItem('auth_token');
                      const versionPayload = {
                        projectId: savedProject.id,
                        versionNumber: 1,
                        prompt: finalPrompt,
                        files: finalFilesArray,
                        isFollowUp: isFollowUp || false,
                        commitTitle: isFollowUp ? `Follow-up: ${finalPrompt.substring(0, 50)}...` : `Initial: ${finalPrompt.substring(0, 50)}...`
                      };
                      
                      const versionResponse = await fetch(`/api/projects/${savedProject.id}/versions`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(versionPayload)
                      });
                      
                      if (!versionResponse.ok) {
                        const errorText = await versionResponse.text();
                        console.error('Version creation failed:', versionResponse.status, errorText);
                        throw new Error(`Failed to create version: ${versionResponse.status}`);
                      }
                      
                      const newVersion = await versionResponse.json();
                      console.log('✅ Version created successfully for project:', savedProject.id, 'version ID:', newVersion.id);
                      versionCreated = true;
                    } catch (versionError) {
                      console.error('❌ Failed to create version:', versionError);
                      // Non-critical error, continue but log it
                    }
                    
                    // Navigate only AFTER version creation attempt completes
                    const navigateTo = savedProject.slug 
                      ? `/ide/${savedProject.slug}` 
                      : `/ide/${savedProject.id}`;
                    
                    console.log('Navigating to saved project:', navigateTo, 'version created:', versionCreated);
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
            } else if (project?.id) {
              // Project already has an ID - save the update and create a version
              (async () => {
                try {
                  // Save the updated files
                  const updatedProject = await saveProject(project.id, project.name, finalFilesArray, finalPrompt);
                  
                  // Create a version for this edit (similar to v3's commit system)
                  // Use the project's createVersion function since project.id exists
                  try {
                    await createVersion(finalPrompt, finalFilesArray, isFollowUp || true);
                    console.log('Version created for edit on project:', project.id);
                    
                    // Manually invalidate versions query to refresh History component
                    if (queryClient) {
                      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/versions`] });
                    }
                  } catch (versionError) {
                    console.error('Failed to create version:', versionError);
                    // Non-critical error, continue
                  }
                  
                  toast({
                    title: "✨ Generation Complete!",
                    description: "Your changes have been applied and saved to history.",
                    className: "bg-green-900 border-green-700 text-white",
                  });
                } catch (error) {
                  console.error('Failed to save edit:', error);
                  toast({
                    title: "❌ Save Failed",
                    description: "Changes applied but couldn't be saved to history.",
                    variant: "destructive"
                  });
                }
              })();
            } else {
              // Fallback case
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
                
                // Convert parsed files to project files (with media placeholder replacement)
                const newFiles = convertToProjectFiles(eventData.files, existingFilesArray, selectedMediaFiles);
                
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
              } else if (isFollowUp && eventData.files && eventData.files.length === 0) {
                // Backend parsing returned 0 files, but check if frontend already processed the update via SEARCH/REPLACE
                // This happens when the AI uses UPDATE_FILE_START with SEARCH/REPLACE format which is parsed on frontend
                const hasExistingContent = currentFiles.size > 0 && 
                  Array.from(currentFiles.values()).some(f => f.content && f.content.trim().length > 0);
                
                if (!hasExistingContent) {
                  // Actually failed - no content was parsed
                  console.warn('⚠️ Follow-up edit failed: No files were parsed from AI response');
                  setIsGenerating(false);
                  eventSource.close();
                  
                  toast({
                    title: "⚠️ Edit Failed",
                    description: "The AI couldn't apply your changes. Try being more specific or regenerate the entire project.",
                    variant: "destructive"
                  });
                  return; // Exit early to prevent version creation with no changes
                }
                // Otherwise, frontend already processed the update - continue to version creation
                console.log('✅ Frontend processed SEARCH/REPLACE update, continuing with version creation');
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
              setPrompt(''); // Clear prompt after successful generation
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
                    const savedProject = await saveProject(undefined, autoName, finalFilesArray, finalPrompt);
                    
                    if (savedProject?.id) {
                      // Create version BEFORE navigation for Cerebras flow too
                      let versionCreated = false;
                      try {
                        console.log('Creating initial version for Cerebras project:', savedProject.id);
                        const token = localStorage.getItem('auth_token');
                        const versionPayload = {
                          projectId: savedProject.id,
                          versionNumber: 1,
                          prompt: finalPrompt,
                          files: finalFilesArray,
                          isFollowUp: false,
                          commitTitle: `Initial: ${finalPrompt.substring(0, 50)}...`
                        };
                        
                        const versionResponse = await fetch(`/api/projects/${savedProject.id}/versions`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                          },
                          body: JSON.stringify(versionPayload)
                        });
                        
                        if (!versionResponse.ok) {
                          const errorText = await versionResponse.text();
                          console.error('Cerebras version creation failed:', versionResponse.status, errorText);
                          throw new Error(`Failed to create version: ${versionResponse.status}`);
                        }
                        
                        const newVersion = await versionResponse.json();
                        console.log('✅ Cerebras version created successfully:', savedProject.id, 'version ID:', newVersion.id);
                        versionCreated = true;
                      } catch (versionError) {
                        console.error('❌ Failed to create Cerebras version:', versionError);
                        // Non-critical error, continue
                      }
                      
                      // Navigate only AFTER version creation attempt
                      const navigateTo = savedProject.slug 
                        ? `/ide/${savedProject.slug}` 
                        : `/ide/${savedProject.id}`;
                      
                      console.log('Navigating to saved project:', navigateTo, 'version created:', versionCreated);
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
              } else if (project?.id) {
                // Existing project - save the update and create a version for Cerebras flow
                (async () => {
                  try {
                    console.log('Saving follow-up edit for project:', project.id);
                    
                    // Save the updated files
                    const updatedProject = await saveProject(project.id, project.name, finalFilesArray, finalPrompt);
                    
                    // Create a version for this edit
                    try {
                      await createVersion(finalPrompt, finalFilesArray, true);
                      console.log('Version created for Cerebras follow-up edit on project:', project.id);
                      
                      // Manually invalidate versions query to refresh History component
                      if (queryClient) {
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/versions`] });
                      }
                    } catch (versionError) {
                      console.error('Failed to create version for Cerebras edit:', versionError);
                      // Non-critical error, continue
                    }
                    
                    toast({
                      title: "✨ Changes Applied",
                      description: "Your edits have been saved to the project history.",
                      className: "bg-green-900 border-green-700 text-white",
                    });
                  } catch (error) {
                    console.error('Failed to save Cerebras follow-up edit:', error);
                    toast({
                      title: "❌ Save Failed",
                      description: "Changes were applied but couldn't be saved.",
                      variant: "destructive"
                    });
                  }
                })();
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
          
          // Decode HTML entities that might come from the server (especially from Cerebras)
          const decodeHtmlEntities = (str: string) => {
            return str
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&#x27;/g, "'")
              .replace(/&#x2F;/g, '/');
          };
          
          // Decode the chunk before processing
          contentChunk = decodeHtmlEntities(contentChunk);
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
          
          // Find all UPDATE_FILE_START markers for incremental edits
          const updateFileRegex = /<<<<<<< UPDATE_FILE_START\s+([^\s>]+)\s+>>>>>>> UPDATE_FILE_END/g;
          const updateFileMatches = Array.from(accumulatedContent.matchAll(updateFileRegex));
          
          // Process UPDATE_FILE markers for incremental edits (v3-style)
          if (updateFileMatches.length > 0 && isFollowUp) {
            isMultiFile = true;
            
            updateFileMatches.forEach((match, index) => {
              const fileName = match[1];
              const fileStartPos = match.index! + match[0].length;
              
              // Find the end of this update block
              let fileEndPos = accumulatedContent.length;
              if (index < updateFileMatches.length - 1) {
                fileEndPos = updateFileMatches[index + 1].index!;
              }
              
              // Extract the update content
              const updateContent = accumulatedContent.substring(fileStartPos, fileEndPos);
              
              // Apply SEARCH/REPLACE blocks if present
              const existingFile = currentFiles.get(fileName);
              if (existingFile && updateContent.includes('<<<<<<< SEARCH')) {
                let updatedContent = existingFile.content;
                
                // Parse and apply SEARCH/REPLACE blocks
                const searchReplaceRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
                let searchReplaceMatch;
                
                while ((searchReplaceMatch = searchReplaceRegex.exec(updateContent)) !== null) {
                  const searchBlock = searchReplaceMatch[1];
                  const replaceBlock = searchReplaceMatch[2];
                  
                  // Apply the replacement
                  if (searchBlock.trim() === "") {
                    // Empty search means insert at beginning
                    updatedContent = replaceBlock + '\n' + updatedContent;
                  } else {
                    let matchFound = false;
                    
                    // Strategy 1: Try exact match first
                    if (updatedContent.includes(searchBlock)) {
                      updatedContent = updatedContent.replace(searchBlock, replaceBlock);
                      matchFound = true;
                      console.log(`✅ Applied exact SEARCH/REPLACE for ${fileName}`);
                    } 
                    
                    // Strategy 2: Try normalizing all whitespace (most forgiving)
                    if (!matchFound) {
                      const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
                      const normalizedSearch = normalizeWhitespace(searchBlock);
                      const normalizedContent = normalizeWhitespace(updatedContent);
                      
                      if (normalizedContent.includes(normalizedSearch)) {
                        // Find the original text by matching normalized version
                        const lines = updatedContent.split('\n');
                        let bestMatch = '';
                        let bestMatchIndex = -1;
                        
                        // Try to find the section that matches when normalized
                        for (let i = 0; i < lines.length; i++) {
                          for (let j = i + 1; j <= lines.length && j <= i + 50; j++) {
                            const section = lines.slice(i, j).join('\n');
                            if (normalizeWhitespace(section) === normalizedSearch) {
                              if (section.length > bestMatch.length) {
                                bestMatch = section;
                                bestMatchIndex = i;
                              }
                            }
                          }
                        }
                        
                        if (bestMatch) {
                          updatedContent = updatedContent.replace(bestMatch, replaceBlock);
                          matchFound = true;
                          console.log(`✅ Applied whitespace-normalized SEARCH/REPLACE for ${fileName}`);
                        }
                      }
                    }
                    
                    // Strategy 3: Try flexible regex matching
                    if (!matchFound) {
                      try {
                        const flexibleSearch = searchBlock
                          .split(/\r?\n/)
                          .map(line => line
                            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                            .replace(/\s+/g, '\\s+')
                          )
                          .join('\\s*\\n\\s*');
                        
                        const searchRegex = new RegExp(flexibleSearch, 'g');
                        const matches = updatedContent.match(searchRegex);
                        
                        if (matches && matches.length > 0) {
                          updatedContent = updatedContent.replace(searchRegex, replaceBlock);
                          matchFound = true;
                          console.log(`✅ Applied regex SEARCH/REPLACE for ${fileName}`);
                        }
                      } catch (e) {
                        console.warn('Regex matching failed:', e);
                      }
                    }
                    
                    // If all strategies failed, warn but don't break the page
                    if (!matchFound) {
                      console.warn(`⚠️ Could not find match for SEARCH block in ${fileName} - skipping this edit`);
                      console.warn('Search block (first 200 chars):', searchBlock.substring(0, 200));
                      console.warn('File content (first 500 chars):', updatedContent.substring(0, 500));
                      console.warn('💡 Tip: The AI may be generating slightly different code. Try regenerating or being more specific.');
                    }
                  }
                }
                
                // Replace media placeholders with actual data URLs before updating
                let finalContent = updatedContent;
                if (selectedMediaFiles && selectedMediaFiles.length > 0) {
                  for (let i = 0; i < selectedMediaFiles.length; i++) {
                    const placeholder = `{{MEDIA_${i + 1}}}`;
                    finalContent = finalContent.split(placeholder).join(selectedMediaFiles[i]);
                  }
                }
                
                // Update the file with modified content
                currentFiles.set(fileName, {
                  ...existingFile,
                  content: finalContent
                });
                
                console.log(`✏️ Updated file via SEARCH/REPLACE: ${fileName}`);
              }
            });
            
            // Update UI immediately to show changes
            updateFilesRealtime();
          }
          
          // Process NEW_FILE markers for new files
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
              
              // Replace media placeholders with actual data URLs
              if (selectedMediaFiles && selectedMediaFiles.length > 0) {
                for (let i = 0; i < selectedMediaFiles.length; i++) {
                  const placeholder = `{{MEDIA_${i + 1}}}`;
                  fileContent = fileContent.split(placeholder).join(selectedMediaFiles[i]);
                }
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
        setPrompt(''); // Clear prompt on error
        
        toast({
          title: "Error",
          description: "Connection error during generation",
          variant: "destructive"
        });
      };
      
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setPrompt(''); // Clear prompt on error
      
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
          
          {project && project.id && (
            <VersionHistory />
          )}
          
          {project && project.files.length > 0 && (
            <DeployButton 
              files={project.files}
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
        <div className="flex-1 flex relative overflow-hidden">
          {/* Code Editor - 30% width with explicit constraints */}
          <div className="w-[30%] min-w-[400px] max-w-[50%] bg-[#1e1e1e] flex flex-col border-r border-gray-800 flex-shrink-0">
            {/* Editor Header with Files and History Buttons */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFileExplorer(!showFileExplorer)}
                  className="flex items-center gap-2 text-gray-300 hover:bg-gray-800 px-2"
                  data-testid="button-toggle-explorer"
                >
                  <Files className="w-4 h-4" />
                  <span className="text-sm">Files</span>
                  {project?.files && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                      {project.files.length}
                    </span>
                  )}
                </Button>
                
                <History />
                
                {/* Undo Button - Restores previous version */}
                <UndoButton />
              </div>
              
              <EditorTabs />
            </div>
            
            {/* Code Editor */}
            <MultiFileEditor 
              className="flex-1 overflow-auto"
              onRunCode={() => setShowPreview(true)}
              isGenerating={isGenerating}
            />
            
            {/* Prompt Bar - Inside Code Editor Panel */}
            <div className="bg-[#1a1a1a] border-t border-gray-800">
              {/* Selected Element Badge */}
              {selectedElement && !isGenerating && (
                <div className="px-3 pt-3">
                  <div
                    className={cn(
                      "border border-blue-500/50 bg-blue-500/10 rounded-xl p-1.5 pr-3 max-w-max hover:brightness-110 transition-all duration-200 ease-in-out cursor-pointer"
                    )}
                    onClick={() => {
                      // Remove selected styling from element
                      selectedElement.classList.remove('jatevo-selected-element');
                      setSelectedElement(null);
                    }}
                    data-testid="badge-selected-element"
                  >
                    <div className="flex items-center justify-start gap-2">
                      <div className="rounded-lg bg-blue-500/20 w-6 h-6 flex items-center justify-center">
                        <Code className="text-blue-300 w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-blue-200">
                        {selectedElement.textContent?.trim().split(/\s+/).slice(0, 3).join(' ') || selectedElement.tagName.toLowerCase()}
                        <span className="text-blue-400 ml-1 font-normal">
                          &lt;{selectedElement.tagName.toLowerCase()}&gt;
                        </span>
                      </p>
                      <XCircle className="text-blue-300 w-4 h-4 hover:text-blue-200 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Redesign URL Badge */}
              {redesignData && (
                <div className="px-3 pt-3">
                  <div
                    className={cn(
                      "border border-emerald-500/50 bg-emerald-500/10 rounded-xl p-1.5 pr-3 max-w-max hover:brightness-110 transition-all duration-200 ease-in-out",
                      isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                    onClick={() => {
                      if (!isGenerating) {
                        setRedesignData(null);
                      }
                    }}
                    data-testid="badge-redesign-url"
                  >
                    <div className="flex items-center justify-start gap-2">
                      <div className="rounded-lg bg-emerald-500/20 w-6 h-6 flex items-center justify-center">
                        <Paintbrush className="text-emerald-300 w-3.5 h-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-200 truncate max-w-[200px]">{redesignData.url}</p>
                      <X className="text-emerald-300 w-4 h-4 hover:text-emerald-200 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                </div>
              )}
              {/* Prompt Input */}
              <div className="relative">
                <Textarea
                  placeholder={
                    isGenerating
                      ? "Jatevo Web Builder is working..."
                      : selectedElement
                      ? `Ask about the ${selectedElement.tagName.toLowerCase()} element...`
                      : redesignData
                      ? "Ask about the redesign..."
                      : (project?.files?.length ?? 0) > 1
                      ? "Ask Jatevo for edits..."
                      : "Describe the website you want to generate..."
                  }
                  value={isGenerating ? "" : prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && (prompt.trim() || redesignData)) {
                      e.preventDefault();
                      if (!isGenerating) {
                        handleGenerate();
                      }
                    }
                  }}
                  className={cn(
                    "min-h-[80px] resize-none border-0 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm px-3 pb-2 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0",
                    redesignData ? "pt-2" : "pt-3"
                  )}
                  disabled={isGenerating}
                  data-testid="input-prompt"
                />
                {/* Dice Button for Random Prompt - only show for new projects (no project ID yet) */}
                {(routeSessionId === 'new' || !project?.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => randomPrompt()}
                    className={`absolute top-2 right-2 h-7 w-7 p-0 text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 rounded-md ${randomPromptLoading ? 'animate-spin' : ''}`}
                    title="Get random prompt"
                    disabled={isGenerating}
                  >
                    <Dices className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Menu Bar */}
              <div className="flex items-center justify-between gap-1 px-2 py-2 border-t border-gray-800/50">
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Show new project buttons only if no project ID yet */}
                  {/* Show existing project buttons once project has been created (has ID) */}
                  {!project?.id ? (
                    <>
                      {/* Enhance Toggle */}
                      <div 
                        className="flex items-center gap-1.5 h-7 px-2 text-xs text-gray-400"
                        title={stylePreference !== 'default' ? `Enhancement disabled for ${stylePreference} style` : 'Enhance generated code'}
                      >
                        <Zap className={cn("w-3 h-3", enhancedSettings.isActive && "text-yellow-500", stylePreference !== 'default' && "opacity-50")} />
                        <span className={cn("hidden lg:inline", stylePreference !== 'default' && "opacity-50")}>Enhance</span>
                        <Switch
                          checked={enhancedSettings.isActive}
                          onCheckedChange={(checked) => setEnhancedSettings({ isActive: checked })}
                          className="scale-[0.65]"
                          disabled={stylePreference !== 'default'}
                          data-testid="switch-enhance"
                        />
                      </div>
                      
                      {/* Model Selector */}
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger 
                          className="h-7 w-auto min-w-[90px] px-2 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
                          data-testid="select-model"
                        >
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-gray-700">
                          <SelectItem value="deepseek-v3-0324" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            DeepSeek V3
                          </SelectItem>
                          <SelectItem value="cerebras-glm-4.6" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            glm-4.6
                          </SelectItem>
                          <SelectItem value="gradient-qwen3-coder" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            Gradient
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Style Selector */}
                      <Select value={stylePreference} onValueChange={(value) => setStylePreference(value as 'default' | 'v1' | 'v2')}>
                        <SelectTrigger 
                          className="h-7 w-auto min-w-[70px] px-2 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
                          data-testid="select-style"
                        >
                          <div className="flex items-center gap-1">
                            <Paintbrush className="w-3 h-3" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-gray-700">
                          <SelectItem value="default" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            Default
                          </SelectItem>
                          <SelectItem value="v1" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            v1
                          </SelectItem>
                          <SelectItem value="v2" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            v2
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Redesign Button */}
                      <Popover open={redesignOpen} onOpenChange={setRedesignOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50",
                              redesignOpen && "bg-gray-800/50 text-gray-200"
                            )}
                            disabled={isGenerating || redesignLoading}
                            data-testid="button-redesign"
                          >
                            <Paintbrush className="w-3 h-3 mr-1" />
                            <span className="hidden lg:inline">Redesign</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          side="top"
                          className="w-72 rounded-xl p-0 bg-white border-gray-200 text-center overflow-hidden"
                        >
                          <header className="bg-gray-50 p-4 border-b border-gray-200">
                            <p className="text-lg font-semibold text-gray-900">
                              Redesign your Site!
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Give your site a fresh look.
                            </p>
                          </header>
                          <main className="space-y-3 p-4">
                            <div>
                              <Input
                                type="text"
                                placeholder="https://example.com"
                                value={redesignUrl}
                                onChange={(e) => setRedesignUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRedesign();
                                  }
                                }}
                                className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400"
                                data-testid="input-redesign-url"
                              />
                            </div>
                            <Button
                              onClick={handleRedesign}
                              disabled={redesignLoading}
                              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                              data-testid="button-start-redesign"
                            >
                              {redesignLoading ? 'Fetching...' : 'Redesign'}
                            </Button>
                          </main>
                        </PopoverContent>
                      </Popover>
                    </>
                  ) : (
                    <>
                      {/* Existing project buttons - v3 design: Add Context, Model, Attach, Edit */}
                      
                      {/* @ Add Context Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-gray-100"
                        data-testid="button-add-context"
                      >
                        <AtSign className="w-3 h-3 mr-1" />
                        Add Context
                      </Button>
                      
                      {/* Model Selector */}
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger 
                          className="h-7 w-auto min-w-[100px] px-3 text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50"
                          data-testid="select-model-edit"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">Z</span>
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-gray-700">
                          <SelectItem value="deepseek-v3-0324" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            DeepSeek V3
                          </SelectItem>
                          <SelectItem value="cerebras-glm-4.6" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            glm-4.6
                          </SelectItem>
                          <SelectItem value="gradient-qwen3-coder" className="text-xs text-gray-300 focus:bg-gray-800 focus:text-gray-100">
                            Gradient
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Attach Button - Media Files Manager */}
                      <MediaFilesManager
                        projectId={project?.id || null}
                        files={mediaFiles}
                        selectedFiles={selectedMediaFiles}
                        onFilesChange={setMediaFiles}
                        onSelectedFilesChange={setSelectedMediaFiles}
                        isUploading={isUploadingMedia}
                        onUpload={handleMediaUpload}
                        disabled={isGenerating}
                      />
                      
                      {/* Edit Button - enables element selection mode */}
                      <Button
                        variant={isEditableModeEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditableModeEnabled(!isEditableModeEnabled)}
                        className={cn(
                          "h-7 px-3 text-xs",
                          isEditableModeEnabled 
                            ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600" 
                            : "bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-gray-100"
                        )}
                        data-testid="button-edit-mode"
                        title="Select an element on the page to edit it directly"
                      >
                        <Crosshair className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Send/Stop Button - v3 style: circular with just icon */}
                <Button
                  onClick={isGenerating ? handleStopGeneration : handleGenerate}
                  disabled={!prompt.trim() && !isGenerating && !redesignData && !selectedElement}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 rounded-full",
                    isGenerating 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-gray-600 hover:bg-gray-500"
                  )}
                  variant="ghost"
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <X className="w-4 h-4 text-white" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview - 80% width */}
          <div 
            className={cn(
              "flex-1 bg-white relative overflow-hidden",
              isEditableModeEnabled && "cursor-crosshair"
            )}
            onKeyDown={(e) => {
              // Prevent page scroll when arrow keys or game controls are pressed in preview
              const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
              if (gameKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onWheel={(e) => {
              // Prevent scroll from propagating to parent when preview is focused
              e.stopPropagation();
            }}
          >
            {/* Edit Mode Indicator */}
            {isEditableModeEnabled && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                <Crosshair className="w-3 h-3" />
                Click an element to select it for editing
                <button 
                  onClick={() => setIsEditableModeEnabled(false)}
                  className="ml-1 hover:bg-blue-500 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Loading overlay for preview */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 z-10 flex items-center justify-center pointer-events-none">
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
              className={cn(
                "w-full h-full border-0 outline-none",
                isEditableModeEnabled && "pointer-events-auto"
              )}
              sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox"
              title="Preview"
              data-testid="iframe-preview"
              tabIndex={0}
              onLoad={() => {
                // Remove any lingering loading indicators when iframe loads
                if (previewRef.current?.contentDocument) {
                  const doc = previewRef.current.contentDocument;
                  // Check if content actually loaded
                  if (doc.body && doc.body.innerHTML.trim()) {
                    console.log('Preview loaded successfully');
                  }
                  
                  // Inject hover/selection styles for edit mode
                  const style = doc.createElement('style');
                  style.id = 'jatevo-edit-mode-styles';
                  style.textContent = `
                    .jatevo-hovered-element {
                      outline: 3px dashed #3b82f6 !important;
                      outline-offset: 2px !important;
                      cursor: pointer !important;
                      background-color: rgba(59, 130, 246, 0.1) !important;
                      box-shadow: inset 0 0 0 2000px rgba(59, 130, 246, 0.05), 0 0 0 4px rgba(59, 130, 246, 0.3) !important;
                      transition: all 0.15s ease !important;
                    }
                    .jatevo-selected-element {
                      outline: 3px solid #10b981 !important;
                      outline-offset: 2px !important;
                      background-color: rgba(16, 185, 129, 0.08) !important;
                      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2) !important;
                    }
                  `;
                  doc.head.appendChild(style);
                }
              }}
              onClick={() => {
                // Focus the iframe when clicked to enable keyboard events for games
                previewRef.current?.focus();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};