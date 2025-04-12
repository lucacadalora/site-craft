import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User, Zap, FileText, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userStats, setUserStats] = useState<{ 
    tokenUsage: number;
    generationCount: number;
    lastLogin?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      fetch('/api/auth/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch user stats');
          return res.json();
        })
        .then(data => {
          setUserStats(data);
        })
        .catch(err => {
          console.error('Error fetching user stats:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully.',
    });
    setLocation('/');
  };

  if (!isAuthenticated) {
    return (
      <Button variant="outline" onClick={() => setLocation('/login')}>
        Login
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{user?.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>{user?.email}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Usage Statistics</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Zap className="mr-2 h-4 w-4" />
            <span>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `Token Usage: ${userStats?.tokenUsage || 0}`
              )}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" />
            <span>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `Generations: ${userStats?.generationCount || 0}`
              )}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}