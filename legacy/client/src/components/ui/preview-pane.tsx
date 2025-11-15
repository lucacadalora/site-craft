import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Tablet, Smartphone, RefreshCw, Code } from "lucide-react";

interface PreviewPaneProps {
  html: string | null;
  css: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function PreviewPane({ html, css, isLoading, onRefresh }: PreviewPaneProps) {
  const [previewTab, setPreviewTab] = React.useState<"preview" | "html" | "css">("preview");
  const [viewMode, setViewMode] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showViewportControls, setShowViewportControls] = React.useState(true);

  // Combine HTML and CSS for the iframe
  const combinedHtml = html && css ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${css}</style>
      </head>
      <body>${html}</body>
    </html>
  ` : "";

  // Get preview width based on viewport selection
  const getPreviewWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "320px";
      case "tablet":
        return "768px";
      case "desktop":
      default:
        return "100%";
    }
  };

  return (
    <div className="w-full md:w-1/2 p-4">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Preview</CardTitle>
            
            <div className="flex space-x-2">
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)}>
                <TabsList className="grid grid-cols-3 w-[200px]">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-1">
              {previewTab === "preview" && showViewportControls && (
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === "desktop" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("desktop")}
                    className="rounded-none"
                  >
                    <Monitor size={16} />
                  </Button>
                  <Button
                    variant={viewMode === "tablet" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("tablet")}
                    className="rounded-none"
                  >
                    <Tablet size={16} />
                  </Button>
                  <Button
                    variant={viewMode === "mobile" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("mobile")}
                    className="rounded-none"
                  >
                    <Smartphone size={16} />
                  </Button>
                </div>
              )}
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <RefreshCw size={40} className="animate-spin mb-4 text-primary" />
                <p className="text-lg font-medium">Generating your landing page...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            </div>
          ) : !html && !css ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center max-w-md">
                <p className="text-lg font-medium mb-2">No preview available</p>
                <p className="text-sm text-gray-500 mb-4">
                  Fill in your description, select a category, and click "Generate Landing Page" to create your site.
                </p>
              </div>
            </div>
          ) : (
            <>
              {previewTab === "preview" && (
                <div 
                  className="h-full flex items-center justify-center py-4 px-4 bg-gray-100"
                  style={{ minHeight: "500px" }}
                >
                  <div 
                    style={{ 
                      width: getPreviewWidth(), 
                      height: "100%", 
                      margin: "0 auto",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      borderRadius: "4px",
                      overflow: "hidden",
                      transition: "width 0.3s ease"
                    }}
                  >
                    <iframe
                      title="Landing Page Preview"
                      srcDoc={combinedHtml}
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        border: "none",
                        backgroundColor: "white"
                      }}
                    />
                  </div>
                </div>
              )}
              
              {previewTab === "html" && (
                <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full">
                  <code>{html || "// No HTML code available"}</code>
                </pre>
              )}
              
              {previewTab === "css" && (
                <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full">
                  <code>{css || "/* No CSS code available */"}</code>
                </pre>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}