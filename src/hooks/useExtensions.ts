import { useState, useEffect, useCallback } from 'react';
import type { Extension, ExtensionWithStatus, ExtensionStatus } from '@/types/extension';

// Demo data - will be replaced with actual PBX data when backend is connected
const demoExtensions: Extension[] = [
  { extension: '101', name: 'John Smith', email: 'john@netbridge.com', department: 'Sales', voicemail: 'enabled' },
  { extension: '102', name: 'Sarah Johnson', email: 'sarah@netbridge.com', department: 'Support', voicemail: 'enabled' },
  { extension: '103', name: 'Mike Davis', email: 'mike@netbridge.com', department: 'Engineering', voicemail: 'enabled' },
  { extension: '104', name: 'Emily Brown', email: 'emily@netbridge.com', department: 'Marketing', voicemail: 'enabled' },
  { extension: '105', name: 'David Wilson', email: 'david@netbridge.com', department: 'Sales', voicemail: 'enabled' },
  { extension: '106', name: 'Lisa Anderson', email: 'lisa@netbridge.com', department: 'HR', voicemail: 'enabled' },
  { extension: '107', name: 'James Taylor', email: 'james@netbridge.com', department: 'Engineering', voicemail: 'enabled' },
  { extension: '108', name: 'Jennifer Martinez', email: 'jennifer@netbridge.com', department: 'Finance', voicemail: 'enabled' },
  { extension: '109', name: 'Robert Garcia', email: 'robert@netbridge.com', department: 'Support', voicemail: 'enabled' },
  { extension: '110', name: 'Michelle Lee', email: 'michelle@netbridge.com', department: 'Sales', voicemail: 'enabled' },
  { extension: '111', name: 'William Thomas', email: 'william@netbridge.com', department: 'Engineering', voicemail: 'enabled' },
  { extension: '112', name: 'Amanda White', email: 'amanda@netbridge.com', department: 'Marketing', voicemail: 'enabled' },
];

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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // TODO: Replace with actual API call to Supabase Edge Function
      // const { data, error } = await supabase.functions.invoke('fetch-extensions');
      
      const extensionsWithStatus = addStatusToExtensions(demoExtensions);
      setExtensions(extensionsWithStatus);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch extensions');
      console.error('Error fetching extensions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExtensions();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchExtensions, 30000);
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
