"use client";

import dynamic from "next/dynamic";
import { Card } from "./ui";

type DayPoint = { label: string; date: string; count?: number; minutes?: number };
type UserPoint = { name: string; color: string; minutes: number };

/**
 * Recharts is heavy (~100kB) and only used here, so we load it on the client
 * after the page paints. The skeleton keeps layout stable while it arrives.
 */
const Charts = dynamic(() => import("./charts-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-3" aria-hidden="true">
      <Card className="lg:col-span-2">
        <div className="h-48 animate-pulse rounded-xl bg-surface2" />
      </Card>
      <Card>
        <div className="h-48 animate-pulse rounded-xl bg-surface2" />
      </Card>
      <Card className="lg:col-span-3">
        <div className="h-44 animate-pulse rounded-xl bg-surface2" />
      </Card>
    </div>
  ),
});

export function ProgressCharts({
  tasksByDay,
  studyByDay,
  studyByUser,
}: {
  tasksByDay: DayPoint[];
  studyByDay: DayPoint[];
  studyByUser: UserPoint[];
}) {
  return (
    <Charts
      tasksByDay={tasksByDay}
      studyByDay={studyByDay}
      studyByUser={studyByUser}
    />
  );
}

