import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Save, Send, Download } from 'lucide-react';

interface HeaderProps {
  onSave: () => void;
  onPublish: () => void;
  onExport: () => void;
  isSaving?: boolean;
}

export function Header({ onSave, onPublish, onExport, isSaving = false }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                LandingCraft
              </span>
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/editor" className="text-gray-600 hover:text-gray-900">
                Editor
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onPublish}
            >
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}