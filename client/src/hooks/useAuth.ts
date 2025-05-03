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
    enabled: !!token, // Only run the query if we have a token
  });
  
  // If we have a token but no user data, refetch when token changes
  useEffect(() => {
    if (token && !user) {
      console.log("Refetching user data with token");
      refetch();
    }
  }, [token, refetch, user]);

  return {
    user,
    isLoading: isLoading && !!token, // Only show loading if we're actually trying to fetch
    error,
    isAuthenticated: !!user,
    token
  };
}