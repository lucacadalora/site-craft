import React, { useEffect, useState, useRef } from 'react';
import { StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GenerationProgressBarProps {
  isGenerating: boolean;
  onStop?: () => void;
  tokenCount?: number;
  prompt?: string;
}

export function GenerationProgressBar({ 
  isGenerating, 
  onStop,
  tokenCount = 0,
  prompt
}: GenerationProgressBarProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [tokensGenerated, setTokensGenerated] = useState(0);
  const [tokensPerSecond, setTokensPerSecond] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const tokenIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isGenerating) {
      const now = Date.now();
      setStartTime(now);
      setElapsedTime(0);
      setDisplayProgress(0);
      setTokensGenerated(0);
      setTokensPerSecond(0);
      setIsStuck(false);

      // Update elapsed time and progress
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - now) / 1000; // in seconds
        setElapsedTime(elapsed);
        
        // Scale progress to 0-30 seconds
        if (elapsed <= 30) {
          // Normal progress for first 30 seconds
          const progress = (elapsed / 30) * 99; // Max 99% in 30 seconds
          setDisplayProgress(Math.min(progress, 99));
          setIsStuck(false);
        } else {
          // After 30 seconds, keep at 99% and show waiting
          setDisplayProgress(99);
          setIsStuck(true);
        }
      }, 100);

      // Simulate token generation
      tokenIntervalRef.current = setInterval(() => {
        setTokensGenerated(prev => {
          const newTokens = prev + Math.floor(Math.random() * 50) + 30;
          return newTokens;
        });
      }, 200);

    } else {
      // When generation stops, show 100% briefly
      if (startTime) {
        setDisplayProgress(100);
        setTimeout(() => {
          setStartTime(null);
          setElapsedTime(0);
          setDisplayProgress(0);
          setTokensGenerated(0);
          setTokensPerSecond(0);
          setIsStuck(false);
        }, 500);
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (tokenIntervalRef.current) {
        clearInterval(tokenIntervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current);
    };
  }, [isGenerating]);

  // Calculate tokens per second
  useEffect(() => {
    if (elapsedTime > 0) {
      setTokensPerSecond(Math.round(tokensGenerated / elapsedTime));
    }
  }, [tokensGenerated, elapsedTime]);

  if (!isGenerating && !startTime) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-gradient-to-b from-black/95 to-black/90 border-b border-gray-800 px-4 py-2">
      <div className="w-full">
        {/* Top row with title and stats */}
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-white font-medium">
              Generating with {prompt === 'cerebras' ? 'Cerebras' : 'SambaNova AI'}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-blue-400">{formatTime(elapsedTime)}</span>
            <span className="text-gray-500">•</span>
            <span className="text-green-400">{tokensGenerated.toLocaleString()} tokens</span>
            <span className="text-gray-500">•</span>
            <span className="text-yellow-400">{tokensPerSecond} tokens/s</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isStuck && (
              <span className="text-orange-400 text-xs animate-pulse">
                Please wait, generating complex content...
              </span>
            )}
            <span className="text-gray-400 min-w-[50px] text-right">
              {Math.round(displayProgress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-300 ease-out flex items-center justify-end pr-2"
            style={{ width: `${displayProgress}%` }}
          >
            {displayProgress > 15 && (
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}
          </div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Bottom row with stop button and status */}
        <div className="flex items-center justify-between mt-1">
          <div className="text-[11px] text-gray-400">
            {isStuck ? (
              <span className="text-orange-400">
                Finalizing generation... Please wait
              </span>
            ) : displayProgress < 30 ? (
              <span>Initializing AI model...</span>
            ) : displayProgress < 60 ? (
              <span>Generating HTML structure...</span>
            ) : displayProgress < 90 ? (
              <span>Adding styles...</span>
            ) : (
              <span>Finalizing code...</span>
            )}
          </div>
          
          {onStop && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onStop}
              className="h-5 px-2 text-[10px] bg-red-600 hover:bg-red-700"
            >
              <StopCircle className="w-2.5 h-2.5 mr-0.5" />
              Stop
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}