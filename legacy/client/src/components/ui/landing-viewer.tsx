import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface LandingViewerProps {
  publishedUrl: string;
  onBack: () => void;
}

export function LandingViewer({ publishedUrl, onBack }: LandingViewerProps) {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-2 border-b bg-card">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to editor</span>
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{publishedUrl}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(publishedUrl, '_blank')}
          >
            Open in new tab
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-100 w-full">
        <iframe
          src={publishedUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Published landing page preview"
        />
      </div>
    </div>
  );
}