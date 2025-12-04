import { useRef, useState, useEffect } from 'react';
import { ArrowUp, Dice6, CircleStop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhanceButton } from './ChatBar/EnhanceButton';
import { ModelSelector } from './ChatBar/ModelSelector';
import { RedesignButton } from './ChatBar/RedesignButton';
import { AddContextButton } from './ChatBar/AddContextButton';
import { AttachButton } from './ChatBar/AttachButton';
import { EditButton } from './ChatBar/EditButton';
import { toast } from '@/hooks/use-toast';

interface ChatBarProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  isNewProject: boolean;
  onGenerate: () => void;
  onStop: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  htmlContent: string;
  enableEnhance: boolean;
  setEnableEnhance: (enable: boolean) => void;
  onRedesign?: (markdown: string, url: string) => void;
}

export function ChatBar({
  prompt,
  setPrompt,
  isGenerating,
  isNewProject,
  onGenerate,
  onStop,
  selectedModel,
  setSelectedModel,
  htmlContent,
  enableEnhance,
  setEnableEnhance,
  onRedesign,
}: ChatBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [randomPromptLoading, setRandomPromptLoading] = useState(false);

  const SAMPLE_PROMPTS = [
    "Create a modern SaaS landing page with pricing tiers",
    "Build a portfolio website for a photographer",
    "Design an e-commerce product page with reviews",
    "Create a restaurant website with menu and reservations",
    "Build a fitness app landing page with testimonials",
    "Design a tech startup homepage with features section",
  ];

  const handleRandomPrompt = () => {
    setRandomPromptLoading(true);
    setTimeout(() => {
      const randomPrompt = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
      setPrompt(randomPrompt);
      setRandomPromptLoading(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onGenerate();
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Properly detect if this is a new project (no content generated yet)
  const showNewProjectButtons = isNewProject;

  return (
    <div className="p-3 w-full">
      <div className="relative bg-neutral-800 border border-neutral-700 rounded-2xl ring-[4px] focus-within:ring-neutral-500/30 focus-within:border-neutral-600 ring-transparent z-20 w-full group">
        {/* Main input area */}
        <div className="w-full relative flex items-center justify-between">
          {/* Loading overlay when generating */}
          {isGenerating && (
            <div className="absolute bg-neutral-800 top-0 left-4 w-[calc(100%-30px)] h-full z-1 flex items-start pt-3.5 justify-between">
              <div className="flex items-center gap-2 text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 bg-neutral-300 rounded-full animate-pulse"></div>
                  <div className="size-2 bg-neutral-300 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="size-2 bg-neutral-300 rounded-full animate-pulse animation-delay-400"></div>
                </div>
                <span className="text-sm">Jatevo Web Builder is working...</span>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="!rounded-md mr-0.5 h-8 w-8"
                onClick={onStop}
              >
                <CircleStop className="size-4" />
              </Button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            disabled={isGenerating || isLoading}
            className="w-full bg-transparent text-sm outline-none text-white placeholder:text-neutral-400 p-4 resize-none min-h-[56px] max-h-[200px]"
            placeholder={
              showNewProjectButtons
                ? "Describe the website you want to generate..."
                : "Ask Jatevo Web Builder for edits"
            }
            value={isGenerating ? "" : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Dice button for random prompts (only for new projects) */}
          {showNewProjectButtons && !isGenerating && (
            <Button
              size="icon"
              variant="outline"
              className="!rounded-md -translate-y-2 -translate-x-4 h-8 w-8"
              onClick={handleRandomPrompt}
              disabled={randomPromptLoading}
            >
              <Dice6
                className={`size-4 ${
                  randomPromptLoading ? "animate-spin animation-duration-500" : ""
                }`}
              />
            </Button>
          )}
        </div>

        {/* Bottom bar with buttons */}
        <div className="flex items-center justify-between gap-2 px-4 pb-3 mt-2">
          <div className="flex-1 flex items-center justify-start gap-1.5 flex-wrap">
            {showNewProjectButtons ? (
              <>
                <EnhanceButton
                  isEnabled={enableEnhance}
                  onToggle={setEnableEnhance}
                  disabled={isGenerating}
                />
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  disabled={isGenerating}
                />
                <RedesignButton
                  disabled={isGenerating}
                  onRedesign={(markdown: string, url: string) => {
                    if (onRedesign) {
                      onRedesign(markdown, url);
                    }
                  }}
                />
              </>
            ) : (
              <>
                <AddContextButton
                  disabled={isGenerating}
                  onAddContext={(context: string) => {
                    toast({
                      title: "Context Added",
                      description: context,
                    });
                  }}
                />
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  disabled={isGenerating}
                />
                <AttachButton
                  disabled={isGenerating}
                  onAttach={(files: File[]) => {
                    toast({
                      title: "Files Attached",
                      description: `${files.length} file(s) attached`,
                    });
                  }}
                />
                <EditButton
                  disabled={isGenerating}
                  onEdit={() => {
                    toast({
                      title: "Edit Mode",
                      description: "Select an element to edit",
                    });
                  }}
                />
              </>
            )}
          </div>
          
          {/* Send button */}
          <div className="flex items-center justify-end gap-2">
            <Button
              size="icon"
              variant="outline"
              className="!rounded-md h-8 w-8"
              disabled={isGenerating || isLoading || !prompt.trim()}
              onClick={onGenerate}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}