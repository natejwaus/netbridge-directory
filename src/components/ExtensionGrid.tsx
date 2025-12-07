import { ExtensionCard } from "./ExtensionCard";
import type { ExtensionWithStatus } from "@/types/extension";
import { Users } from "lucide-react";

interface ExtensionGridProps {
  extensions: ExtensionWithStatus[];
  isLoading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="directory-card animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-6 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="h-10 w-full rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-6">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No extensions found
      </h3>
      <p className="text-muted-foreground max-w-sm">
        Try adjusting your search terms or check back later for updates.
      </p>
    </div>
  );
}

export function ExtensionGrid({ extensions, isLoading }: ExtensionGridProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (extensions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {extensions.map((ext, index) => (
        <ExtensionCard 
          key={ext.extension} 
          extension={ext} 
          index={index}
        />
      ))}
    </div>
  );
}
