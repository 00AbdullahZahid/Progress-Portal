import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { HabitTracker } from "@/components/habit-tracker";
import { publicUserSelect } from "@/lib/user";

export default async function HabitsPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);
  const last30 = lastNDays(me.timezone, 30);

  const [habits, allCheckins] = await Promise.all([
    db.habit.findMany({
      where: { ownerId: me.id },
      include: { checkins: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    db.habitCheckIn.findMany({
      where: { date: today },
      include: { habit: { include: { owner: { select: publicUserSelect } } } },
    }),
  ]);

  const serialized = habits.map((h) => ({
    id: h.id,
    name: h.name,
    // Dates within the visible grid, plus the full history for streaks.
    checkinDates: h.checkins
      .map((c) => c.date)
      .filter((d) => d >= last30[0]),
    allDates: h.checkins.map((c) => c.date),
  }));

  const groupToday = allCheckins.map((c) => ({
    habitName: c.habit.name,
    owner: {
      id: c.habit.owner.id,
      name: c.habit.owner.name,
      color: c.habit.owner.color,
      image: c.habit.owner.image,
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
