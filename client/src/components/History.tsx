import { History as HistoryIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import { ProjectVersion } from "@shared/schema";

export function History() {
  const { project, setProject, closeFile } = useProject();
  const [open, setOpen] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);

  // Fetch versions for the current project
  const { data: versions = [], isLoading } = useQuery<ProjectVersion[]>({
    queryKey: ['/api/projects', project?.id, 'versions'],
    enabled: !!project?.id,
    select: (data) => {
      // Parse the files field from JSON string if needed
      return (data || []).map(v => ({
        ...v,
        files: typeof v.files === 'string' ? JSON.parse(v.files) : v.files
      }));
    }
  });

  // Don't show anything if no project or no versions
  if (!project?.id || versions.length === 0) return null;

  const handleRestoreVersion = async (version: ProjectVersion) => {
    if (!project?.id) return;

    try {
      // Parse files from the version (in case it's still a string)
      const versionFiles = typeof version.files === 'string' 
        ? JSON.parse(version.files) 
        : version.files;

      // Update the project with the version's files
      const updatedProject = {
        ...project,
        files: versionFiles,
        currentVersionId: version.id
      };

      // Update local state
      setProject(updatedProject);
      
      // Close any open files that don't exist in this version
      const versionFileNames = versionFiles.map((f: ProjectFile) => f.name);
      const currentOpenFiles = project.openFiles || [];
      const filesToClose = currentOpenFiles.filter((name: string) => !versionFileNames.includes(name));
      filesToClose.forEach((name: string) => closeFile(name));
      
      // Update in backend
      await apiRequest(`/api/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          files: versionFiles
        })
      });

      // Invalidate project query to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      
      setCurrentVersionId(version.id);
      setOpen(false);
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={open ? "default" : "ghost"}
          className={cn(
            "h-8 px-3 text-xs gap-1.5",
            open ? "bg-gray-700 text-gray-100" : "text-gray-300 hover:bg-gray-800"
          )}
          data-testid="button-history"
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>
            {versions.length} edit{versions.length !== 1 ? "s" : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0 overflow-hidden bg-[#1a1a1a] border-gray-800"
        align="start"
      >
        <header className="text-sm px-4 py-3 border-b bg-[#0f0f0f] border-gray-800 font-semibold text-gray-200">
          Version History
        </header>
        <main className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Loading versions...
            </div>
          ) : (
            <ul>
              {versions.map((version, index) => {
                const isCurrentVersion = currentVersionId === version.id || 
                  (index === 0 && !currentVersionId);
                
                return (
                  <li
                    key={version.id}
                    className={cn(
                      "px-4 py-3 border-b border-gray-800 last:border-0 space-y-1.5 hover:bg-gray-900/50 transition-colors",
                      isCurrentVersion && "bg-blue-500/10"
                    )}
                  >
                    <p className="line-clamp-2 text-sm text-gray-200">
                      {version.commitTitle || version.prompt}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-gray-500 text-xs">
                        {version.createdAt ? (
                          <>
                            {new Date(version.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })} at{" "}
                            {new Date(version.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        ) : (
                          "Unknown date"
                        )}
                        {version.isFollowUp && (
                          <span className="ml-2 text-orange-400">(edit)</span>
                        )}
                      </p>
                      {isCurrentVersion ? (
                        <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] px-2 py-0.5">
                          Current
                        </span>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-gray-400 hover:text-gray-200 text-xs h-auto p-0"
                          onClick={() => handleRestoreVersion(version)}
                          data-testid={`button-restore-version-${version.id}`}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </PopoverContent>
    </Popover>
  );
}