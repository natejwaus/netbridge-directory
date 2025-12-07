import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Extension, ExtensionWithStatus, ExtensionStatus } from '@/types/extension';

function getRandomStatus(): ExtensionStatus {
  const statuses: ExtensionStatus[] = ['online', 'online', 'online', 'offline', 'busy', 'away'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function addStatusToExtensions(extensions: Extension[]): ExtensionWithStatus[] {
  return extensions.map(ext => ({
    ...ext,
    status: getRandomStatus(),
  }));
}

export function useExtensions() {
  const [extensions, setExtensions] = useState<ExtensionWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [error, setError] = useState<string | null>(null);

  const fetchExtensions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching extensions from PBX...');
      
      const { data, error: fnError } = await supabase.functions.invoke('fetch-extensions');
      
      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Failed to fetch extensions');
      }

      console.log('Response from edge function:', data);

      if (data?.success && data?.extensions) {
        const extensionsWithStatus = addStatusToExtensions(data.extensions);
        setExtensions(extensionsWithStatus);
        setLastUpdated(new Date(data.lastUpdated || Date.now()));
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        // Fallback to demo data if no extensions returned
        console.log('No extensions returned, using demo data');
        const demoExtensions: Extension[] = [
          { extension: '101', name: 'Reception', department: 'Front Desk', voicemail: 'enabled' },
          { extension: '102', name: 'Support Team', department: 'Support', voicemail: 'enabled' },
          { extension: '103', name: 'Sales Team', department: 'Sales', voicemail: 'enabled' },
        ];
        const extensionsWithStatus = addStatusToExtensions(demoExtensions);
        setExtensions(extensionsWithStatus);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch extensions';
      setError(errorMessage);
      console.error('Error fetching extensions:', err);
      
      // Use demo data on error
      const demoExtensions: Extension[] = [
        { extension: '101', name: 'Reception', department: 'Front Desk', voicemail: 'enabled' },
        { extension: '102', name: 'Support Team', department: 'Support', voicemail: 'enabled' },
        { extension: '103', name: 'Sales Team', department: 'Sales', voicemail: 'enabled' },
      ];
      const extensionsWithStatus = addStatusToExtensions(demoExtensions);
      setExtensions(extensionsWithStatus);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExtensions();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchExtensions, 60000);
    return () => clearInterval(interval);
  }, [fetchExtensions]);

  return {
    extensions,
    isLoading,
    lastUpdated,
    error,
    refresh: fetchExtensions,
  };
}
