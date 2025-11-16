import { useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

interface AddContextButtonProps {
  disabled?: boolean;
  onAddContext: (context: string) => void;
}

export function AddContextButton({ disabled, onAddContext }: AddContextButtonProps) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState('');

  const handleAddContext = () => {
    if (context.trim()) {
      onAddContext(context);
      setContext('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="xs"
          variant={open ? "default" : "outline"}
          className="!rounded-md"
          disabled={disabled}
          data-testid="button-add-context"
        >
          <CirclePlus className="size-3.5" />
          Add Context
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!rounded-2xl p-4 !w-96 !bg-neutral-900 !border-neutral-800" align="start">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Add Context</h3>
            <p className="text-xs text-neutral-400">
              Provide additional context or instructions for your edits.
            </p>
          </div>
          <Textarea
            placeholder="e.g., Make the design more corporate, add a contact form, use blue color scheme..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="min-h-[100px] bg-neutral-800 border-neutral-700 text-neutral-200"
            data-testid="textarea-context"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddContext}
              disabled={!context.trim()}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-context"
            >
              Add Context
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}