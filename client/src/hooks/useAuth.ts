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
    
    // Force clearing of any residual state and client cache
    // Clear React Query cache
    try {
      // Attempt to clear React Query cache
      const anyWindow = window as any;
      if (anyWindow.__REACT_QUERY_GLOBAL_CACHE__) {
        anyWindow.__REACT_QUERY_GLOBAL_CACHE__.clear();
      }
      
      // Clear any session storage that might be related to auth
      sessionStorage.clear();
      
      // Clear any auth-related cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch (e) {
      console.error('Error clearing cache:', e);
    }

    // Redirect to home page with hard refresh after short delay to ensure cleanup is done
    setTimeout(() => {
      console.log('Logout complete, redirecting to home');
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