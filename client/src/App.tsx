import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import HomeRevamped from "@/pages/home-revamped";
import Editor from "@/pages/editor";
import EditorIDE from "@/pages/editor-ide";
import Projects from "@/pages/projects";
import Login from "@/pages/login";
import TestDeployment from "@/pages/test-deployment";
import { ApiConfig } from "@shared/schema";
import { AuthProvider } from "@/contexts/auth-context";
import { ProjectProvider } from "@/contexts/ProjectContext";

// Default API config
const defaultApiConfig: ApiConfig = {
  provider: "SambaNova",
  apiKey: "", // API key should be set from environment or user input
  saveToken: true
};

import { ProtectedRoute } from "@/components/protected-route";

function Router({ apiConfig, updateApiConfig }: { apiConfig: ApiConfig, updateApiConfig: (newConfig: ApiConfig) => void }) {
  return (
    <Switch>
      <Route path="/" component={HomeRevamped} />
      <Route path="/original" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/editor">
        {() => (
          <ProtectedRoute>
            <Editor initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/editor/:id">
        {(params) => (
          <ProtectedRoute>
            <Editor id={params.id} initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ide">
        {() => (
          <ProtectedRoute>
            <EditorIDE initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ide/:sessionId">
        {(params) => (
          <ProtectedRoute>
            <EditorIDE initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/projects">
        {() => (
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/test-deployment">
        {() => (
          <ProtectedRoute>
            <TestDeployment />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Store API config in the top-level component to share across all pages
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const savedConfig = localStorage.getItem('landingcraft_api_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return {
          ...defaultApiConfig,
          ...parsed,
        };
      } catch (e) {
        console.error("Failed to parse saved API config:", e);
      }
    }
    return defaultApiConfig;
  });

  // Save API config to localStorage when it changes
  const updateApiConfig = (newConfig: ApiConfig) => {
    setApiConfig(newConfig);
    if (newConfig.saveToken) {
      localStorage.setItem('landingcraft_api_config', JSON.stringify(newConfig));
    } else {
      localStorage.removeItem('landingcraft_api_config');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <div className="min-h-screen flex flex-col">
            <Router apiConfig={apiConfig} updateApiConfig={updateApiConfig} />
            <Toaster />
          </div>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
