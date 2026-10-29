import { Tabs } from "@/components/tabs";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Tabs
        label="Library"
        className="mb-5"
        items={[
          { href: "/notes", label: "Notes" },
          { href: "/resources", label: "Resources" },
          { href: "/questions", label: "Doubts" },
          { href: "/flashcards", label: "Flashcards" },
        ]}
      />
      {children}
    </div>
  );
}
