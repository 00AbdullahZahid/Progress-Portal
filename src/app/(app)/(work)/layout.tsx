import { Tabs } from "@/components/tabs";

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Tabs
        label="Work"
        className="mb-5"
        items={[
          { href: "/tasks", label: "Tasks" },
          { href: "/exams", label: "Deadlines" },
          { href: "/timetable", label: "Timetable" },
        ]}
      />
      {children}
    </div>
  );
}
