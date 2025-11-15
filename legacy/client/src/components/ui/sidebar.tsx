import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { TEMPLATE_CATEGORIES, COLOR_SCHEMES, FONT_OPTIONS, LAYOUT_OPTIONS } from "@/lib/templates";
import { Settings } from "@shared/schema";
import { ColorPicker } from "./color-picker";

interface SidebarProps {
  onNewProject: () => void;
  onCategorySelect: (categoryId: string) => void;
  selectedCategory: string | null;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export function Sidebar({
  onNewProject,
  onCategorySelect,
  selectedCategory,
  settings,
  onSettingsChange,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "components" | "settings">("templates");

  // Handle color change
  const handleColorChange = (color: string) => {
    onSettingsChange({
      ...settings,
      colors: {
        ...settings.colors,
        primary: color,
      },
    });
  };

  // Handle font change
  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      ...settings,
      font: e.target.value,
    });
  };

  // Handle layout change
  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({
      ...settings,
      layout: e.target.value,
    });
  };

  return (
    <aside className="bg-white border-r border-gray-200 w-full md:w-64 md:flex-shrink-0 overflow-auto">
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={onNewProject}
          className="w-full bg-primary hover:bg-blue-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "templates"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab("components")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "components"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Components
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "settings"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Settings
            </button>
          </div>

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              <div className="flex items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Template Category</h3>
              </div>
              <div className="space-y-2">
                {TEMPLATE_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className={selectedCategory === category.id ? "category-card-active" : "category-card"}
                  >
                    <span>{category.name}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === "components" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Drag and drop components will be added in future updates.
              </p>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                Configure additional settings for your landing page.
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Customization</h3>
          
          {/* Color Scheme */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Color Scheme</label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_SCHEMES.map((color) => (
                <ColorPicker
                  key={color.value}
                  color={color.value}
                  isSelected={settings.colors.primary === color.value}
                  onSelect={handleColorChange}
                />
              ))}
            </div>
          </div>
          
          {/* Font */}
          <div className="mb-4">
            <label htmlFor="font-select" className="block text-xs text-gray-500 mb-1">Font</label>
            <select
              id="font-select"
              className="form-select"
              value={settings.font}
              onChange={handleFontChange}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Layout */}
          <div className="mb-4">
            <label htmlFor="layout-select" className="block text-xs text-gray-500 mb-1">Layout</label>
            <select
              id="layout-select"
              className="form-select"
              value={settings.layout}
              onChange={handleLayoutChange}
            >
              {LAYOUT_OPTIONS.map((layout) => (
                <option key={layout.value} value={layout.value}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}
