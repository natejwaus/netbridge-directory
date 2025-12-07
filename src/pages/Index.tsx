import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { StatsBar } from "@/components/StatsBar";
import { ExtensionGrid } from "@/components/ExtensionGrid";
import { useExtensions } from "@/hooks/useExtensions";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { extensions, isLoading, lastUpdated, refresh } = useExtensions();

  const filteredExtensions = useMemo(() => {
    if (!searchQuery.trim()) return extensions;

    const query = searchQuery.toLowerCase();
    return extensions.filter(ext => 
      ext.name?.toLowerCase().includes(query) ||
      ext.extension.includes(query) ||
      ext.department?.toLowerCase().includes(query) ||
      ext.email?.toLowerCase().includes(query)
    );
  }, [extensions, searchQuery]);

  return (
    <div className="min-h-screen gradient-surface">
      <Header 
        onRefresh={refresh} 
        isLoading={isLoading} 
        lastUpdated={lastUpdated} 
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            NetBridge PBX Directory
          </h2>
          <p className="text-muted-foreground">
            Find and connect with team members across NetBridge PBX.
          </p>
        </div>

        <div className="space-y-6">
          <StatsBar extensions={extensions} />
          
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredExtensions.length}
            totalCount={extensions.length}
          />

          <ExtensionGrid 
            extensions={filteredExtensions} 
            isLoading={isLoading} 
          />
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} NetBridge PBX. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered By NateIT https://nateit.com.au
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
