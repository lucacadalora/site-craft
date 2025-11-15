import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers to prevent Vite error overlay from showing for non-critical errors
window.addEventListener('unhandledrejection', (event) => {
  // Suppress Vite HMR WebSocket errors (common in Replit environment)
  if (event.reason?.message?.includes('WebSocket') || 
      event.reason?.message?.includes('wss://localhost')) {
    event.preventDefault();
    console.debug('Suppressed WebSocket error:', event.reason);
    return;
  }
  
  // Log other unhandled rejections but don't show overlay
  console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  // Suppress Vite HMR errors
  if (event.message?.includes('WebSocket') || 
      event.message?.includes('wss://localhost')) {
    event.preventDefault();
    console.debug('Suppressed error:', event.message);
    return;
  }
});

// Get the root element and render the app
createRoot(document.getElementById("root")!).render(<App />);
