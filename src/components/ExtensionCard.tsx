import { Phone, Mail, Building2, Voicemail, User } from "lucide-react";
import type { ExtensionWithStatus } from "@/types/extension";

interface ExtensionCardProps {
  extension: ExtensionWithStatus;
  index: number;
}

const statusConfig = {
  available: {
    label: 'Available',
    class: 'status-online',
    dot: 'bg-accent',
  },
  incall: {
    label: 'On Call',
    class: 'status-busy',
    dot: 'bg-destructive',
  },
  ringing: {
    label: 'Ringing',
    class: 'bg-amber-500/10 text-amber-600',
    dot: 'bg-amber-500',
  },
  busy: {
    label: 'Busy',
    class: 'status-busy',
    dot: 'bg-destructive',
  },
  dnd: {
    label: 'Do Not Disturb',
    class: 'bg-orange-500/10 text-orange-600',
    dot: 'bg-orange-500',
  },
  unavailable: {
    label: 'Not Registered',
    class: 'status-offline',
    dot: 'bg-muted-foreground',
  },
  hold: {
    label: 'On Hold',
    class: 'bg-purple-500/10 text-purple-600',
    dot: 'bg-purple-500',
  },
  unknown: {
    label: 'Unknown',
    class: 'status-offline',
    dot: 'bg-muted-foreground',
  },
};

export function ExtensionCard({ extension, index }: ExtensionCardProps) {
  const status = statusConfig[extension.status] || statusConfig.unknown;
  const displayStatusText = extension.statusText || status.label;
  
  return (
    <div 
      className="directory-card animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {extension.name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg font-bold text-primary">
                {extension.extension}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.class}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {displayStatusText}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {extension.email && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <a 
              href={`mailto:${extension.email}`}
              className="truncate hover:text-primary transition-colors"
            >
              {extension.email}
            </a>
          </div>
        )}
        
        {extension.department && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Company: {extension.department}</span>
          </div>
        )}

        {extension.voicemail === 'enabled' && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Voicemail className="h-4 w-4 flex-shrink-0" />
            <span>Voicemail enabled</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`tel:+61284031200,690${extension.extension}`}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Phone className="h-4 w-4" />
          Call Extension
        </a>
      </div>
    </div>
  );
}
