import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { User } from "@shared/schema";
import { useAuth as useReplitAuth } from "@/hooks/useAuth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use our Replit Auth hook to manage authentication state
  const { user, isLoading, isAuthenticated, token } = useReplitAuth();

  const logout = () => {
    // Clear the token from localStorage 
    localStorage.removeItem('auth_token');
    
    // Redirect to server-side logout endpoint
    window.location.href = "/api/logout";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};