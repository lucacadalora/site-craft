import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled = false }: PromptInputProps) {
  return (
    <div className="mb-4">
      <Label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700 mb-1">
        Describe your landing page
      </Label>
      <div className="flex">
        <Textarea
          id="prompt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 p-3 border border-gray-300 rounded-md text-sm h-32 focus:ring-primary focus:border-primary"
          placeholder="Describe your landing page in detail. For example: 'Create a landing page for an online coding bootcamp called CodeMasters with a hero section, features, pricing, and testimonials.'"
        />
      </div>
    </div>
  );
}
