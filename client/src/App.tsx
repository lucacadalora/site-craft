import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Editor from "@/pages/editor";
import Login from "@/pages/login";
import { ApiConfig } from "@shared/schema";
import { AuthProvider } from "@/contexts/auth-context";

// Default API config
const defaultApiConfig: ApiConfig = {
  provider: "AI Accelerate (DeepSeek-V3-0324)",
  apiKey: "9f5d2696-9a9f-43a6-9778-ebe727cd2968",
  saveToken: true
};

function Router({ apiConfig, updateApiConfig }: { apiConfig: ApiConfig, updateApiConfig: (newConfig: ApiConfig) => void }) {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/editor">
        {() => <Editor initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />}
      </Route>
      <Route path="/editor/:id">
        {(params) => <Editor id={params.id} initialApiConfig={apiConfig} onApiConfigChange={updateApiConfig} />}
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
        <div className="min-h-screen flex flex-col">
          <Router apiConfig={apiConfig} updateApiConfig={updateApiConfig} />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
