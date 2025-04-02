import React, { useEffect, useState } from 'react';

interface GenerationStatusProps {
  status: string[];
  processingItem?: string;
  percentComplete?: number;
}

export function GenerationStatus({ 
  status, 
  processingItem, 
  percentComplete 
}: GenerationStatusProps) {
  // Keep status component visible for at least some time even if percentComplete reaches 100%
  const [showProgress, setShowProgress] = useState(true);
  
  // When percentComplete changes to 100, delay hiding the progress bar
  useEffect(() => {
    if (percentComplete && percentComplete >= 100) {
      // Keep showing progress bar for a while even after reaching 100%
      const timer = setTimeout(() => {
        setShowProgress(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowProgress(true);
    }
  }, [percentComplete]);

  return (
    <div className="bg-blue-950 text-gray-200 rounded-lg p-4 text-sm font-mono overflow-hidden">
      <div className="flex items-center mb-1">
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-white">Generating with AI Accelerate</span>
      </div>
      
      {processingItem && (
        <div className="mb-1 text-gray-300">
          Processing: {processingItem}
        </div>
      )}
      
      {status.map((line, index) => {
        // Check if the line contains a checkmark or success message
        const isSuccess = line.includes('✅') || line.toLowerCase().includes('success');
        // Check if the line contains an error or warning
        const isError = line.includes('⚠️') || line.toLowerCase().includes('error');
        
        return (
          <div 
            key={index} 
            className={`mb-1 ${isSuccess ? 'text-green-400' : ''} ${isError ? 'text-yellow-400' : ''}`}
          >
            {line}
          </div>
        );
      })}
      
      {/* Always show the progress bar during generation regardless of percentComplete */}
      <div className="mt-2">
        <div className="flex items-center">
          <div className="h-2 bg-blue-900 rounded-full w-full">
            <div 
              className="h-2 bg-blue-400 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${Math.min(percentComplete || 0, 100)}%` }}
            ></div>
          </div>
          <span className="ml-2 text-blue-300 min-w-[4rem] text-right">
            {Math.min(Math.round(percentComplete || 0), 100)}% 
          </span>
        </div>
      </div>
    </div>
  );
}