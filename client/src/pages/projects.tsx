import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreVertical,
  Trash2, 
  Download,
  Eye,
  Clock,
  Code2,
  Share2,
  Settings,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import type { Project } from '@shared/schema';

interface ProjectDisplay extends Project {
  id: number;
  sessionId: string | null;
  name: string;
  thumbnail: string | null;
  files?: any[];
  prompts?: string[];
  createdAt: Date | string;
  updatedAt: Date | string | null;
}

export default function Projects() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId?: number }>({ open: false });
  const [newProjectDialog, setNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Get username from user email or display name
  const username = user?.displayName || user?.email?.split('@')[0] || 'user';
  
  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!user
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project deleted',
        description: 'Your project has been deleted successfully.'
      });
      setDeleteDialog({ open: false });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete the project. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return apiRequest('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName || 'Untitled Project',
          sessionId,
          prompt: '',
          templateId: 'default',
          category: 'general',
          files: [],
          prompts: []
        })
      });
    },
    onSuccess: (data) => {
      // Navigate to IDE with the new session ID
      navigate(`/ide/${data.sessionId}`);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create a new project. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleCreateProject = () => {
    createProjectMutation.mutate();
    setNewProjectDialog(false);
    setNewProjectName('');
  };

  const handleOpenProject = (project: ProjectDisplay) => {
    // Use sessionId if available, otherwise generate one
    const sessionId = project.sessionId || `session-${project.id}-${Date.now()}`;
    navigate(`/ide/${sessionId}`);
  };

  const handleDeleteProject = async (projectId: number) => {
    await deleteProjectMutation.mutateAsync(projectId);
  };

  const handleExportProject = async (project: ProjectDisplay) => {
    try {
      const zip = await import('jszip').then(m => new m.default());
      
      if (project.files && Array.isArray(project.files) && project.files.length > 0) {
        (project.files as any[]).forEach((file: any) => {
          zip.file(file.name || file.path, file.content || '');
        });
      } else {
        // For backward compatibility - export HTML as index.html
        zip.file('index.html', project.html || '<!-- Empty project -->');
        if (project.css) {
          zip.file('style.css', project.css);
        }
      }

      // Add a README with project info
      const readme = `# ${project.name}

Created: ${new Date(project.createdAt).toLocaleDateString()}
${project.updatedAt ? `Last Modified: ${new Date(project.updatedAt).toLocaleDateString()}` : ''}

## Prompts History
${project.prompts?.map((p: any, i: number) => `${i + 1}. ${p}`).join('\n') || 'No prompts recorded'}
`;
      zip.file('README.md', readme);

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
        title: 'Success',
        description: 'Project exported successfully'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export project',
        variant: 'destructive'
      });
    }
  };

  const getProjectThumbnail = (project: ProjectDisplay) => {
    // If project has a thumbnail, use it
    if (project.thumbnail) {
      return project.thumbnail;
    }
    
    // Generate a placeholder with gradient based on project ID
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];
    
    const index = project.id % gradients.length;
    return gradients[index];
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Card className="max-w-md bg-gray-900 border-gray-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
            <p className="text-gray-400 mb-6">
              Please login to view your projects
            </p>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-semibold text-gray-100">Jatevo Web Builder</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 hover:bg-gray-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Discord Community
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm">{username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-100">
            {username}'s Projects
          </h1>
          <p className="text-gray-400">
            Create, manage, and explore your projects.
          </p>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-5 bg-gray-800 rounded mb-2" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Create New Project Card */}
            <Card 
              className="bg-gray-900/50 border-gray-800 hover:border-gray-700 cursor-pointer group transition-all duration-200"
              onClick={() => setNewProjectDialog(true)}
            >
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-700">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Create Project</p>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-300">New Project</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Start building with AI
                </p>
              </CardContent>
            </Card>

            {/* Existing Projects */}
            {(projects as ProjectDisplay[]).map((project) => (
              <Card 
                key={project.id}
                className="bg-gray-900 border-gray-800 hover:border-gray-700 group transition-all duration-200"
              >
                <div 
                  className="aspect-video rounded-t-lg relative overflow-hidden cursor-pointer"
                  onClick={() => handleOpenProject(project)}
                  style={{
                    background: project.thumbnail ? `url(${project.thumbnail}) center/cover` : getProjectThumbnail(project),
                  }}
                >
                  {!project.thumbnail && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Code2 className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-100 line-clamp-1">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Updated {formatDistanceToNow(new Date(project.updatedAt || project.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-gray-800">
                        <DropdownMenuItem 
                          onClick={() => handleOpenProject(project)}
                          className="text-gray-300 hover:text-gray-100"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Project Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleExportProject(project)}
                          className="text-gray-300 hover:text-gray-100"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download as ZIP
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-gray-300 hover:text-gray-100" disabled>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteDialog({ open: true, projectId: project.id })}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialog} onOpenChange={setNewProjectDialog}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Create New Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Give your project a name to get started. You can change this later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name (optional)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="bg-gray-900 border-gray-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Delete Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteDialog.projectId && handleDeleteProject(deleteDialog.projectId)}
              disabled={deleteProjectMutation.isPending}
              data-testid="button-confirm-delete-project"
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};