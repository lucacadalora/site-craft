import { useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnhanceButtonProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function EnhanceButton({ isEnabled, onToggle, disabled }: EnhanceButtonProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'modern',
    primaryColor: 'blue',
    secondaryColor: 'gray',
  });

  return (
    <>
      <Button
        size="xs"
        variant="outline"
        className="!rounded-md !border-white/10 !bg-gradient-to-r from-sky-400/15 to-purple-400/15 hover:brightness-110"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid="button-enhance"
      >
        <WandSparkles className="size-3.5 text-sky-500 relative z-10" />
        <span className="text-transparent bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text relative z-10">
          Enhance
        </span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl !p-0 !rounded-3xl !bg-neutral-900 !border-neutral-800/80 !gap-0">
          <DialogTitle className="px-6 py-3.5 border-b border-neutral-800">
            <div className="flex items-center justify-start gap-2 text-neutral-200 text-base font-medium">
              <WandSparkles className="size-3.5" />
              <p>Enhance Prompt</p>
            </div>
          </DialogTitle>
          
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enhance-toggle" className="text-neutral-300">
                Enable Enhancement
              </Label>
              <Switch
                id="enhance-toggle"
                checked={isEnabled}
                onCheckedChange={onToggle}
                data-testid="switch-enhance-toggle"
              />
            </div>
            
            <div>
              <Label className="text-neutral-300 mb-2">Theme Style</Label>
              <Select value={settings.theme} onValueChange={(v) => setSettings({...settings, theme: v})}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="vibrant">Vibrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-neutral-300 mb-2">Primary Color</Label>
              <Select value={settings.primaryColor} onValueChange={(v) => setSettings({...settings, primaryColor: v})}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-neutral-300 mb-2">Secondary Color</Label>
              <Select value={settings.secondaryColor} onValueChange={(v) => setSettings({...settings, secondaryColor: v})}>
                <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="slate">Slate</SelectItem>
                  <SelectItem value="zinc">Zinc</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="px-6 py-3.5 border-t border-neutral-800">
            <Button
              variant="secondary"
              size="default"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}