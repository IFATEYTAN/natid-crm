import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }) {
  return (
    <div className={cn("flex justify-center items-center p-4", className)}>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}