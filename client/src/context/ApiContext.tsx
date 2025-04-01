import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ApiConfig } from '@shared/schema';

// Default API config
const defaultApiConfig: ApiConfig = {
  provider: "OpenAI (GPT-4o)",
  apiKey: "",
  saveToken: true
};

interface ApiContextType {
  apiConfig: ApiConfig;
  updateApiConfig: (config: ApiConfig) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  // Store API config in the context provider
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
    <ApiContext.Provider value={{ apiConfig, updateApiConfig }}>
      {children}
    </ApiContext.Provider>
  );
}

// Custom hook to use the API context
export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}