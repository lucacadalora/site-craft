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
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 32 32" fill="none">
            <path
              d="M5.902 27.201L3.656 2h24.688l-2.249 25.197L15.985 30 5.902 27.201z"
              fill="#E44D26"
            />
            <path
              d="M16 27.858l8.17-2.265 1.922-21.532H16v23.797z"
              fill="#F16529"
            />
            <path
              d="M16 13.407h4.09l.282-3.165H16V7.151h7.75l-.074.829-.759 8.518H16v-3.091z"
              fill="#EBEBEB"
            />
            <path
              d="M16 21.434l-.014.004-3.442-.929-.22-2.465H9.221l.433 4.852 6.332 1.758.014-.004v-3.216z"
              fill="#EBEBEB"
            />
            <path
              d="M19.90 16.18l-.372 4.148-3.543.956v3.216l6.336-1.755.047-.522.537-6.043H19.90z"
              fill="#FFF"
            />
            <path
              d="M16 7.151v3.091h-7.3l-.062-.695-.141-1.567-.074-.829H16zM16 13.407v3.091h-3.399l-.062-.695-.14-1.566-.074-.83H16z"
              fill="#FFF"
            />
          </svg>
        );
      case 'css':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 32 32" fill="none">
            <path
              d="M5.902 27.201L3.656 2h24.688l-2.249 25.197L15.985 30 5.902 27.201z"
              fill="#1572B6"
            />
            <path
              d="M16 27.858l8.17-2.265 1.922-21.532H16v23.797z"
              fill="#33A9DC"
            />
            <path
              d="M16 13.191h4.09l.282-3.165H16V6.935h7.75l-.074.829-.759 8.518H16v-3.091z"
              fill="#FFF"
            />
            <path
              d="M16.019 21.218l-.014.004-3.442-.929-.22-2.465H9.24l.433 4.852 6.331 1.758.015-.004v-3.216z"
              fill="#EBEBEB"
            />
            <path
              d="M19.827 16.151l-.372 4.148-3.436.929v3.216l6.336-1.755.047-.522.726-8.016h-7.636v3h4.335z"
              fill="#FFF"
            />
            <path
              d="M16.011 6.935v3.091h-7.3l-.062-.695-.141-1.567-.074-.829h7.577zM16 13.191v3.091h-3.399l-.062-.695-.14-1.566-.074-.83H16z"
              fill="#EBEBEB"
            />
          </svg>
        );
      case 'js':
      case 'javascript':
        return (
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="2" fill="#F7DF1E" />
            <path
              d="M20.63 22.3c.54.88 1.24 1.53 2.48 1.53.98 0 1.6-.48 1.6-1.16 0-.8-.64-1.1-1.72-1.57l-.59-.25c-1.7-.72-2.83-1.63-2.83-3.55 0-1.77 1.35-3.12 3.46-3.12 1.5 0 2.58.52 3.36 1.9l-1.84 1.18c-.4-.72-.84-1-1.51-1-.69 0-1.12.43-1.12 1 0 .7.43 1 1.43 1.43l.59.25c2 .86 3.13 1.73 3.13 3.7 0 2.12-1.66 3.3-3.9 3.3-2.18 0-3.6-1.04-4.3-2.4l1.96-1.12z"
              fill="#000"
            />
            <path
              d="M11.14 22.56c.35.62.67 1.15 1.44 1.15.74 0 1.2-.29 1.2-1.42V14.7h2.4v7.63c0 2.34-1.37 3.4-3.37 3.4-1.8 0-2.85-.94-3.38-2.06l1.71-1.1z"
              fill="#000"
            />
          </svg>
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