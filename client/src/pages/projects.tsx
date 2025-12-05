import { useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Settings,
  Copy,
  Globe,
  ExternalLink,
  Rocket,
  RefreshCw,
  CheckCircle2
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

interface ProjectSummary {
  id: number;
  sessionId: string | null;
  slug?: string | null;
  name: string;
  thumbnail: string | null;
  published: boolean | null;
  publishPath: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

interface ProjectSummaryResponse {
  projects: ProjectSummary[];
  total: number;
}

interface DeploymentInfo {
  id: number;
  slug: string;
  projectId: number | null;
  html?: string;
  customDomains?: Array<{
    id: number;
    domain: string;
    verified: boolean;
  }>;
  createdAt: Date | string;
}

export default function Projects() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId?: number }>({ open: false });
  
  // Get username from user email
  const username = user?.email?.split('@')[0] || 'user';
  
  // Pagination state
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 12;

  // Fetch projects (summary - lightweight)
  const { data: projectsData, isLoading, isFetching } = useQuery<ProjectSummaryResponse>({
    queryKey: ['/api/projects/summary', page],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/projects/summary?limit=${ITEMS_PER_PAGE}&offset=${page * ITEMS_PER_PAGE}`, {
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: !!user
  });

  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.total || 0;
  const hasMore = (page + 1) * ITEMS_PER_PAGE < totalProjects;

  // Fetch user's deployments
  const { data: deployments = [] } = useQuery<DeploymentInfo[]>({
    queryKey: ['/api/deployments'],
    enabled: !!user
  });

  // Create a map of projectId -> deployment for quick lookup
  const deploymentsByProjectId = (deployments as DeploymentInfo[]).reduce((acc, deployment) => {
    if (deployment.projectId) {
      acc[deployment.projectId] = deployment;
    }
    return acc;
  }, {} as Record<number, DeploymentInfo>);

  // Get orphan deployments (deployments without linked projects)
  const orphanDeployments = (deployments as DeploymentInfo[]).filter(d => !d.projectId);

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/projects/summary'
      });
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

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      return apiRequest('POST', `/api/domains/${domainId}/verify`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deployments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/domains'] });
      if (data.verified) {
        toast({
          title: 'Domain Verified',
          description: 'Your custom domain is now active and serving your site.'
        });
      } else {
        toast({
          title: 'Verification Pending',
          description: 'DNS records not found yet. Please ensure your DNS settings are correct and try again in a few minutes.',
          variant: 'destructive'
        });
      }
    },
    onError: () => {
      toast({
        title: 'Verification Failed',
        description: 'Could not verify domain. Please check your DNS settings.',
        variant: 'destructive'
      });
    }
  });

  // Convert orphan deployment to project mutation
  const convertToProjectMutation = useMutation({
    mutationFn: async (slug: string) => {
      return apiRequest('POST', `/api/deployments/${slug}/convert-to-project`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deployments'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/projects/summary'
      });
      
      if (data.projectId) {
        toast({
          title: 'Project Created',
          description: 'Opening your project in the editor...'
        });
        navigate(`/ide/${data.projectId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to convert deployment to project.',
        variant: 'destructive'
      });
    }
  });

  // Handle opening orphan deployment (converts to project first)
  const handleOpenOrphanDeployment = async (slug: string) => {
    convertToProjectMutation.mutate(slug);
  };

  const handleCreateProject = () => {
    // Simply navigate to /ide/new - no need to create project yet
    navigate('/ide/new');
  };

  const handleOpenProject = (project: ProjectSummary) => {
    // Use slug if available, otherwise use sessionId or ID
    const identifier = project.slug || project.sessionId || project.id.toString();
    navigate(`/ide/${identifier}`);
  };

  const handleDeleteProject = async (projectId: number) => {
    await deleteProjectMutation.mutateAsync(projectId);
  };

  const handleExportProject = async (projectSummary: ProjectSummary) => {
    try {
      toast({
        title: 'Preparing export...',
        description: 'Fetching project files'
      });

      // Fetch full project data for export
      const response = await fetch(`/api/projects/${projectSummary.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      const project = await response.json();

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

Created: ${project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
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

  const getProjectThumbnail = (project: ProjectSummary) => {
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
              onClick={handleCreateProject}
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
            {(projects as ProjectSummary[]).map((project) => {
              const deployment = deploymentsByProjectId[project.id];
              const hasCustomDomain = deployment?.customDomains && deployment.customDomains.length > 0;
              const verifiedDomain = deployment?.customDomains?.find(d => d.verified);
              
              return (
                <Card 
                  key={project.id}
                  className="bg-gray-900 border-gray-800 hover:border-gray-700 group transition-all duration-200"
                  data-testid={`card-project-${project.id}`}
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
                    
                    {/* Deployed Badge */}
                    {deployment && (
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <div 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-500/90 text-white"
                          title={`Deployed at /sites/${deployment.slug}`}
                        >
                          <Rocket className="w-3 h-3" />
                          Live
                        </div>
                        {hasCustomDomain && !verifiedDomain && (
                          <div 
                            className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-amber-500/90 text-white"
                            title={`Domain pending verification: ${deployment.customDomains![0].domain}`}
                          >
                            <Globe className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{deployment.customDomains![0].domain}</span>
                            <span className="text-amber-200">• Pending</span>
                          </div>
                        )}
                        {hasCustomDomain && verifiedDomain && (
                          <div 
                            className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-purple-500/90 text-white"
                            title={`Custom domain active: ${verifiedDomain.domain}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{verifiedDomain.domain}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-100 line-clamp-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Updated {project.updatedAt || project.createdAt 
                            ? formatDistanceToNow(new Date(project.updatedAt || project.createdAt!), { addSuffix: true })
                            : 'recently'}</span>
                        </div>
                        {/* Show deployment URL if deployed */}
                        {deployment && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">
                              {hasCustomDomain ? deployment.customDomains![0].domain : `/sites/${deployment.slug}`}
                            </span>
                          </div>
                        )}
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
                          {deployment && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => {
                                  const url = hasCustomDomain && verifiedDomain 
                                    ? `https://${verifiedDomain.domain}` 
                                    : `/sites/${deployment.slug}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-green-400 hover:text-green-300"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Live Site
                              </DropdownMenuItem>
                              {hasCustomDomain && !verifiedDomain && deployment.customDomains![0].id && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    verifyDomainMutation.mutate(deployment.customDomains![0].id);
                                  }}
                                  className="text-amber-400 hover:text-amber-300"
                                  disabled={verifyDomainMutation.isPending}
                                >
                                  <RefreshCw className={`w-4 h-4 mr-2 ${verifyDomainMutation.isPending ? 'animate-spin' : ''}`} />
                                  {verifyDomainMutation.isPending ? 'Verifying...' : 'Verify Domain'}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
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
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalProjects > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
              className="border-gray-700 hover:bg-gray-800"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {page + 1} of {Math.ceil(totalProjects / ITEMS_PER_PAGE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || isFetching}
              className="border-gray-700 hover:bg-gray-800"
            >
              {isFetching ? 'Loading...' : 'Next'}
            </Button>
          </div>
        )}

        {/* Orphan Deployments Section - Deployments without linked projects */}
        {orphanDeployments.length > 0 && (
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-400" />
                Standalone Deployments
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                These are deployed sites that aren't linked to any project. You can still manage them here.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {orphanDeployments.map((deployment) => {
                const hasCustomDomain = deployment.customDomains && deployment.customDomains.length > 0;
                const verifiedDomain = deployment.customDomains?.find(d => d.verified);
                
                // Generate a gradient for the thumbnail
                const gradients = [
                  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                ];
                const gradientIndex = deployment.id % gradients.length;
                
                return (
                  <Card 
                    key={`orphan-${deployment.id}`}
                    className="bg-gray-900 border-amber-800/30 hover:border-amber-700/50 group transition-all duration-200"
                    data-testid={`card-orphan-deployment-${deployment.id}`}
                  >
                    <div 
                      className="aspect-video rounded-t-lg relative overflow-hidden cursor-pointer"
                      onClick={() => handleOpenOrphanDeployment(deployment.slug)}
                      style={{ background: gradients[gradientIndex] }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Rocket className="w-8 h-8 text-white/30" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        {convertToProjectMutation.isPending ? (
                          <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        ) : (
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      
                      {/* Deployed Badge */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <div 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-500/90 text-white"
                          title={`Deployed at /sites/${deployment.slug}`}
                        >
                          <Rocket className="w-3 h-3" />
                          Live
                        </div>
                        {hasCustomDomain && !verifiedDomain && (
                          <div 
                            className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-amber-500/90 text-white"
                            title={`Domain pending verification: ${deployment.customDomains![0].domain}`}
                          >
                            <Globe className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{deployment.customDomains![0].domain}</span>
                            <span className="text-amber-200">• Pending</span>
                          </div>
                        )}
                        {hasCustomDomain && verifiedDomain && (
                          <div 
                            className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-purple-500/90 text-white"
                            title={`Custom domain active: ${verifiedDomain.domain}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{verifiedDomain.domain}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Orphan indicator */}
                      <div className="absolute top-2 left-2">
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-amber-600/90 text-white">
                          Standalone
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-100 line-clamp-1">
                            /{deployment.slug}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Deployed {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">
                              {hasCustomDomain ? deployment.customDomains![0].domain : `/sites/${deployment.slug}`}
                            </span>
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
                              onClick={() => handleOpenOrphanDeployment(deployment.slug)}
                              className="text-blue-400 hover:text-blue-300"
                              disabled={convertToProjectMutation.isPending}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              {convertToProjectMutation.isPending ? 'Opening...' : 'Edit in IDE'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                const url = hasCustomDomain && verifiedDomain 
                                  ? `https://${verifiedDomain.domain}` 
                                  : `/sites/${deployment.slug}`;
                                window.open(url, '_blank');
                              }}
                              className="text-green-400 hover:text-green-300"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Live Site
                            </DropdownMenuItem>
                            {hasCustomDomain && !verifiedDomain && deployment.customDomains![0].id && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  verifyDomainMutation.mutate(deployment.customDomains![0].id);
                                }}
                                className="text-amber-400 hover:text-amber-300"
                                disabled={verifyDomainMutation.isPending}
                              >
                                <RefreshCw className={`w-4 h-4 mr-2 ${verifyDomainMutation.isPending ? 'animate-spin' : ''}`} />
                                {verifyDomainMutation.isPending ? 'Verifying...' : 'Verify Domain'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/sites/${deployment.slug}`);
                                toast({
                                  title: 'Copied',
                                  description: 'URL copied to clipboard'
                                });
                              }}
                              className="text-gray-300 hover:text-gray-100"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

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