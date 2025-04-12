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

  // Function to fetch user stats either via stats endpoint or fallback to profile
  const fetchUserStats = () => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      
      const token = localStorage.getItem('auth_token');
      
      // First try the stats endpoint
      fetch('/api/auth/stats', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })
        .then(res => {
          if (!res.ok) {
            // If stats endpoint fails, try the profile endpoint as fallback
            return fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${token || ''}`,
              },
            }).then(profileRes => {
              if (!profileRes.ok) throw new Error('Failed to fetch user profile');
              return profileRes.json();
            });
          }
          return res.json();
        })
        .then(data => {
          // Update user stats from the data
          setUserStats({
            tokenUsage: data.tokenUsage || 0,
            generationCount: data.generationCount || 0,
            lastLogin: data.lastLogin
          });
          console.log('Updated user stats:', data.tokenUsage, data.generationCount);
        })
        .catch(err => {
          console.error('Error fetching user stats:', err);
          // Set default values if fetch fails
          setUserStats({
            tokenUsage: 0,
            generationCount: 0,
            lastLogin: null
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };
  
  // Fetch stats on initial load and when auth state changes
  useEffect(() => {
    fetchUserStats();
    
    // Add event listener for custom generation events
    const handleGeneration = () => {
      setTimeout(fetchUserStats, 1000); // Small delay to ensure DB has updated
    };
    
    // Listen for legacy event
    window.addEventListener('landing-page-generated', handleGeneration);
    
    // Set up event source listener for streaming token updates
    const setupTokenUsageEventListener = () => {
      const eventHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'token-usage-updated') {
            console.log('Received token-usage-updated event:', data);
            // Directly update stats from the event data
            setUserStats(prevStats => ({
              tokenUsage: data.tokenUsage ?? prevStats?.tokenUsage ?? 0,
              generationCount: data.generationCount ?? prevStats?.generationCount ?? 0,
              lastLogin: prevStats?.lastLogin ?? null
            }));
          }
        } catch (error) {
          console.error('Error parsing token usage event:', error);
        }
      };
      
      // Add listener to any existing event source
      document.addEventListener('message', eventHandler as EventListener);
      
      return () => {
        document.removeEventListener('message', eventHandler as EventListener);
      };
    };
    
    const cleanup = setupTokenUsageEventListener();
    
    return () => {
      window.removeEventListener('landing-page-generated', handleGeneration);
      if (cleanup) cleanup();
    };
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