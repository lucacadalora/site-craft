import { cn } from "@/lib/utils";
import { Telescope } from "lucide-react";

interface LogoProps {
  className?: string;
}

export function LandingcraftLogo({ className }: LogoProps) {
  return (
    <div className={cn("text-primary", className)}>
      <Telescope className="h-full w-full stroke-current" />
    </div>
  );
}