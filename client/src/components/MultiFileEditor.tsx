import { useEffect, useRef, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Save, Download, Play, Code2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MultiFileEditorProps {
  className?: string;
  onRunCode?: () => void;
  readOnly?: boolean;
}

export const MultiFileEditor = ({ 
  className, 
  onRunCode,
  readOnly = false 
}: MultiFileEditorProps) => {
  const { project, updateFileContent, saveProject, getFileByName } = useProject();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const activeFile = project?.activeFile ? getFileByName(project.activeFile) : null;

  const handleSave = async () => {
    if (!project) return;
    
    setSaving(true);
    try {
      await saveProject();
      toast({
        title: "Success",
        description: "Project saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getLanguageFromFileName = (fileName?: string): string => {
    if (!fileName) return 'markup';
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return 'markup';
      case 'css':
        return 'css';
      case 'js':
      case 'javascript':
        return 'javascript';
      default:
        return 'markup';
    }
  };

  const highlightCode = (code: string): string => {
    if (!activeFile) return code;
    
    const language = getLanguageFromFileName(activeFile.name);
    const prismLanguage = languages[language] || languages.markup;
    
    return highlight(code, prismLanguage, language);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Ctrl+S / Cmd+S for saving
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!project) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4 p-8">
          <Code2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No Project Loaded</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new project or load an existing one to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4 p-8">
          <Code2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No File Selected</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Select a file from the file browser to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-[#1e1e1e]", className)}>
      {/* Code Editor */}
      <div 
        className="flex-1 overflow-auto"
        ref={editorRef}
        onKeyDown={handleKeyDown}
      >
        <Editor
          value={activeFile.content}
          onValueChange={(code) => {
            if (!readOnly && activeFile) {
              updateFileContent(activeFile.name, code);
            }
          }}
          highlight={highlightCode}
          padding={16}
          disabled={readOnly}
          textareaClassName="focus:outline-none"
          className={cn(
            "min-h-full font-mono text-sm",
            "bg-[#2d2d2d] text-[#f8f8f2]",
            readOnly && "opacity-70 cursor-not-allowed"
          )}
          style={{
            minHeight: '100%'
          }}
          data-testid={`editor-${activeFile.name}`}
        />
      </div>
    </div>
  );
};