import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Editor from "@/pages/editor";
import { ApiConfig } from "@shared/schema";

// Default API config
const defaultApiConfig: ApiConfig = {
  provider: "SambaNova (DeepSeek-V3-0324)",
  apiKey: "",
  saveToken: true
};

function Router({ apiConfig, updateApiConfig }: { apiConfig: ApiConfig, updateApiConfig: (newConfig: ApiConfig) => void }) {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <div className="min-h-screen flex flex-col">
        <Router apiConfig={apiConfig} updateApiConfig={updateApiConfig} />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
