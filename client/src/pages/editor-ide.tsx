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
import { VersionHistory } from '@/components/VersionHistory';
import { History } from '@/components/History';
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
  ChevronUp,
  Dices,
  Paintbrush
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processAiResponse, convertToProjectFiles } from '@/lib/process-ai-response';
import { rewritePrompt } from '@/lib/rewrite-prompt';
import { EnhancedSettings } from '@shared/schema';
import { PROMPTS_FOR_AI, FOLLOW_UP_SYSTEM_PROMPT } from '@/lib/prompts';

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
  const [randomPromptLoading, setRandomPromptLoading] = useState(false);
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

  // Load project versions when project changes
  useEffect(() => {
    const loadVersions = async () => {
      if (project?.id) {
        try {
          await loadProjectVersions(parseInt(project.id));
          console.log('Loaded version history for project:', project.id);
        } catch (error) {
          console.error('Failed to load version history:', error);
          // Non-critical, continue without version history
        }
      }
    };
    
    loadVersions();
  }, [project?.id, loadProjectVersions]);

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

  // Update preview when active file changes
  useEffect(() => {
    if (!project || !previewRef.current) return;
    
    const htmlFile = getFileByName('index.html');
    
    if (htmlFile) {
      let fullHtml = htmlFile.content;
      
      // Get ALL CSS files (not just style.css)
      const cssFiles = project.files.filter(f => f.name.endsWith('.css'));
      
      // Get ALL JavaScript files (not just hardcoded names)
      const jsFiles = project.files.filter(f => f.name.endsWith('.js'));
      
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
    
    // Handle custom cursor if defined
    const cursor = document.getElementById('cursor') || document.querySelector('.cursor, .custom-cursor');
    if (cursor) {
      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX - 10 + 'px';
        cursor.style.top = e.clientY - 10 + 'px';
      });
      
      // Handle hover triggers for custom cursor
      const hoverTriggers = document.querySelectorAll('.hover-trigger, a, button, [role="button"]');
      hoverTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', () => {
          cursor.classList.add('hovered', 'hover', 'active');
        });
        trigger.addEventListener('mouseleave', () => {
          cursor.classList.remove('hovered', 'hover', 'active');
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
    const loaders = document.querySelectorAll('[id*="loader"], [class*="loader"], [id*="splash"], [class*="splash"], [id*="loading"], [class*="loading"]');
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
      
      // Always inject complete JS inline (remove ALL external script references first)
      if (completeJs) {
        // Remove ALL external script references (not just hardcoded names)
        fullHtml = fullHtml.replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*><\/script>/gi, '');
        
        // Inject complete JS inline
        const bodyEnd = fullHtml.indexOf('</body>');
        if (bodyEnd > -1) {
          fullHtml = fullHtml.slice(0, bodyEnd) + 
            `\n<script>\n${completeJs}\n</script>\n` + 
            fullHtml.slice(bodyEnd);
        }
      }
      
      // Use srcdoc instead of document.write to preserve event listeners
      // This is the key fix that will make interactive elements work!
      if (previewRef.current) {
        previewRef.current.srcdoc = fullHtml;
      }
    }
  }, [project?.files, project?.activeFile]);

  const randomPrompt = () => {
    setRandomPromptLoading(true);
    setTimeout(() => {
      setPrompt(
        PROMPTS_FOR_AI[Math.floor(Math.random() * PROMPTS_FOR_AI.length)]
      );
      setRandomPromptLoading(false);
    }, 400);
  };

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
    
    // Enhance prompt ONLY for new projects when enhancement is enabled
    // Never enhance when editing existing projects
    const isNewProject = routeSessionId === 'new' || (project?.files?.length ?? 0) <= 1;
    let finalPrompt = prompt;
    if (enhancedSettings.isActive && isNewProject) {
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
        systemPrompt: isFollowUp ? FOLLOW_UP_SYSTEM_PROMPT : undefined
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
                    // Create a version for this generation (similar to v3's commit system)
                    try {
                      await createVersion(finalPrompt, finalFilesArray, isFollowUp || false);
                      console.log('Version created for project:', savedProject.id);
                    } catch (versionError) {
                      console.error('Failed to create version:', versionError);
                      // Non-critical error, continue
                    }
                    
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
            } else if (project?.id) {
              // Project already has an ID - save the update and create a version
              (async () => {
                try {
                  // Save the updated files
                  await saveProject(project.id, project.name, finalFilesArray, finalPrompt);
                  
                  // Create a version for this edit (similar to v3's commit system)
                  try {
                    await createVersion(finalPrompt, finalFilesArray, isFollowUp || true);
                    console.log('Version created for edit on project:', project.id);
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
                    // Create flexible regex for matching
                    // First try exact match
                    if (updatedContent.includes(searchBlock)) {
                      updatedContent = updatedContent.replace(searchBlock, replaceBlock);
                    } else {
                      // If exact match fails, try flexible whitespace matching
                      const flexibleSearch = searchBlock
                        .split(/\r?\n/) // Split by lines
                        .map(line => line
                          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
                          .replace(/\s+/g, '\\s+') // Flexible whitespace within lines
                        )
                        .join('\\s*\\n\\s*'); // Flexible line breaks with optional indentation
                      
                      const searchRegex = new RegExp(flexibleSearch, 'g');
                      const matches = updatedContent.match(searchRegex);
                      
                      if (matches && matches.length > 0) {
                        updatedContent = updatedContent.replace(searchRegex, replaceBlock);
                        console.log(`✅ Applied flexible SEARCH/REPLACE for ${fileName}`);
                      } else {
                        console.warn(`⚠️ Could not find match for SEARCH block in ${fileName}`);
                        console.log('Search block:', searchBlock);
                      }
                    }
                  }
                }
                
                // Update the file with modified content
                currentFiles.set(fileName, {
                  ...existingFile,
                  content: updatedContent
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
              </div>
              
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
              sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
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
              {/* Prompt Input with Dice Button */}
              <div className="relative">
                <Textarea
                  placeholder={
                    isGenerating
                      ? "Jatevo Web Builder is working..."
                      : (project?.files?.length ?? 0) > 1
                      ? "Ask Jatevo Web Builder for edits"
                      : "Describe the website you want to generate..."
                  }
                  value={isGenerating ? "" : prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
                      e.preventDefault();
                      if (!isGenerating) {
                        handleGenerate();
                      }
                    }
                  }}
                  className="min-h-[100px] resize-none border-0 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm px-4 pt-4 pb-2 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isGenerating}
                  data-testid="input-prompt"
                />
                {/* Dice Button for Random Prompt - only show for new projects */}
                {(routeSessionId === 'new' || (project?.files?.length ?? 0) <= 1) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => randomPrompt()}
                    className={`absolute top-3 right-3 h-8 w-8 p-0 text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 rounded-md ${randomPromptLoading ? 'animate-spin' : ''}`}
                    title="Get random prompt"
                    disabled={isGenerating}
                  >
                    <Dices className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {/* Menu Bar */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  {/* Conditional buttons based on project state */}
                  {(routeSessionId === 'new' || (project?.files?.length ?? 0) <= 1) ? (
                    <>
                      {/* NEW PROJECT BUTTONS */}
                      {/* Enhance Toggle */}
                      <div className="flex items-center gap-2 h-8 px-3 text-xs text-gray-400 border-r border-gray-800/50 pr-3 mr-1">
                        <Zap className={cn("w-3.5 h-3.5", enhancedSettings.isActive && "text-yellow-500")} />
                        <span>Enhance</span>
                        <Switch
                          checked={enhancedSettings.isActive}
                          onCheckedChange={(checked) => setEnhancedSettings({ isActive: checked })}
                          className="scale-75"
                          data-testid="switch-enhance"
                        />
                      </div>
                      
                      {/* Model Selector */}
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger 
                          className="h-8 w-auto min-w-[140px] px-3 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
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
                            glm-4.6
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Redesign Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                        data-testid="button-redesign"
                      >
                        <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
                        Redesign
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* EXISTING PROJECT BUTTONS (after generation) */}
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
                          className="h-8 w-auto min-w-[140px] px-3 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800/50"
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
                            glm-4.6
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
                    </>
                  )}
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