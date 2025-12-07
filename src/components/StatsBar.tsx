import { Users, UserCheck, UserX, Phone } from "lucide-react";
import type { ExtensionWithStatus } from "@/types/extension";

interface StatsBarProps {
  extensions: ExtensionWithStatus[];
}

export function StatsBar({ extensions }: StatsBarProps) {
  const total = extensions.length;
  const online = extensions.filter(e => e.status === 'online').length;
  const busy = extensions.filter(e => e.status === 'busy').length;
  const offline = extensions.filter(e => e.status === 'offline').length;

  const stats = [
    { label: 'Total', value: total, icon: Users, color: 'text-primary bg-primary/10' },
    { label: 'Available', value: online, icon: UserCheck, color: 'text-accent bg-accent/10' },
    { label: 'Busy', value: busy, icon: Phone, color: 'text-destructive bg-destructive/10' },
    { label: 'Offline', value: offline, icon: UserX, color: 'text-muted-foreground bg-muted' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div 
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
