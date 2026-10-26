"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { Card } from "./ui";
import { formatHours, formatMinutes } from "@/lib/format";
import type { ChartDay, ChartPerson, ChartSubject } from "./charts";

type Mode = "me" | "group";
type Range = 7 | 14 | 30;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink)",
  fontSize: 12,
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
};

const axisTick = { fontSize: 12, fill: "var(--color-chart-axis)" };

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface2 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The actual Recharts widgets. Loaded lazily by `ProgressCharts` so the heavy
 * charting library never sits in the dashboard's initial JS bundle.
 */
export default function ChartsInner({
  days,
  people,
  subjects,
}: {
  days: ChartDay[];
  people: ChartPerson[];
  subjects: ChartSubject[];
}) {
  const [mode, setMode] = useState<Mode>("group");
  const [range, setRange] = useState<Range>(7);

  const selected = days.slice(-range);
  const taskKey = mode === "me" ? "tasksMe" : "tasksGroup";
  const minuteKey = mode === "me" ? "minutesMe" : "minutesGroup";
  const totalTasks = selected.reduce((sum, day) => sum + day[taskKey], 0);
  const totalStudy = selected.reduce((sum, day) => sum + day[minuteKey], 0);

  type Row = { key: string; name: string; full: string; color: string; minutes: number };
  const rows: Row[] =
    mode === "group"
      ? people
          .map((person) => ({
            key: person.id,
            name: person.firstName,
            full: person.name,
            color: person.color,
            minutes: person.minutes[range],
          }))
          .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))
      : subjects
          .map((subject) => ({
            key: subject.subject,
            name: subject.subject,
            full: subject.subject,
            color: "var(--color-brand)",
            minutes: subject.minutes[range],
          }))
          .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));

  const modeLabel = mode === "me" ? "You" : "Whole group";
  const rangeLabel = `last ${range} days`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">Activity</h2>
          <p className="text-xs text-muted">
            Shared sessions plus your own. Switch between your numbers and the group.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Mode>
            label="Chart view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "me", label: "Me" },
              { value: "group", label: "Group" },
            ]}
          />
          <Segmented<Range>
            label="Chart range"
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: "7d" },
              { value: 14, label: "14d" },
              { value: 30, label: "30d" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 self-start lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">Tasks completed</h2>
              <p className="text-xs text-muted">
                {modeLabel}, {rangeLabel}
              </p>
            </div>
            {totalTasks > 0 ? (
              <p className="text-sm font-semibold tabular-nums">{totalTasks} total</p>
            ) : null}
          </div>
          {totalTasks === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted">
              No tasks completed in the last {range} days. Finish a task to see it here.
            </p>
          ) : (
            <div className="h-52 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selected} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    minTickGap={10}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={axisTick}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--color-surface2)" }}
                    formatter={(value) => {
                      const count = Number(value);
                      return [`${count} task${count === 1 ? "" : "s"}`, modeLabel];
                    }}
                  />
                  <Bar
                    dataKey={taskKey}
                    fill="var(--color-brand)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <div className="mb-3">
            <h2 className="font-semibold">
              {mode === "group" ? "Study by person" : "Study by subject"}
            </h2>
            <p className="text-xs text-muted">
              {mode === "group" ? "Shared sessions" : "Your sessions"} · {rangeLabel}
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted">
              No study logged in the last {range} days.
            </p>
          ) : (
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 2, right: 38, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={78}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) =>
                      value.length > 12 ? `${value.slice(0, 11)}…` : value
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--color-surface2)" }}
                    formatter={(value) => [formatMinutes(Number(value)), "Studied"]}
                  />
                  <Bar
                    dataKey="minutes"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={18}
                    minPointSize={2}
                    isAnimationActive={false}
                  >
                    {rows.map((row) => (
                      <Cell key={row.key} fill={row.color} />
                    ))}
                    <LabelList
                      dataKey="minutes"
                      position="right"
                      offset={6}
                      fill="var(--color-ink)"
                      fontSize={12}
                      fontWeight={600}
                      formatter={(value: number) => formatHours(Number(value))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="min-w-0 self-start lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">Study minutes</h2>
              <p className="text-xs text-muted">
                {modeLabel}, {rangeLabel} · tap a bar for the exact time
              </p>
            </div>
            {totalStudy > 0 ? (
              <p className="text-sm font-semibold tabular-nums">{formatMinutes(totalStudy)}</p>
            ) : null}
          </div>
          {totalStudy === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted">
              No study logged in the last {range} days. Start a timer or log a session.
            </p>
          ) : (
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selected} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    minTickGap={10}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={axisTick}
                    width={46}
                    tickFormatter={(value: number) => formatMinutes(value)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--color-surface2)" }}
                    formatter={(value) => [formatMinutes(Number(value)), modeLabel]}
                  />
                  <Bar
                    dataKey={minuteKey}
                    fill="var(--color-brand)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={30}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
