"use client";

import dynamic from "next/dynamic";
import { Card } from "./ui";

export type ChartDay = {
  label: string;
  date: string;
  tasksMe: number;
  tasksGroup: number;
  minutesMe: number;
  minutesGroup: number;
};

export type ChartPerson = {
  id: string;
  name: string;
  firstName: string;
  color: string;
  minutes: Record<7 | 14 | 30, number>;
};

export type ChartSubject = {
  subject: string;
  minutes: Record<7 | 14 | 30, number>;
};

/**
 * Recharts is heavy (~100kB) and only used here, so we load it on the client
 * after the page paints. The skeleton keeps layout stable while it arrives.
 */
const Charts = dynamic(() => import("./charts-inner"), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true">
      <div className="mb-3 h-10 animate-pulse rounded-xl bg-surface2/70" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="h-56 animate-pulse rounded-xl bg-surface2" />
        </Card>
        <Card>
          <div className="h-56 animate-pulse rounded-xl bg-surface2" />
        </Card>
        <Card className="lg:col-span-3">
          <div className="h-56 animate-pulse rounded-xl bg-surface2" />
        </Card>
      </div>
    </div>
  ),
});

export function ProgressCharts({
  days,
  people,
  subjects,
}: {
  days: ChartDay[];
  people: ChartPerson[];
  subjects: ChartSubject[];
}) {
  return <Charts days={days} people={people} subjects={subjects} />;
}
