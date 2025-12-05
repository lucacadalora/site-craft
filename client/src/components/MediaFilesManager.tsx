import { useRef, useState } from "react";
import {
  CheckCircle,
  ImageIcon,
  Paperclip,
  Upload,
  Video,
  Music,
  FileVideo,
  X,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaFile {
  url: string;
  type: "image" | "video" | "audio" | "unknown";
}

interface MediaFilesManagerProps {
  projectId: string | number | null;
  files: string[];
  selectedFiles: string[];
  onFilesChange: (files: string[]) => void;
  onSelectedFilesChange: (selectedFiles: string[]) => void;
  isUploading: boolean;
  onUpload: (files: FileList) => void;
  disabled?: boolean;
}

export const getFileType = (url: string): "image" | "video" | "audio" | "unknown" => {
  if (typeof url !== "string") {
    return "unknown";
  }
  
  if (url.startsWith("data:")) {
    if (url.startsWith("data:image/")) return "image";
    if (url.startsWith("data:video/")) return "video";
    if (url.startsWith("data:audio/")) return "audio";
    return "unknown";
  }
  
  const extension = url.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
    return "image";
  } else if (["mp4", "webm", "ogg", "avi", "mov"].includes(extension || "")) {
    return "video";
  } else if (["mp3", "wav", "ogg", "aac", "m4a"].includes(extension || "")) {
    return "audio";
  }
  return "unknown";
};

export const MediaFilesManager = ({
  projectId,
  files,
  selectedFiles,
  onFilesChange,
  onSelectedFilesChange,
  isUploading,
  onUpload,
  disabled = false,
}: MediaFilesManagerProps) => {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (url: string) => {
    const fileType = getFileType(url);
    switch (fileType) {
      case "image":
        return <ImageIcon className="size-4" />;
      case "video":
        return <Video className="size-4" />;
      case "audio":
        return <Music className="size-4" />;
      default:
        return <FileVideo className="size-4" />;
    }
  };

  const handleFileSelect = (file: string) => {
    if (selectedFiles.includes(file)) {
      onSelectedFilesChange(selectedFiles.filter((f) => f !== file));
    } else {
      onSelectedFilesChange([...selectedFiles, file]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={open ? "default" : "outline"}
          className={cn(
            "h-7 px-3 text-xs",
            open 
              ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              : "bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-gray-100"
          )}
          disabled={disabled}
          data-testid="button-attach"
        >
          <Paperclip className="w-3 h-3 mr-1" />
          Attach
          {selectedFiles.length > 0 && (
            <span className="ml-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {selectedFiles.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="!rounded-2xl !p-0 !bg-white !border-neutral-100 min-w-[320px] text-center overflow-hidden"
      >
        <header className="bg-neutral-50 p-6 border-b border-neutral-200/60">
          <div className="flex items-center justify-center -space-x-4 mb-3">
            <div className="size-9 rounded-full bg-pink-200 shadow-sm flex items-center justify-center text-xl opacity-50">
              🎨
            </div>
            <div className="size-11 rounded-full bg-amber-200 shadow-xl flex items-center justify-center text-2xl z-10">
              📁
            </div>
            <div className="size-9 rounded-full bg-sky-200 shadow-sm flex items-center justify-center text-xl opacity-50">
              💻
            </div>
          </div>
          <p className="text-xl font-semibold text-neutral-950">
            Add Media Files
          </p>
          <p className="text-sm text-neutral-500 mt-1.5">
            Upload images, videos, and audio files to your project!
          </p>
        </header>
        <main className="space-y-4 p-5">
          {!projectId && (
            <div className="flex items-center justify-center flex-col gap-2 bg-amber-500/10 rounded-md p-3 border border-amber-500/10">
              <p className="text-xs text-amber-700">
                Save your project first to upload media files.
              </p>
            </div>
          )}
          
          <div>
            <p className="text-xs text-left text-neutral-700 mb-2">
              Uploaded Media Files
            </p>
            {files.length > 0 ? (
              <div className="grid grid-cols-4 gap-1 flex-wrap max-h-40 overflow-y-auto">
                {files.map((file, index) => {
                  const fileType = getFileType(file);
                  return (
                    <div
                      key={`${file.substring(0, 50)}-${index}`}
                      className="select-none relative cursor-pointer bg-white rounded-md border-[2px] border-white hover:shadow-lg transition-all duration-300"
                      onClick={() => handleFileSelect(file)}
                      data-testid={`media-file-${index}`}
                    >
                      {fileType === "image" ? (
                        <img
                          src={file}
                          alt="uploaded image"
                          className="object-cover w-full rounded-sm aspect-square"
                        />
                      ) : fileType === "video" ? (
                        <div className="w-full h-14 rounded-sm bg-gray-100 flex items-center justify-center relative">
                          <video
                            src={file}
                            className="w-full h-full object-cover rounded-sm"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-sm">
                            <Video className="size-4 text-white" />
                          </div>
                        </div>
                      ) : fileType === "audio" ? (
                        <div className="w-full h-14 rounded-sm bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <Music className="size-6 text-purple-600" />
                        </div>
                      ) : (
                        <div className="w-full h-14 rounded-sm bg-gray-100 flex items-center justify-center">
                          {getFileIcon(file)}
                        </div>
                      )}
                      {selectedFiles.includes(file) && (
                        <div className="absolute top-0 right-0 h-full w-full flex items-center justify-center bg-black/50 rounded-md">
                          <CheckCircle className="size-6 text-neutral-100" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono flex flex-col items-center gap-1 pt-2">
                <ImageIcon className="size-4" />
                No media files uploaded yet
              </p>
            )}
          </div>
          
          <div>
            <p className="text-xs text-left text-neutral-700 mb-2">
              Or import media files from your computer
            </p>
            <Button
              variant="default"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full bg-neutral-900 text-white hover:bg-neutral-800"
              disabled={isUploading || !projectId}
              data-testid="button-upload-media"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Uploading media file(s)...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  Upload Media Files
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*,.mp3,.mp4,.wav,.aac,.m4a,.ogg,.webm,.avi,.mov"
              onChange={handleFileInputChange}
              data-testid="input-file-upload"
            />
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="pt-2 border-t border-neutral-200">
              <p className="text-xs text-neutral-600">
                {selectedFiles.length} file(s) selected for AI context
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 mt-1"
                onClick={() => onSelectedFilesChange([])}
                data-testid="button-clear-selection"
              >
                <X className="size-3 mr-1" />
                Clear selection
              </Button>
            </div>
          )}
        </main>
      </PopoverContent>
    </Popover>
  );
};

export default MediaFilesManager;
