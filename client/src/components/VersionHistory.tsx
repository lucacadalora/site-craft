import { History as HistoryIcon } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useProject, ProjectVersion } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

export function VersionHistory() {
  const { project, loadVersion, loadProjectVersions } = useProject();
  const [open, setOpen] = useState(false);
  
  // Load versions when project changes or component opens
  useEffect(() => {
    if (open && project?.id) {
      loadProjectVersions(project.id);
    }
  }, [open, project?.id, loadProjectVersions]);

  // Don't show if no project or no versions
  if (!project || !project.versions || project.versions.length === 0) {
    return null;
  }

  const currentVersionIndex = project.currentVersionIndex ?? project.versions.length - 1;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={open ? "default" : "outline"}
          className="h-8 px-3 text-xs"
          data-testid="button-version-history"
        >
          <HistoryIcon className="w-3.5 h-3.5 mr-1.5" />
          {project.versions.length} version{project.versions.length !== 1 ? "s" : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="!rounded-lg !p-0 overflow-hidden !bg-gray-900"
        align="start"
      >
        <header className="text-sm px-4 py-3 border-b gap-2 bg-gray-950 border-gray-800 font-semibold text-gray-200">
          Version History
        </header>
        <main className="space-y-0">
          <ul className="max-h-[350px] overflow-y-auto">
            {project.versions.map((version: ProjectVersion, index: number) => (
              <li
                key={version.id || index}
                className={cn(
                  "px-4 text-gray-200 py-3 border-b border-gray-800 last:border-0 space-y-1.5 hover:bg-gray-800/50 transition-colors",
                  {
                    "bg-blue-500/10 hover:bg-blue-500/15": currentVersionIndex === index,
                  }
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {version.commitTitle || `Version ${version.versionNumber}`}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                      {version.prompt}
                    </p>
                  </div>
                  {version.isFollowUp && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full shrink-0">
                      Edit
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-500 text-[11px]">
                    {new Date(version.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }) +
                      " at " +
                      new Date(version.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                  </p>
                  {currentVersionIndex === index ? (
                    <span className="text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] px-2 py-0.5">
                      Current
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-auto px-2 py-0.5 text-gray-400 hover:text-gray-200"
                      onClick={() => {
                        loadVersion(index);
                        setOpen(false);
                      }}
                    >
                      Load version
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </main>
      </PopoverContent>
    </Popover>
  );
}