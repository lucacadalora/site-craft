import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  FolderOpen, 
  Globe, 
  Activity,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Shield
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  usersWithProjects: number;
  usersWithDeployments: number;
  totalProjects: number;
  totalDeployments: number;
}

interface UserWithActivity {
  id: number;
  email: string;
  displayName: string | null;
  tokenUsage: number;
  generationCount: number;
  lastLogin: string | null;
  createdAt: string;
  projectCount: number;
  deploymentCount: number;
}

interface UserProject {
  id: number;
  name: string;
  slug: string | null;
  published: boolean;
  publishPath: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserDeployment {
  id: number;
  slug: string;
  projectId: number | null;
  isActive: boolean;
  visitCount: number;
  lastVisitedAt: string | null;
  createdAt: string;
}

const ADMIN_EMAIL = 'lucacadalora.sg@gmail.com';

function StatCard({ title, value, icon: Icon, description }: { 
  title: string; 
  value: number | string; 
  icon: typeof Users;
  description?: string;
}) {
  return (
    <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function UserRow({ user }: { user: UserWithActivity }) {
  const [isOpen, setIsOpen] = useState(false);
  const token = localStorage.getItem('auth_token');

  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ projects: UserProject[] }>({
    queryKey: ['/api/admin/users', user.id, 'projects'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${user.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: isOpen,
  });

  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery<{ deployments: UserDeployment[] }>({
    queryKey: ['/api/admin/users', user.id, 'deployments'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${user.id}/deployments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch deployments');
      return response.json();
    },
    enabled: isOpen,
  });

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50" 
        data-testid={`user-row-${user.id}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell>
          <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{user.id}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.displayName || '-'}</TableCell>
        <TableCell className="text-center">
          <Badge variant={user.projectCount > 0 ? 'default' : 'secondary'}>
            {user.projectCount}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={user.deploymentCount > 0 ? 'default' : 'secondary'}>
            {user.deploymentCount}
          </Badge>
        </TableCell>
        <TableCell className="text-right">{user.generationCount}</TableCell>
        <TableCell className="text-right">{user.tokenUsage?.toLocaleString() || 0}</TableCell>
        <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</TableCell>
        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Projects ({user.projectCount})
                </h4>
                {projectsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : projectsData?.projects?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projectsData.projects.map((project) => (
                      <div key={project.id} className="text-sm p-2 bg-background rounded border">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{project.name}</span>
                          {project.published && (
                            <Badge variant="outline" className="text-green-600">Published</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Created: {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No projects</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Deployments ({user.deploymentCount})
                </h4>
                {deploymentsLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : deploymentsData?.deployments?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deploymentsData.deployments.map((deployment) => (
                      <div key={deployment.id} className="text-sm p-2 bg-background rounded border">
                        <div className="flex justify-between items-center">
                          <a 
                            href={`/sites/${deployment.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deployment.slug}
                          </a>
                          <Badge variant={deployment.isActive ? 'default' : 'secondary'}>
                            {deployment.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs flex justify-between">
                          <span>Visits: {deployment.visitCount}</span>
                          <span>Created: {new Date(deployment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No deployments</p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const TOKEN_KEY = 'auth_token';

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(0);
  const limit = 20;
  const token = localStorage.getItem(TOKEN_KEY);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        // Token expired - clear and redirect to login
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    retry: false,
  });

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery<{ 
    users: UserWithActivity[]; 
    total: number;
  }>({
    queryKey: ['/api/admin/users-with-activity', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users-with-activity?limit=${limit}&offset=${page * limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        // Token expired - clear and redirect to login
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: isAuthenticated && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    retry: false,
  });

  // Handle session expiration
  useEffect(() => {
    if (statsError?.message === 'Session expired' || usersError?.message === 'Session expired') {
      navigate('/login');
    }
  }, [statsError, usersError, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil((usersData?.total || 0) / limit);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users, projects, and deployments
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon={Users}
                description="Registered accounts"
              />
              <StatCard
                title="Users with Projects"
                value={stats?.usersWithProjects || 0}
                icon={FolderOpen}
                description="Generated at least 1 project"
              />
              <StatCard
                title="Users with Deployments"
                value={stats?.usersWithDeployments || 0}
                icon={Globe}
                description="Deployed at least 1 project"
              />
              <StatCard
                title="Total Projects"
                value={stats?.totalProjects || 0}
                icon={Activity}
                description="All generated projects"
              />
              <StatCard
                title="Total Deployments"
                value={stats?.totalDeployments || 0}
                icon={Globe}
                description="All published sites"
              />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>
              Click on a user row to view their projects and deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead className="text-center">Projects</TableHead>
                      <TableHead className="text-center">Deployments</TableHead>
                      <TableHead className="text-right">Generations</TableHead>
                      <TableHead className="text-right">Tokens Used</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((user) => (
                      <UserRow key={user.id} user={user} />
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * limit + 1} to {Math.min((page + 1) * limit, usersData?.total || 0)} of {usersData?.total || 0} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        data-testid="button-previous-page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages - 1}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
