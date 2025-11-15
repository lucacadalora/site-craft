import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  FolderOpen, 
  Trash2, 
  Edit, 
  ArrowLeft,
  Calendar,
  FileCode,
  Search,
  Download
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

interface Project {
  id: string;
  name: string;
  files?: any[];
  prompts?: string[];
  createdAt: string;
  updatedAt?: string;
}

export default function Projects() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  
  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!user
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive'
      });
    }
  });

  const filteredProjects = (projects as Project[]).filter((project: Project) => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteProject = async (projectId: string) => {
    await deleteProjectMutation.mutateAsync(projectId);
    setDeleteProjectId(null);
  };

  const handleExportProject = async (project: Project) => {
    try {
      const zip = await import('jszip').then(m => new m.default());
      
      if (project.files && project.files.length > 0) {
        project.files.forEach((file: any) => {
          zip.file(file.name || file.path, file.content || '');
        });
      } else {
        // For backward compatibility - export HTML as index.html
        zip.file('index.html', '<!-- Empty project -->');
      }

      // Add a README with project info
      const readme = `# ${project.name}

Created: ${new Date(project.createdAt).toLocaleDateString()}
${project.updatedAt ? `Last Modified: ${new Date(project.updatedAt).toLocaleDateString()}` : ''}

## Prompts History
${project.prompts?.map((p, i) => `${i + 1}. ${p}`).join('\n') || 'No prompts recorded'}
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please login to view your projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Projects</h1>
              <p className="text-muted-foreground">
                Manage your saved landing page projects
              </p>
            </div>
            
            <Link href="/ide">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-projects"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query' 
                  : 'Create your first project to get started'}
              </p>
              {!searchQuery && (
                <Link href="/ide">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project: Project) => (
              <Card 
                key={project.id}
                className="group hover:shadow-lg transition-shadow"
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* File Count */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCode className="w-4 h-4" />
                      <span>
                        {project.files && project.files.length > 0 
                          ? `${project.files.length} file${project.files.length > 1 ? 's' : ''}`
                          : 'Single HTML file'}
                      </span>
                    </div>
                    
                    {/* Prompts Count */}
                    {project.prompts && project.prompts.length > 0 && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {project.prompts.length} prompt{project.prompts.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/ide/${project.id}`} className="flex-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          data-testid={`button-open-${project.id}`}
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Open
                        </Button>
                      </Link>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportProject(project)}
                        title="Export project"
                        data-testid={`button-export-${project.id}`}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteProjectId(project.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete project"
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteProjectId(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
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