import { cn } from "@/lib/utils";
import { Code, CodeIcon } from "lucide-react";

interface LogoProps {
  className?: string;
}

export function LandingcraftLogo({ className }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center text-primary bg-black rounded-lg", className)}>
      <CodeIcon className="h-full w-full stroke-current" />
    </div>
  );
}