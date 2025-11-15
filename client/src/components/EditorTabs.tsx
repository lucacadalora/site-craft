import { X, FileCode, FileText } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditorTabsProps {
  className?: string;
}

export const EditorTabs = ({ className }: EditorTabsProps) => {
  const { project, selectFile, closeFile } = useProject();

  if (!project || project.openFiles.length === 0) {
    return null;
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return (
          <div className="w-4 h-4 flex items-center justify-center bg-orange-500/10 rounded">
            <span className="text-[8px] font-bold text-orange-500">H</span>
          </div>
        );
      case 'css':
        return (
          <div className="w-4 h-4 flex items-center justify-center bg-blue-500/10 rounded">
            <span className="text-[8px] font-bold text-blue-500">C</span>
          </div>
        );
      case 'js':
      case 'javascript':
        return (
          <div className="w-4 h-4 flex items-center justify-center bg-yellow-500/10 rounded">
            <span className="text-[8px] font-bold text-yellow-500">J</span>
          </div>
        );
      default:
        return <FileText className="w-3 h-3 text-gray-400" />;
    }
  };

  const getLanguageBadge = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return (
          <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm bg-orange-600/90 text-white tracking-wide">
            HTML
          </span>
        );
      case 'css':
        return (
          <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm bg-blue-600/90 text-white tracking-wide">
            CSS
          </span>
        );
      case 'js':
      case 'javascript':
        return (
          <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm bg-yellow-600/90 text-white tracking-wide">
            JS
          </span>
        );
      default:
        return null;
    }
  };

  const handleTabClick = (fileName: string) => {
    selectFile(fileName);
  };

  const handleCloseTab = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    closeFile(fileName);
  };

  return (
    <div className={cn("flex items-center overflow-x-auto", className)}>
      <div className="flex">
        {project.openFiles.map((fileName) => (
          <div
            key={fileName}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-800/50 transition-colors",
              project.activeFile === fileName && "bg-gray-800"
            )}
            onClick={() => handleTabClick(fileName)}
            data-testid={`tab-${fileName}`}
          >
            {getFileIcon(fileName)}
            <span className="text-xs font-medium text-gray-200">{fileName}</span>
            {getLanguageBadge(fileName)}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleCloseTab(e, fileName)}
              className="h-4 w-4 p-0 ml-1 hover:bg-gray-700 rounded"
              data-testid={`button-close-tab-${fileName}`}
            >
              <X className="h-2.5 w-2.5 text-gray-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};