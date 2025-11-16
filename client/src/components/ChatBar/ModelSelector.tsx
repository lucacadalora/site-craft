import { useState } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const MODELS = [
  { 
    category: "Z.ai Models",
    models: [
      { value: "z.ai-glm-4.6", label: "glm-4.6", icon: "🚀" },
      { value: "z.ai-glm-4", label: "glm-4", icon: "⚡" },
    ]
  },
  {
    category: "OpenAI Models",
    models: [
      { value: "gpt-4", label: "GPT-4", icon: "🧠" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", icon: "💡" },
    ]
  },
  {
    category: "Other Models",
    models: [
      { value: "claude-3", label: "Claude 3", icon: "🎨" },
      { value: "llama-3", label: "Llama 3", icon: "🦙" },
    ]
  }
];

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Find the current selected model details
  const currentModel = MODELS.flatMap(cat => cat.models).find(m => m.value === selectedModel) || MODELS[0].models[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={open ? "default" : "outline"}
          className="!rounded-md"
          disabled={disabled}
          size="xs"
          data-testid="button-model-selector"
        >
          <Zap className="size-3.5" />
          <span className="truncate max-w-[120px]">
            {currentModel.label}
          </span>
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!rounded-2xl p-0 !w-96 overflow-hidden !bg-neutral-900" align="center">
        <header className="flex items-center justify-center text-sm px-4 py-3 border-b gap-2 bg-neutral-950 border-neutral-800 font-semibold text-neutral-200">
          Choose AI Model
        </header>
        <main className="px-4 pt-5 pb-6 space-y-5">
          <label className="block">
            <p className="text-neutral-300 text-sm mb-2.5">Select a model</p>
            <Select value={selectedModel} onValueChange={(value) => {
              onModelChange(value);
              setOpen(false);
            }}>
              <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-800">
                {MODELS.map((category) => (
                  <SelectGroup key={category.category}>
                    <SelectLabel className="text-neutral-400">{category.category}</SelectLabel>
                    {category.models.map((model) => (
                      <SelectItem 
                        key={model.value} 
                        value={model.value}
                        className="text-neutral-200 focus:bg-neutral-800 focus:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span>{model.icon}</span>
                          <span>{model.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </label>
          
          {/* Model Info */}
          <div className="bg-neutral-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Current Model:</span>
              <span className="text-neutral-200 font-medium">{currentModel.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Provider:</span>
              <span className="text-neutral-200">Auto</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Speed:</span>
              <span className="text-green-400">Fast</span>
            </div>
          </div>
        </main>
      </PopoverContent>
    </Popover>
  );
}