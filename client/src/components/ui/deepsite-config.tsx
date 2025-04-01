import React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteStructure } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DeepSiteConfigProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  siteStructure: SiteStructure;
  onSiteStructureChange: (siteStructure: SiteStructure) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

const AVAILABLE_SECTIONS = [
  { id: "hero", name: "Hero Banner" },
  { id: "features", name: "Features" },
  { id: "testimonials", name: "Testimonials" },
  { id: "about", name: "About Us" },
  { id: "services", name: "Services" },
  { id: "pricing", name: "Pricing" },
  { id: "team", name: "Team" },
  { id: "contact", name: "Contact" },
  { id: "cta", name: "Call to Action" },
  { id: "faq", name: "FAQ" },
  { id: "portfolio", name: "Portfolio" },
  { id: "blog", name: "Blog Previews" },
  { id: "stats", name: "Statistics" },
  { id: "partners", name: "Partners/Clients" },
];

export function DeepSiteConfig({
  enabled,
  onEnabledChange,
  siteStructure,
  onSiteStructureChange,
  isGenerating,
  onGenerate
}: DeepSiteConfigProps) {
  
  // Handle section toggle
  const toggleSection = (sectionId: string) => {
    if (siteStructure.sections.includes(sectionId)) {
      // Remove the section
      onSiteStructureChange({
        ...siteStructure,
        sections: siteStructure.sections.filter(s => s !== sectionId)
      });
    } else {
      // Add the section
      onSiteStructureChange({
        ...siteStructure,
        sections: [...siteStructure.sections, sectionId]
      });
    }
  };

  // Handle content depth change
  const handleDepthChange = (depth: string) => {
    onSiteStructureChange({
      ...siteStructure,
      contentDepth: depth as "basic" | "detailed" | "comprehensive"
    });
  };

  // Token usage estimates for different depth levels
  const getTokenMultiplier = (depth: string) => {
    switch (depth) {
      case "basic": return "1x";
      case "detailed": return "1.5x";
      case "comprehensive": return "2x";
      default: return "1x";
    }
  };

  return (
    <Card className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
      <CardTitle className="flex justify-between items-center text-lg font-semibold text-gray-800 mb-2">
        <div className="flex items-center">
          <span>DeepSite™ Generation</span>
          <Badge className="ml-2 bg-gradient-to-r from-indigo-500 to-purple-500">PRO</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-normal text-gray-600">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </CardTitle>
      
      <CardContent className="p-0 pt-2">
        {enabled ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              DeepSite™ generates comprehensive, multi-section landing pages with richer content
              and more detailed information architecture.
            </p>
            
            <div className="mb-4">
              <Label className="block text-sm text-gray-700 mb-2">Content Depth</Label>
              <Select
                value={siteStructure.contentDepth}
                onValueChange={handleDepthChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select content depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    Basic ({getTokenMultiplier("basic")} tokens)
                  </SelectItem>
                  <SelectItem value="detailed">
                    Detailed ({getTokenMultiplier("detailed")} tokens)
                  </SelectItem>
                  <SelectItem value="comprehensive">
                    Comprehensive ({getTokenMultiplier("comprehensive")} tokens)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Higher depth levels create more comprehensive content but use more tokens.
              </p>
            </div>
            
            <div>
              <Label className="block text-sm text-gray-700 mb-2">
                Page Sections ({siteStructure.sections.length} selected)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SECTIONS.map((section) => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={siteStructure.sections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label
                      htmlFor={`section-${section.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {section.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the sections you want to include in your landing page.
              </p>
            </div>
            
            <div className="mt-4">
              <Button
                onClick={onGenerate}
                disabled={isGenerating || siteStructure.sections.length === 0}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating DeepSite...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Generate DeepSite
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-center text-gray-500 mb-3">
              Enable DeepSite™ to create more comprehensive, content-rich landing pages with
              multiple sections and detailed information.
            </p>
            <Button
              variant="outline"
              onClick={() => onEnabledChange(true)}
              className="border-indigo-400 text-indigo-600 hover:bg-indigo-50"
            >
              Enable DeepSite™
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}