import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SiteStructure } from "@shared/schema";
import { Sparkles } from "lucide-react";

interface DeepSiteConfigProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  siteStructure: SiteStructure;
  onSiteStructureChange: (siteStructure: SiteStructure) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function DeepSiteConfig({
  enabled,
  onEnabledChange,
  siteStructure,
  onSiteStructureChange,
  isGenerating,
  onGenerate,
}: DeepSiteConfigProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // All available sections
  const allSections = [
    { id: "hero", label: "Hero Section" },
    { id: "features", label: "Features" },
    { id: "testimonials", label: "Testimonials" },
    { id: "about", label: "About Us" },
    { id: "contact", label: "Contact" },
    { id: "pricing", label: "Pricing" },
    { id: "gallery", label: "Gallery" },
    { id: "team", label: "Team" },
    { id: "faq", label: "FAQ" },
    { id: "blog", label: "Blog Highlights" }
  ];

  // Handler for section toggle
  const handleSectionToggle = (section: string, checked: boolean) => {
    const newSections = checked
      ? [...siteStructure.sections, section]
      : siteStructure.sections.filter(s => s !== section);
    
    onSiteStructureChange({
      ...siteStructure,
      sections: newSections
    });
  };

  // Handler for content depth change
  const handleContentDepthChange = (depth: "basic" | "detailed" | "comprehensive") => {
    onSiteStructureChange({
      ...siteStructure,
      contentDepth: depth
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="text-lg flex justify-between items-center">
          <div className="flex items-center">
            <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
            DeepSite™ Configuration
          </div>
          <span className="text-sm text-gray-500">{isExpanded ? "▲" : "▼"}</span>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-6">
            {/* DeepSite toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="deepsite-toggle" className="font-medium">
                  Enable DeepSite™ Generation
                </Label>
                <p className="text-sm text-gray-500">
                  The next generation of AI-powered landing page creation
                </p>
              </div>
              <Switch
                id="deepsite-toggle"
                checked={enabled}
                onCheckedChange={onEnabledChange}
                disabled={true} // Always enabled in this version
              />
            </div>
            
            {/* Content depth selection */}
            <div className="space-y-3">
              <Label className="font-medium">Content Depth</Label>
              <RadioGroup
                value={siteStructure.contentDepth}
                onValueChange={handleContentDepthChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="depth-basic" />
                  <Label htmlFor="depth-basic">Basic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="depth-detailed" />
                  <Label htmlFor="depth-detailed">Detailed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comprehensive" id="depth-comprehensive" />
                  <Label htmlFor="depth-comprehensive">Comprehensive</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-500">
                Comprehensive generates more detailed content but uses more tokens.
              </p>
            </div>
            
            {/* Section selection */}
            <div className="space-y-3">
              <Label className="font-medium">Page Sections</Label>
              <div className="grid grid-cols-2 gap-2">
                {allSections.map((section) => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={siteStructure.sections.includes(section.id)}
                      onCheckedChange={(checked) =>
                        handleSectionToggle(section.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`section-${section.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Select the sections you want included in your landing page.
              </p>
            </div>
            
            <div>
              <Button
                onClick={onGenerate}
                disabled={isGenerating || siteStructure.sections.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                Generate Complete Landing Page
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}