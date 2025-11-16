import { useState, useRef } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AttachButtonProps {
  disabled?: boolean;
  onAttach: (files: File[]) => void;
}

export function AttachButton({ disabled, onAttach }: AttachButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttach = () => {
    if (selectedFiles.length > 0) {
      onAttach(selectedFiles);
      setSelectedFiles([]);
      setOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          data-testid="button-attach"
        >
          <Paperclip className="size-3.5" />
          Attach
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!rounded-2xl p-4 !w-96 !bg-neutral-900 !border-neutral-800" align="start">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Attach Files</h3>
            <p className="text-xs text-neutral-400">
              Attach images or files to provide visual references.
            </p>
          </div>
          
          <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center hover:border-neutral-600 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.txt,.html,.css,.js"
              data-testid="input-file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <Paperclip className="size-8 mx-auto mb-2 text-neutral-500" />
              <p className="text-sm text-neutral-300">Click to upload files</p>
              <p className="text-xs text-neutral-500 mt-1">
                Images, PDF, HTML, CSS, JS
              </p>
            </label>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400">Selected files:</p>
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-neutral-800 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-neutral-200 truncate flex-1">
                    {file.name}
                  </span>
                  <Button
                    size="iconXs"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="ml-2 text-neutral-400 hover:text-neutral-200"
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setSelectedFiles([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAttach}
              disabled={selectedFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-confirm-attach"
            >
              Attach {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}