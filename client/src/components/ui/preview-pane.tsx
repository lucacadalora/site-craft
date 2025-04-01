import React, { useRef, useEffect } from "react";
import { RefreshCw, FileCode } from "lucide-react";

interface PreviewPaneProps {
  html: string | null;
  css: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function PreviewPane({ html, css, isLoading, onRefresh }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe content when HTML or CSS changes
  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        const combinedHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${css || ''}</style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;
        doc.write(combinedHTML);
        doc.close();
      }
    }
  }, [html, css]);

  return (
    <div className="w-full md:w-1/2 bg-gray-100 border-l border-gray-200 flex flex-col">
      <div className="p-2 bg-gray-800 text-gray-200 flex items-center text-xs">
        <span className="flex-1 text-center">Preview</span>
        <button 
          className="p-1 hover:bg-gray-700 rounded"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto relative">
        {/* Placeholder for empty state */}
        {!html && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-4">
            <FileCode className="h-12 w-12 mb-2" />
            <p className="text-sm text-center max-w-xs">
              Generate your landing page to see a preview here. The preview updates in real-time as you make changes.
            </p>
          </div>
        )}
        
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-70 text-gray-700 p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm font-medium mt-4">Generating your landing page...</p>
          </div>
        )}
        
        {/* Actual preview iframe */}
        <iframe 
          ref={iframeRef}
          className={`w-full h-full border-0 ${(!html || isLoading) ? 'invisible' : 'visible'}`} 
          title="Landing Page Preview"
          sandbox="allow-same-origin"
        ></iframe>
      </div>
    </div>
  );
}
