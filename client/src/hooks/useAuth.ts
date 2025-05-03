import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useEffect, useState } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  
  // Load token from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      console.log("Found auth token in localStorage:", storedToken.substring(0, 15) + "...");
    }
  }, []);
  
  const { 
    data: user, 
    isLoading, 
    error,
    refetch
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Always run the query - will use JWT token if available or check for Replit Auth session
  });
  
  // If we have a token but no user data, refetch when token changes
  useEffect(() => {
    if (token && !user) {
      console.log("Refetching user data with token");
      refetch();
    }
  }, [token, refetch, user]);

  // Handle logging out
  const logout = async () => {
    // First, clear local token
    localStorage.removeItem('auth_token');
    setToken(null);
    
    try {
      // Try to use Replit Auth logout endpoint first
      const replitAuthResponse = await fetch('/api/auth/logout', { 
        credentials: 'include',
        method: 'GET'
      });
      
      if (!replitAuthResponse.ok) {
        // Fallback to traditional logout
        await fetch('/api/logout', { 
          credentials: 'include',
          method: 'POST'
        });
      }
      
      console.log("Logout successful");
    } catch (err) {
      console.error('Error during logout:', err);
    }
    
    // Force a reload to clear all client state
    setTimeout(() => {
      window.location.href = '/';
    }, 300);
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    token,
    logout
  };
}