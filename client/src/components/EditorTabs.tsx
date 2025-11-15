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
    const iconClass = "w-3 h-3";
    
    switch (extension) {
      case 'html':
        return <FileCode className={cn(iconClass, "text-orange-500")} />;
      case 'css':
        return <FileCode className={cn(iconClass, "text-blue-500")} />;
      case 'js':
      case 'javascript':
        return <FileCode className={cn(iconClass, "text-yellow-500")} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const getLanguageBadge = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return (
          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
            HTML
          </span>
        );
      case 'css':
        return (
          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            CSS
          </span>
        );
      case 'js':
      case 'javascript':
        return (
          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
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