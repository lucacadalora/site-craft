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
    
    // Then, call logout endpoint to clear session if needed
    try {
      await fetch('/api/logout', { credentials: 'include' });
    } catch (err) {
      console.error('Error during logout:', err);
    }
    
    // Refresh page to reset all client state
    window.location.href = '/';
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