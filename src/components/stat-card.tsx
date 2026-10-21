import type { ReactNode } from "react";
import { Card } from "./ui";

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="text-brand [&>svg]:h-6 [&>svg]:w-6">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </Card>
  );
}
