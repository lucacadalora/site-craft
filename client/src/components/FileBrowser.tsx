import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  FileText, 
  Folder, 
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FileBrowserProps {
  className?: string;
}

export const FileBrowser = ({ className }: FileBrowserProps) => {
  const { 
    project, 
    openFile, 
    selectFile, 
    addFile, 
    deleteFile, 
    renameFile,
    getFileByName 
  } = useProject();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [deleteFileDialog, setDeleteFileDialog] = useState<string | null>(null);

  if (!project) {
    return (
      <div className={cn("p-4 text-muted-foreground", className)}>
        No project loaded
      </div>
    );
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 32 32" fill="none">
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
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 32 32" fill="none">
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
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 32 32" fill="none">
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
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLanguageBadge = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-orange-600/90 text-white tracking-wide">
            HTML
          </span>
        );
      case 'css':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-600/90 text-white tracking-wide">
            CSS
          </span>
        );
      case 'js':
      case 'javascript':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-yellow-600/90 text-white tracking-wide">
            JS
          </span>
        );
      default:
        return null;
    }
  };

  const handleFileClick = (fileName: string) => {
    openFile(fileName);
    selectFile(fileName);
  };

  const handleRename = (fileName: string) => {
    setRenamingFile(fileName);
    setNewFileName(fileName);
  };

  const confirmRename = () => {
    if (renamingFile && newFileName && newFileName !== renamingFile) {
      renameFile(renamingFile, newFileName);
    }
    setRenamingFile(null);
    setNewFileName('');
  };

  const cancelRename = () => {
    setRenamingFile(null);
    setNewFileName('');
  };

  const handleCreateFile = () => {
    if (!newFileNameInput.trim()) return;
    
    const fileName = newFileNameInput.trim();
    const extension = fileName.split('.').pop()?.toLowerCase();
    let language: 'html' | 'css' | 'javascript' | 'unknown' = 'unknown';
    let defaultContent = '';

    switch (extension) {
      case 'html':
        language = 'html';
        defaultContent = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>';
        break;
      case 'css':
        language = 'css';
        defaultContent = '/* Add your styles here */\n';
        break;
      case 'js':
      case 'javascript':
        language = 'javascript';
        defaultContent = '// Add your JavaScript code here\n';
        break;
    }

    addFile({
      name: fileName,
      content: defaultContent,
      language
    });

    setShowNewFileDialog(false);
    setNewFileNameInput('');
    openFile(fileName);
  };

  const handleDeleteFile = (fileName: string) => {
    if (deleteFileDialog) {
      deleteFile(deleteFileDialog);
      setDeleteFileDialog(null);
    }
  };

  return (
    <div className={cn("bg-background border-r", className)}>
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Files</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewFileDialog(true)}
          className="h-6 w-6 p-0"
          data-testid="button-new-file"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2">
        <div className="space-y-1">
          {project.files.map((file) => {
            // Check if file is being generated (has cursor)
            const isGenerating = file.content.includes('█');
            
            return (
              <ContextMenu key={file.name}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer relative",
                      project.activeFile === file.name && "bg-accent",
                      isGenerating && "animate-pulse bg-blue-500/10 border-blue-500/30 border"
                    )}
                    onClick={() => handleFileClick(file.name)}
                    data-testid={`file-${file.name}`}
                  >
                  {renamingFile === file.name ? (
                    <>
                      <Input
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-sm"
                        autoFocus
                        data-testid={`input-rename-${file.name}`}
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmRename();
                          }}
                          className="h-6 w-6 p-0"
                          data-testid="button-confirm-rename"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelRename();
                          }}
                          className="h-6 w-6 p-0"
                          data-testid="button-cancel-rename"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {getFileIcon(file.name)}
                      <span className="text-sm flex-1 font-medium text-gray-200">{file.name}</span>
                      {getLanguageBadge(file.name)}
                    </>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleRename(file.name)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => setDeleteFileDialog(file.name)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            );
          })}
        </div>
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter the name for the new file (including extension)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="e.g., app.js, styles.css, page.html"
              value={newFileNameInput}
              onChange={(e) => setNewFileNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFileNameInput.trim()) {
                  handleCreateFile();
                }
              }}
              data-testid="input-new-file-name"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewFileDialog(false);
                setNewFileNameInput('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFile}
              disabled={!newFileNameInput.trim()}
              data-testid="button-create-file"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation Dialog */}
      <Dialog open={!!deleteFileDialog} onOpenChange={(open) => !open && setDeleteFileDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteFileDialog}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteFileDialog(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleDeleteFile(deleteFileDialog!)}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};