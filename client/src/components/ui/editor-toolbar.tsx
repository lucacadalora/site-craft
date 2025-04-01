import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Tablet, Monitor, Eye } from "lucide-react";

interface EditorToolbarProps {
  tokenUsage: number;
  totalTokens: number;
  onPreview: () => void;
}

export function EditorToolbar({ tokenUsage, totalTokens, onPreview }: EditorToolbarProps) {
  const [viewMode, setViewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");

  return (
    <div className="bg-white border-b border-gray-200 p-3 flex items-center">
      <div className="flex items-center space-x-2 mr-4">
        <span className="text-sm font-medium text-gray-700">Preview:</span>
        <Button
          variant={viewMode === "mobile" ? "secondary" : "outline"}
          size="sm"
          className="p-1 h-8 w-8"
          onClick={() => setViewMode("mobile")}
        >
          <Smartphone className="h-4 w-4" />
          <span className="sr-only">Mobile</span>
        </Button>
        <Button
          variant={viewMode === "tablet" ? "secondary" : "outline"}
          size="sm"
          className="p-1 h-8 w-8"
          onClick={() => setViewMode("tablet")}
        >
          <Tablet className="h-4 w-4" />
          <span className="sr-only">Tablet</span>
        </Button>
        <Button
          variant={viewMode === "desktop" ? "secondary" : "outline"}
          size="sm"
          className="p-1 h-8 w-8"
          onClick={() => setViewMode("desktop")}
        >
          <Monitor className="h-4 w-4" />
          <span className="sr-only">Desktop</span>
        </Button>
      </div>
      
      <div className="ml-auto flex items-center space-x-4">
        <span className="text-sm text-gray-500">
          Token usage: <span className="font-medium text-gray-700">{tokenUsage}/{totalTokens}</span>
        </span>
        
        <Button variant="secondary" size="sm" onClick={onPreview} className="flex items-center">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  );
}
