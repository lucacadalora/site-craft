import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Save, Globe, Download } from "lucide-react";

interface HeaderProps {
  onSave: () => void;
  onPublish: () => void;
  onExport: () => void;
  isSaving?: boolean;
}

export function Header({ onSave, onPublish, onExport, isSaving = false }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-xl font-heading font-bold text-gray-900">LandingCraft</h1>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="text-gray-600 hover:text-gray-900"
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onPublish}
            className="bg-primary hover:bg-blue-600 text-white"
          >
            <Globe className="mr-1 h-4 w-4" />
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </header>
  );
}
