import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EditButtonProps {
  disabled?: boolean;
  onEdit: () => void;
}

export function EditButton({ disabled, onEdit }: EditButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelectMode = (mode: 'element' | 'text' | 'style') => {
    setOpen(false);
    onEdit();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="xs"
          variant={open ? "default" : "outline"}
          className="!rounded-md"
          disabled={disabled}
          data-testid="button-edit"
        >
          <Edit3 className="size-3.5" />
          Edit
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!rounded-2xl p-4 !w-80 !bg-neutral-900 !border-neutral-800" align="start">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Edit Mode</h3>
            <p className="text-xs text-neutral-400">
              Select what you want to edit
            </p>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => handleSelectMode('element')}
              className="w-full text-left bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-3 transition-colors"
              data-testid="button-edit-element"
            >
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 rounded-lg p-2">
                  <Edit3 className="size-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Edit Element</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Select and modify HTML elements
                  </p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleSelectMode('text')}
              className="w-full text-left bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-3 transition-colors"
              data-testid="button-edit-text"
            >
              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 rounded-lg p-2">
                  <Edit3 className="size-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Edit Text</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Modify text content directly
                  </p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleSelectMode('style')}
              className="w-full text-left bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-3 transition-colors"
              data-testid="button-edit-style"
            >
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 rounded-lg p-2">
                  <Edit3 className="size-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Edit Styles</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Change colors, fonts, and layout
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}