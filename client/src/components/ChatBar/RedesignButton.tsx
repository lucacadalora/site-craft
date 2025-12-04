import { useState } from 'react';
import { Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface RedesignButtonProps {
  disabled?: boolean;
  onRedesign: (markdown: string, url: string) => void;
}

export function RedesignButton({ disabled, onRedesign }: RedesignButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkIfUrlIsValid = (url: string) => {
    const urlPattern = new RegExp(
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      'i'
    );
    return urlPattern.test(url);
  };

  const handleRedesign = async () => {
    if (isLoading) return;
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL.",
        variant: "destructive",
      });
      return;
    }
    if (!checkIfUrlIsValid(url)) {
      toast({
        title: "Error",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const trimmedUrl = url.trim();
    
    try {
      toast({
        title: "Fetching website",
        description: "Reading the website content...",
      });
      
      const response = await fetch('/api/re-design', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      
      const data = await response.json();
      
      if (data.ok && data.markdown) {
        setOpen(false);
        setUrl('');
        onRedesign(data.markdown, trimmedUrl);
        toast({
          title: "Redesigning",
          description: "Jatevo Web Builder is redesigning your site! Let it cook...",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch website content.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch website content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={open ? "default" : "outline"}
          className="!rounded-md h-7 text-xs"
          disabled={disabled}
          data-testid="button-redesign"
        >
          <Paintbrush className="size-3.5" />
          Redesign
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="!rounded-2xl !p-0 !bg-white !border-neutral-100 min-w-xs text-center overflow-hidden"
      >
        <header className="bg-neutral-50 p-6 border-b border-neutral-200/60">
          <div className="flex items-center justify-center -space-x-4 mb-3">
            <div className="size-9 rounded-full bg-pink-200 shadow-sm flex items-center justify-center text-xl opacity-50">
              🎨
            </div>
            <div className="size-11 rounded-full bg-amber-200 shadow-lg flex items-center justify-center text-2xl z-10">
              🥳
            </div>
            <div className="size-9 rounded-full bg-sky-200 shadow-sm flex items-center justify-center text-xl opacity-50">
              💎
            </div>
          </div>
          <p className="text-xl font-semibold text-neutral-950">
            Redesign your Site!
          </p>
          <p className="text-sm text-neutral-500 mt-1.5">
            Try our new Redesign feature to give your site a fresh look.
          </p>
        </header>
        <main className="space-y-4 p-6">
          <div>
            <p className="text-sm text-neutral-700 mb-2">
              Enter your website URL to get started:
            </p>
            <Input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRedesign();
                }
              }}
              className="w-full"
              data-testid="input-redesign-url"
            />
          </div>
          <div className="flex justify-center">
            <Button
              onClick={handleRedesign}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              data-testid="button-start-redesign"
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  Redesign <Paintbrush className="size-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </main>
      </PopoverContent>
    </Popover>
  );
}