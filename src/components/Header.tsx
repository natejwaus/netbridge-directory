import { RefreshCw } from "lucide-react";
import netbridgeLogo from "@/assets/NetBridge_PBX.png";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated?: Date;
}

export function Header({ onRefresh, isLoading, lastUpdated }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <img 
            src={netbridgeLogo} 
            alt="NetBridge PBX" 
            className="h-16 w-auto"
          />
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary hover:border-primary/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
