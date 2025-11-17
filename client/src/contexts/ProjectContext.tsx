import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

export interface ProjectFile {
  name: string;
  content: string;
  language: 'html' | 'css' | 'javascript' | 'unknown';
}

export interface ProjectVersion {
  id?: number;
  projectId: number;
  versionNumber: number;
  prompt: string;
  filesSnapshot: ProjectFile[];
  createdAt: Date;
  commitTitle?: string | null;
  isFollowUp?: boolean;
}

export interface Project {
  id?: string;
  sessionId?: string;
  name: string;
  files: ProjectFile[];
  activeFile?: string;
  openFiles: string[];
  prompts: string[];
  isDirty: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  versions?: ProjectVersion[];
  currentVersionIndex?: number;
}

interface ProjectContextType {
  project: Project | null;
  setProject: (project: Project | null) => void;
  createNewProject: (name?: string) => void;
  openFile: (fileName: string) => void;
  closeFile: (fileName: string) => void;
  selectFile: (fileName: string) => void;
  updateFileContent: (fileName: string, content: string) => void;
  addFile: (file: ProjectFile) => void;
  deleteFile: (fileName: string) => void;
  renameFile: (oldName: string, newName: string) => void;
  saveProject: (sessionId?: string, projectName?: string, explicitFiles?: ProjectFile[], promptText?: string) => Promise<any | null>;
  loadProject: (projectId: string) => Promise<void>;
  markAsClean: () => void;
  addPrompt: (prompt: string) => void;
  setProjectFiles: (files: ProjectFile[]) => void;
  getFileByName: (fileName: string) => ProjectFile | undefined;
  // Version management - similar to v3's commits
  createVersion: (prompt: string, files: ProjectFile[], isFollowUp?: boolean) => Promise<void>;
  loadVersion: (versionIndex: number) => void;
  loadProjectVersions: (projectId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

const getFileLanguage = (fileName: string): ProjectFile['language'] => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'javascript':
      return 'javascript';
    default:
      return 'unknown';
  }
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [project, setProjectState] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const setProject = useCallback((newProject: Project | null) => {
    setProjectState(newProject);
  }, []);

  const createNewProject = useCallback((name: string = 'Untitled Project') => {
    const newProject: Project = {
      id: undefined,  // Explicitly clear ID to ensure new projects are truly new
      sessionId: undefined,  // Clear sessionId as well
      name,
      files: [
        {
          name: 'index.html',
          content: `<!DOCTYPE html>
<html>
  <head>
    <title>My app</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="flex justify-center items-center h-screen overflow-hidden bg-white font-sans text-center px-6">
    <div class="w-full">
      <h1 class="text-4xl lg:text-6xl font-bold font-sans">
        <span class="text-2xl lg:text-4xl text-gray-400 block font-medium">I'm ready to work,</span>
        What will we make today
      </h1>
    </div>
      <img src="https://huggingface.co/deepsite/arrow.svg" class="absolute bottom-8 left-0 w-[100px] transform rotate-[30deg]" />
    <script></script>
  </body>
</html>`,
          language: 'html'
        }
      ],
      activeFile: 'index.html',
      openFiles: ['index.html'],
      prompts: [],
      isDirty: false
    };
    setProjectState(newProject);
  }, []);

  const openFile = useCallback((fileName: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      if (prev.openFiles.includes(fileName)) {
        return { ...prev, activeFile: fileName };
      }
      return {
        ...prev,
        openFiles: [...prev.openFiles, fileName],
        activeFile: fileName
      };
    });
  }, []);

  const closeFile = useCallback((fileName: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      const newOpenFiles = prev.openFiles.filter(f => f !== fileName);
      let newActiveFile = prev.activeFile;
      
      if (prev.activeFile === fileName) {
        const currentIndex = prev.openFiles.indexOf(fileName);
        if (newOpenFiles.length > 0) {
          const nextIndex = Math.min(currentIndex, newOpenFiles.length - 1);
          newActiveFile = newOpenFiles[nextIndex];
        } else {
          newActiveFile = undefined;
        }
      }
      
      return {
        ...prev,
        openFiles: newOpenFiles,
        activeFile: newActiveFile
      };
    });
  }, []);

  const selectFile = useCallback((fileName: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      return { ...prev, activeFile: fileName };
    });
  }, []);

  const updateFileContent = useCallback((fileName: string, content: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: prev.files.map(file =>
          file.name === fileName ? { ...file, content } : file
        ),
        isDirty: true
      };
    });
  }, []);

  const addFile = useCallback((file: ProjectFile) => {
    setProjectState(prev => {
      if (!prev) return null;
      if (prev.files.some(f => f.name === file.name)) {
        console.warn(`File ${file.name} already exists`);
        return prev;
      }
      return {
        ...prev,
        files: [...prev.files, file],
        isDirty: true
      };
    });
  }, []);

  const deleteFile = useCallback((fileName: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: prev.files.filter(f => f.name !== fileName),
        openFiles: prev.openFiles.filter(f => f !== fileName),
        activeFile: prev.activeFile === fileName ? undefined : prev.activeFile,
        isDirty: true
      };
    });
  }, []);

  const renameFile = useCallback((oldName: string, newName: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: prev.files.map(file =>
          file.name === oldName 
            ? { ...file, name: newName, language: getFileLanguage(newName) }
            : file
        ),
        openFiles: prev.openFiles.map(f => f === oldName ? newName : f),
        activeFile: prev.activeFile === oldName ? newName : prev.activeFile,
        isDirty: true
      };
    });
  }, []);

  const saveProject = useCallback(async (sessionId?: string, projectName?: string, explicitFiles?: ProjectFile[], promptText?: string) => {
    if (!project) return null;
    
    try {
      const token = localStorage.getItem('auth_token');
      const nameToUse = projectName || project.name || 'Untitled Project';
      const filesToSave = explicitFiles || project.files; // Use explicit files if provided
      const promptToUse = promptText || project.prompts[0] || nameToUse; // Use provided prompt or fallback
      
      if (project.id) {
        // Update existing project
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: nameToUse,
            sessionId: sessionId || project.sessionId,
            prompt: promptToUse,
            html: filesToSave.find(f => f.name === 'index.html')?.content || '',
            css: filesToSave.find(f => f.name === 'style.css' || f.name === 'styles.css')?.content || '',
            files: filesToSave,
            prompts: project.prompts
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Update project failed:', response.status, errorData);
          console.error('Attempted to update project with ID:', project.id);
          throw new Error(`Failed to update project: ${response.status} - ${errorData}`);
        }

        const savedProject = await response.json();
        setProjectState(prev => prev ? {
          ...prev,
          name: nameToUse,
          isDirty: false,
          updatedAt: new Date()
        } : null);
        return savedProject;
      } else {
        // Create new project - ensure we have all required fields
        const createPayload = {
          name: nameToUse,
          sessionId: sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          prompt: promptToUse, // This is required by backend
          templateId: 'default',
          category: 'general',
          html: filesToSave.find(f => f.name === 'index.html')?.content || '',
          css: filesToSave.find(f => f.name === 'style.css' || f.name === 'styles.css')?.content || '',
          files: filesToSave,
          prompts: promptText ? [promptText, ...project.prompts] : project.prompts
        };
        
        console.log('Creating new project with payload:', { 
          name: createPayload.name, 
          prompt: createPayload.prompt.substring(0, 50),
          filesCount: createPayload.files.length 
        });
        
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(createPayload)
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Create project failed:', response.status, errorData);
          console.error('Create payload was:', createPayload);
          throw new Error(`Failed to save project: ${response.status} - ${errorData}`);
        }

        const savedProject = await response.json();
        console.log('Project created successfully:', savedProject.id, savedProject.slug);
        
        setProjectState(prev => prev ? {
          ...prev,
          id: savedProject.id?.toString(),
          sessionId: savedProject.sessionId,
          name: nameToUse,
          isDirty: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } : null);
        return savedProject;
      }
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }, [project]);

  const loadProject = useCallback(async (projectId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const data = await response.json();
      
      // Check if data.files exists and is an array, otherwise create default files from HTML/CSS
      let files: ProjectFile[] = [];
      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        files = data.files.map((f: any) => ({
          name: f.name || f.path,
          content: f.content,
          language: getFileLanguage(f.name || f.path)
        }));
      } else {
        // Backward compatibility - create files from html/css fields
        if (data.html) {
          files.push({
            name: 'index.html',
            content: data.html,
            language: 'html'
          });
        }
        if (data.css) {
          files.push({
            name: 'styles.css',
            content: data.css,
            language: 'css'
          });
        }
      }

      const loadedProject: Project = {
        id: data.id?.toString(),
        name: data.name,
        files,
        activeFile: files[0]?.name,
        openFiles: files[0]?.name ? [files[0].name] : [],
        prompts: data.prompts || [],
        isDirty: false,
        createdAt: new Date(data.createdAt),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
      };

      setProjectState(loadedProject);
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }, []);

  const markAsClean = useCallback(() => {
    setProjectState(prev => prev ? { ...prev, isDirty: false } : null);
  }, []);

  const addPrompt = useCallback((prompt: string) => {
    setProjectState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        prompts: [...prev.prompts, prompt],
        isDirty: true
      };
    });
  }, []);

  const setProjectFiles = useCallback((files: ProjectFile[]) => {
    setProjectState(prev => {
      if (!prev) {
        // Create a new project if none exists
        const newProject: Project = {
          name: 'AI Generated Project',
          files,
          activeFile: files[0]?.name,
          openFiles: files[0]?.name ? [files[0].name] : [],
          prompts: [],
          isDirty: true
        };
        return newProject;
      }
      return {
        ...prev,
        files,
        activeFile: files[0]?.name || prev.activeFile,
        openFiles: files[0]?.name && !prev.openFiles.includes(files[0].name) 
          ? [...prev.openFiles, files[0].name] 
          : prev.openFiles,
        isDirty: true
      };
    });
  }, []);

  const getFileByName = useCallback((fileName: string): ProjectFile | undefined => {
    return project?.files.find(f => f.name === fileName);
  }, [project]);

  // Version management methods - similar to v3's commits functionality
  const createVersion = useCallback(async (prompt: string, files: ProjectFile[], isFollowUp: boolean = false) => {
    if (!project || !project.id) {
      console.warn('Cannot create version without a saved project');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const versionNumber = (project.versions?.length || 0) + 1;
      
      // Create version in database
      const response = await fetch(`/api/projects/${project.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectId: parseInt(project.id),
          versionNumber,
          prompt,
          filesSnapshot: files,
          isFollowUp,
          commitTitle: isFollowUp ? `Follow-up: ${prompt.substring(0, 50)}...` : `Initial: ${prompt.substring(0, 50)}...`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create version');
      }

      const newVersion = await response.json();
      
      // Update local state
      setProjectState(prev => {
        if (!prev) return null;
        const versions = [...(prev.versions || []), newVersion];
        return {
          ...prev,
          versions,
          currentVersionIndex: versions.length - 1
        };
      });
      
      // Invalidate the versions query to refresh the History component
      // Import queryClient at the top of the file if not already imported
      const { queryClient } = await import('@/lib/queryClient');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/versions`] });
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  }, [project]);

  const loadVersion = useCallback((versionIndex: number) => {
    if (!project || !project.versions || !project.versions[versionIndex]) {
      console.warn('Invalid version index');
      return;
    }

    const version = project.versions[versionIndex];
    setProjectState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: version.filesSnapshot,
        currentVersionIndex: versionIndex,
        activeFile: version.filesSnapshot[0]?.name,
        openFiles: version.filesSnapshot[0]?.name ? [version.filesSnapshot[0].name] : []
      };
    });
  }, [project]);

  const loadProjectVersions = useCallback(async (projectId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to load project versions');
      }

      const versions = await response.json();
      
      setProjectState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          versions,
          currentVersionIndex: versions.length > 0 ? versions.length - 1 : undefined
        };
      });
    } catch (error) {
      console.error('Error loading project versions:', error);
      throw error;
    }
  }, []);

  const value: ProjectContextType = {
    project,
    setProject,
    createNewProject,
    openFile,
    closeFile,
    selectFile,
    updateFileContent,
    addFile,
    deleteFile,
    renameFile,
    saveProject,
    loadProject,
    markAsClean,
    addPrompt,
    setProjectFiles,
    getFileByName,
    createVersion,
    loadVersion,
    loadProjectVersions
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};