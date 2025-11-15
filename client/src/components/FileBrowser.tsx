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
    const iconClass = "w-4 h-4";
    
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
          {project.files.map((file) => (
            <ContextMenu key={file.name}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer",
                    project.activeFile === file.name && "bg-accent"
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
                      <span className="text-sm flex-1">{file.name}</span>
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
          ))}
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