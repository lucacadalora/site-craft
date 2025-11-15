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

  const handleTabClick = (fileName: string) => {
    selectFile(fileName);
  };

  const handleCloseTab = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    closeFile(fileName);
  };

  return (
    <div className={cn("flex items-center bg-background border-b overflow-x-auto", className)}>
      <div className="flex">
        {project.openFiles.map((fileName) => (
          <div
            key={fileName}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-accent/50 transition-colors min-w-[120px] max-w-[200px]",
              project.activeFile === fileName && "bg-accent border-b-2 border-b-primary"
            )}
            onClick={() => handleTabClick(fileName)}
            data-testid={`tab-${fileName}`}
          >
            {getFileIcon(fileName)}
            <span className="text-sm truncate flex-1">{fileName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleCloseTab(e, fileName)}
              className="h-4 w-4 p-0 hover:bg-destructive/20 rounded"
              data-testid={`button-close-tab-${fileName}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};