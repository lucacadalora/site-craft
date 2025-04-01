import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { exportLandingPage } from "@/lib/openai";
import { Download } from "lucide-react";

interface PageExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | null;
}

export function PageExport({ open, onOpenChange, projectId }: PageExportProps) {
  const [format, setFormat] = useState<"html" | "pdf">("html");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected for export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportLandingPage(projectId, format);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `landingcraft-export.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Your landing page has been exported as ${format.toUpperCase()}`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Landing Page</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as "html" | "pdf")}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML/CSS</SelectItem>
                <SelectItem value="pdf">PDF Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Export Information</p>
              <p className="text-xs text-gray-500">
                {format === "html" 
                  ? "Download complete HTML, CSS and assets" 
                  : "Download as PDF document for printing or sharing"}
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !projectId}
            className="flex items-center"
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
