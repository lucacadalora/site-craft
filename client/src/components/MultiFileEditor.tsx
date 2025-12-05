import { useEffect, useRef, useState, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import { cn } from '@/lib/utils';
import { Code2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MultiFileEditorProps {
  className?: string;
  onRunCode?: () => void;
  readOnly?: boolean;
  isGenerating?: boolean;
}

export const MultiFileEditor = ({ 
  className, 
  onRunCode,
  readOnly = false,
  isGenerating = false 
}: MultiFileEditorProps) => {
  const { project, updateFileContent, saveProject, getFileByName } = useProject();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const prevContentLength = useRef<number>(0);

  const activeFile = project?.activeFile ? getFileByName(project.activeFile) : null;
  const content = activeFile?.content || '';
  const lineCount = content.split('\n').length;

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
      case 'jsx':
      case 'javascript':
        return 'javascript';
      case 'ts':
      case 'tsx':
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
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const scrollToBottom = useCallback(() => {
    if (editorContainerRef.current) {
      const scrollHeight = editorContainerRef.current.scrollHeight;
      const clientHeight = editorContainerRef.current.clientHeight;
      const scrollTop = scrollHeight - clientHeight;
      editorContainerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'auto'
      });
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (editorContainerRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editorContainerRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (isGenerating && content.length > prevContentLength.current) {
      requestAnimationFrame(scrollToBottom);
    }
    prevContentLength.current = content.length;
  }, [content, isGenerating, scrollToBottom]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (!project) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-[#1e1e1e]", className)}>
        <div className="text-center space-y-4 p-8">
          <Code2 className="w-12 h-12 text-gray-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-200">No Project Loaded</h3>
            <p className="text-sm text-gray-400 mt-2">
              Create a new project or load an existing one to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-[#1e1e1e]", className)}>
        <div className="text-center space-y-4 p-8">
          <Code2 className="w-12 h-12 text-gray-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-gray-200">No File Selected</h3>
            <p className="text-sm text-gray-400 mt-2">
              Select a file from the file browser to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full bg-[#1e1e1e]", className)}>
      {/* Line Numbers - DeepSite Style */}
      <div 
        ref={lineNumbersRef}
        className="flex-shrink-0 select-none overflow-y-auto scrollbar-hide"
        style={{
          width: '50px',
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid #2d2d2d',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          paddingTop: '10px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i + 1}
            style={{
              height: '1.5em',
              paddingRight: '12px',
              textAlign: 'right',
              color: '#6e7681',
              userSelect: 'none',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code Editor */}
      <div 
        className="flex-1 overflow-auto relative"
        ref={editorContainerRef}
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: '#1e1e1e',
        }}
      >
        <Editor
          value={content}
          onValueChange={(code) => {
            if (!readOnly && activeFile) {
              updateFileContent(activeFile.name, code);
            }
          }}
          highlight={highlightCode}
          padding={10}
          disabled={readOnly || isGenerating}
          textareaClassName="focus:outline-none"
          className={cn(
            "min-h-full font-mono",
            readOnly && "opacity-70 cursor-not-allowed"
          )}
          style={{
            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            minHeight: '100%',
            backgroundColor: '#1e1e1e',
            color: '#e6e6e6',
          }}
          data-testid={`editor-${activeFile.name}`}
        />
        
        {/* Streaming Indicator */}
        {isGenerating && (
          <div className="absolute bottom-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-2 shadow-lg z-10">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </div>
        )}
      </div>
    </div>
  );
};
