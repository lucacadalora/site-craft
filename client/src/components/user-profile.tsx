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
      console.log('Fetching user stats with token:', token ? 'Token available' : 'No token');
      
      // First try the stats endpoint
      fetch('/api/auth/stats', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      })
        .then(res => {
          console.log('Stats endpoint response status:', res.status);
          if (!res.ok) {
            console.log('Stats endpoint failed, trying profile endpoint');
            // If stats endpoint fails, try the profile endpoint as fallback
            return fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
            }).then(profileRes => {
              console.log('Profile endpoint response status:', profileRes.status);
              if (!profileRes.ok) {
                console.error('Failed to fetch user profile, status:', profileRes.status);
                throw new Error('Failed to fetch user profile');
              }
              return profileRes.json();
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('Received user stats data:', data);
          // Update user stats from the data
          setUserStats({
            tokenUsage: data.tokenUsage || 0,
            generationCount: data.generationCount || 0,
            lastLogin: data.lastLogin
          });
          console.log('Updated user stats:', data.tokenUsage, data.generationCount);
          
          // Store last response for fallbacks
          (window as any).lastUserStatsResponse = data;
        })
        .catch(err => {
          console.error('Error fetching user stats:', err);
          
          // Check if we have a stored response from previous successful fetch
          const lastStats = (window as any).lastUserStatsResponse;
          if (lastStats) {
            console.log('Using cached stats data:', lastStats);
            setUserStats({
              tokenUsage: lastStats.tokenUsage || 0,
              generationCount: lastStats.generationCount || 0,
              lastLogin: lastStats.lastLogin
            });
          } else {
            // Set default values if fetch fails
            setUserStats({
              tokenUsage: 0,
              generationCount: 0,
              lastLogin: null
            });
          }
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
    
    // Add event handler for token-usage-updated custom event
    const handleTokenUpdate = (event: CustomEvent) => {
      console.log('User profile received token-usage-updated event:', event.detail);
      if (event.detail) {
        // First update local state
        const newStats = {
          tokenUsage: event.detail.tokenUsage ?? userStats?.tokenUsage ?? 0,
          generationCount: event.detail.generationCount ?? userStats?.generationCount ?? 0,
          lastLogin: userStats?.lastLogin ?? null
        };
        
        console.log('Updating stats from event to:', newStats);
        setUserStats(newStats);
        
        // Also force a fresh fetch after a brief delay
        setTimeout(() => {
          console.log('Refreshing stats after token update event');
          fetchUserStats();
        }, 2000);
      } else {
        // If there's no detail, just refresh the stats
        fetchUserStats();
      }
    };
    
    // Listen for legacy event
    window.addEventListener('landing-page-generated', handleGeneration);
    
    // Listen for the new direct token count detection event
    const handleTokenCountDetected = (event: any) => {
      if (event.detail && event.detail.tokenCount) {
        console.log('Token count detected:', event.detail.tokenCount);
        // Directly record the token count
        if ((window as any).recordTokenUsage) {
          console.log('Recording token usage from detected event:', event.detail.tokenCount);
          (window as any).recordTokenUsage(event.detail.tokenCount);
        }
      }
    };
    window.addEventListener('token-count-detected', handleTokenCountDetected);
    
    // Listen for the existing token-usage-updated events
    document.addEventListener('token-usage-updated', handleTokenUpdate as EventListener);
    window.addEventListener('token-usage-updated' as any, handleTokenUpdate as EventListener);

// Force the browser to manually fetch stats after generation
document.addEventListener('complete', () => {
  console.log('Generation complete event detected, updating user stats');
  setTimeout(fetchUserStats, 1000);
});

// Add direct dispatch and debug methods to the window for testing
(window as any).refreshUserStats = fetchUserStats;
(window as any).debugUserStats = () => {
  console.log('Current user stats:', userStats);
  fetchUserStats();
};

// Add a method to manually record token usage from the UI
(window as any).recordTokenUsage = (tokenCount: number) => {
  if (!isAuthenticated) {
    console.error('Cannot record token usage: User not authenticated');
    return;
  }
  
  console.log(`Recording token usage manually: ${tokenCount}`);
  const token = localStorage.getItem('auth_token');
  
  fetch('/api/usage/record', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokenCount })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`Failed to record token usage: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    console.log('Token usage recorded successfully:', data);
    // Update local state
    setUserStats({
      tokenUsage: data.tokenUsage || 0,
      generationCount: data.generationCount || 0,
      lastLogin: userStats?.lastLogin || null
    });
    // Show success message
    toast({
      title: 'Token usage updated',
      description: `Recorded ${tokenCount} tokens. New total: ${data.tokenUsage}`,
    });
  })
  .catch(error => {
    console.error('Error recording token usage:', error);
    toast({
      title: 'Error recording token usage',
      description: error.message,
      variant: 'destructive'
    });
  });
};
    
    return () => {
      // Clean up all event listeners
      window.removeEventListener('landing-page-generated', handleGeneration);
      window.removeEventListener('token-count-detected', handleTokenCountDetected);
      document.removeEventListener('token-usage-updated', handleTokenUpdate as EventListener);
      window.removeEventListener('token-usage-updated' as any, handleTokenUpdate as EventListener);
      document.removeEventListener('complete', () => {});
      
      // Remove debug methods
      delete (window as any).refreshUserStats;
      delete (window as any).debugUserStats;
      delete (window as any).recordTokenUsage;
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