import React from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  color: string;
  isSelected: boolean;
  onSelect: (color: string) => void;
}

export function ColorPicker({ color, isSelected, onSelect }: ColorPickerProps) {
  return (
    <button
      className={cn(
        "w-6 h-6 rounded-full",
        isSelected ? "ring-2 ring-offset-2" : ""
      )}
      style={{ 
        backgroundColor: color,
        ringColor: color
      }}
      onClick={() => onSelect(color)}
      aria-label={`Select color ${color}`}
    />
  );
}
