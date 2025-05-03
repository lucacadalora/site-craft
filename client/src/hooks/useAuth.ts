import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

export function useAuth(): UseAuthResult {
  const { data, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    user: data || null,
    isLoading,
    isAuthenticated: !!data,
    error: error as Error | null,
  };
}