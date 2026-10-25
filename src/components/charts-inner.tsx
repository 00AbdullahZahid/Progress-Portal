"use client";

import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "./ui";

type DayPoint = { label: string; date: string; count?: number; minutes?: number };
type UserPoint = { name: string; color: string; minutes: number };

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  fontSize: 12,
};

/**
 * The actual Recharts widgets. Loaded lazily by `ProgressCharts` so the heavy
 * charting library never sits in the dashboard's initial JS bundle.
 */
export default function ChartsInner({
  tasksByDay,
  studyByDay,
  studyByUser,
}: {
  tasksByDay: DayPoint[];
  studyByDay: DayPoint[];
  studyByUser: UserPoint[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="mb-1 font-semibold">Tasks completed</h2>
        <p className="mb-3 text-xs text-muted">Last 14 days, whole group</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tasksByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                interval={2}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                width={24}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-surface2)" }} />
              <Bar dataKey="count" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Study by person</h2>
        <p className="mb-3 text-xs text-muted">Last 14 days (hours)</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studyByUser} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={60}
                tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${Math.round(v / 6) / 10}h`, "studied"]}
              />
              <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                {studyByUser.map((u) => (
                  <Cell key={u.name} fill={u.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <h2 className="mb-1 font-semibold">Study minutes</h2>
        <p className="mb-3 text-xs text-muted">Last 14 days, whole group</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={studyByDay}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                interval={2}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                width={32}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="var(--color-brand)"
                fill="url(#studyGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
