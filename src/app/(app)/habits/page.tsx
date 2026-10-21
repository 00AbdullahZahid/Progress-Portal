import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { HabitTracker } from "@/components/habit-tracker";

export default async function HabitsPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);
  const last30 = lastNDays(me.timezone, 30);

  const [habits, allCheckins] = await Promise.all([
    db.habit.findMany({
      where: { ownerId: me.id },
      include: { checkins: { where: { date: { gte: last30[0] } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.habitCheckIn.findMany({
      where: { date: today },
      include: { habit: { include: { owner: true } } },
    }),
  ]);

  const serialized = habits.map((h) => ({
    id: h.id,
    name: h.name,
    checkinDates: h.checkins.map((c) => c.date),
  }));

  const groupToday = allCheckins.map((c) => ({
    habitName: c.habit.name,
    owner: {
      id: c.habit.owner.id,
      name: c.habit.owner.name,
      color: c.habit.owner.color,
    },
  }));

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle="Tap to check in. Streaks build one day at a time."
      />
      <HabitTracker
        habits={serialized}
        days={last30}
        today={today}
        groupToday={groupToday}
        meId={me.id}
      />
    </div>
  );
}
