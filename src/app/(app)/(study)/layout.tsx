import { Tabs } from "@/components/tabs";

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Tabs
        label="Study"
        className="mb-5"
        exactHrefs={["/study"]}
        items={[
          { href: "/study", label: "Log & focus" },
          { href: "/habits", label: "Habits" },
        ]}
      />
      {children}
    </div>
  );
}
