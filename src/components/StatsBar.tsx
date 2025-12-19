import { Users, UserCheck, UserX, Phone } from "lucide-react";
import type { ExtensionWithStatus } from "@/types/extension";

interface StatsBarProps {
  extensions: ExtensionWithStatus[];
}

export function StatsBar({ extensions }: StatsBarProps) {
  const total = extensions.length;
  const available = extensions.filter(e => e.status === 'available').length;
  const onCall = extensions.filter(e => e.status === 'incall' || e.status === 'busy' || e.status === 'ringing' || e.status === 'hold').length;
  const unavailable = extensions.filter(e => e.status === 'unavailable' || e.status === 'unknown').length;

  const stats = [
    { label: 'Total', value: total, icon: Users, color: 'text-primary bg-primary/10' },
    { label: 'Available', value: available, icon: UserCheck, color: 'text-accent bg-accent/10' },
    { label: 'On Call', value: onCall, icon: Phone, color: 'text-destructive bg-destructive/10' },
    { label: 'Unavailable', value: unavailable, icon: UserX, color: 'text-muted-foreground bg-muted' },
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
