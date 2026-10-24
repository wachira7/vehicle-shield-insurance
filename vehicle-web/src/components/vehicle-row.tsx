import Link from "next/link";
import type { Vehicle } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import { Card } from "./ui";

export function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="block">
      <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </p>
          <p className="font-mono text-sm text-ink-muted">{vehicle.plate}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </Card>
    </Link>
  );
}
