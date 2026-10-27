"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createResource,
  deleteResource,
  toggleResourceFavorite,
  toggleResourceRead,
  toggleResourceUseful,
} from "@/lib/actions/resources";
import { FileUpload, type Attached } from "./file-upload";
import { Avatar } from "./avatar";
import { Button, Card, EmptyState, Input, PageHeader, Select, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useBodyLock, useToast } from "./toast";
import {
  BookIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  LinkIcon,
  MoreIcon,
  PaperIcon,
  PlusIcon,
  SearchIcon,
  PeopleIcon,
  StarIcon,
  ThumbsUpIcon,
  VideoIcon,
  XIcon,
} from "./icons";

export type ResourceKind = "paper" | "notes" | "book" | "video" | "link" | "other";

export type ResourceRow = {
  id: string;
  title: string;
  subject: string;
  kind: ResourceKind;
  url: string | null;
  note: string | null;
  fileName: string | null;
  fileSize: number | null;
  mime: string | null;
  year: number | null;
  semester: string | null;
  examType: string | null;
  createdAt: string;
  addedById: string;
  addedBy: { id: string; name: string; color: string; image?: string | null };
  favorite: boolean;
  useful: boolean;
  usefulCount: number;
  read: boolean;
};

type SortKey = "newest" | "az" | "useful";
type TabKey = "all" | "paper" | "book" | "links" | "files";
type Preview = {
  url: string;
  title: string;
  description: string;
  siteName: string;
  favicon: string | null;
  kind: ResourceKind;
};

const KIND_OPTIONS: Array<{
  value: ResourceKind;
  label: string;
  Icon: typeof BookIcon;
  className: string;
}> = [
  { value: "paper", label: "Past paper", Icon: PaperIcon, className: "text-brand" },
  { value: "book", label: "Book", Icon: BookIcon, className: "text-amber-600 dark:text-amber-300" },
  { value: "link", label: "Link", Icon: LinkIcon, className: "text-sky-600 dark:text-sky-300" },
  { value: "video", label: "Video", Icon: VideoIcon, className: "text-violet-600 dark:text-violet-300" },
  { value: "notes", label: "Notes", Icon: FileIcon, className: "text-emerald-600 dark:text-emerald-300" },
  { value: "other", label: "Other", Icon: FileIcon, className: "text-muted" },
];

const TABS: Array<{ value: TabKey; label: string }> = [
  { value: "all", label: "All" },
  { value: "paper", label: "Past papers" },
  { value: "book", label: "Books" },
  { value: "links", label: "Links" },
  { value: "files", label: "Files" },
];

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "az", label: "A–Z" },
  { value: "useful", label: "Most useful" },
];

const COLLAPSE_KEY = "resources-collapsed-subjects";

function kindMeta(kind: ResourceKind) {
  return KIND_OPTIONS.find((option) => option.value === kind) ?? KIND_OPTIONS[5];
}

function isKind(value: unknown): value is ResourceKind {
  return KIND_OPTIONS.some((option) => option.value === value);
}

function isUploaded(resource: ResourceRow): boolean {
  return Boolean(
    resource.fileName ||
      (resource.url && resource.url.includes(".public.blob.vercel-storage.com"))
  );
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function formatBytes(size: number | null): string {
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    const kb = size / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileType(resource: ResourceRow): string {
  if (resource.mime) {
    const map: Record<string, string> = {
      "application/pdf": "PDF",
      "application/msword": "DOC",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "application/vnd.ms-excel": "XLS",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
      "text/plain": "TXT",
      "image/png": "PNG",
      "image/jpeg": "JPG",
    };
    return map[resource.mime] ?? resource.mime.split("/")[1]?.toUpperCase() ?? "File";
  }
  const extension = resource.fileName?.split(".").pop();
  return extension && extension.length <= 5 ? extension.toUpperCase() : "File";
}

function tabForKind(kind: ResourceKind): TabKey {
  if (kind === "paper") return "paper";
  if (kind === "book") return "book";
  if (kind === "link" || kind === "video") return "links";
  return "files";
}

function tabMatches(kind: ResourceKind, tab: TabKey): boolean {
  return tab === "all" || tabForKind(kind) === tab;
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function subtitleFor(resource: ResourceRow): string {
  const parts: string[] = [];
  if (resource.kind === "paper") {
    if (resource.year) parts.push(String(resource.year));
    if (resource.semester) parts.push(resource.semester);
    if (resource.examType) parts.push(resource.examType);
  }
  if (isUploaded(resource)) {
    parts.push(fileType(resource));
    const size = formatBytes(resource.fileSize);
    if (size) parts.push(size);
  } else {
    const host = hostOf(resource.url);
    if (host) parts.push(host);
  }
  return parts.join(" · ");
}

function sortResources(list: ResourceRow[], sort: SortKey): ResourceRow[] {
  return [...list].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (sort === "az") return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (sort === "useful") {
      if (a.usefulCount !== b.usefulCount) return b.usefulCount - a.usefulCount;
    }
    if (sort === "newest" && a.kind === "paper" && b.kind === "paper" && a.year !== b.year) {
      return (b.year ?? 0) - (a.year ?? 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function searchText(resource: ResourceRow): string {
  return [
    resource.title,
    resource.subject,
    resource.note,
    resource.fileName,
    resource.year,
    resource.semester,
    resource.examType,
    hostOf(resource.url),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ResourcesBoard({
  resources,
  meId,
  isAdmin,
  subjects,
}: {
  resources: ResourceRow[];
  meId: string;
  isAdmin: boolean;
  subjects: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [mine, setMine] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());

  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [kind, setKind] = useState<ResourceKind>("paper");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<Attached | null>(null);
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ResourceRow | null>(null);
  const [menuResource, setMenuResource] = useState<ResourceRow | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const previewTried = useRef("");
  const kindTouched = useRef(false);

  useBodyLock(adding || menuResource !== null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCollapsedSubjects(new Set(parsed.filter((value) => typeof value === "string")));
      }
    } catch {
      // A stale preference should not block the page.
    }
  }, []);

  useEffect(() => {
    if (!adding) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setAdding(false);
        resetForm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, busy]);

  useEffect(() => {
    if (!menuResource) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuResource(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuResource]);

  const loadPreview = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    previewTried.current = value;
    setFetchingPreview(true);
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        url?: string;
        title?: string;
        description?: string;
        siteName?: string;
        favicon?: string | null;
        kind?: string;
      };
      const nextKind = isKind(data.kind) ? data.kind : "link";
      setPreview({
        url: data.url ?? value,
        title: data.title?.trim() ?? "",
        description: data.description?.trim() ?? "",
        siteName: data.siteName?.trim() ?? "",
        favicon: typeof data.favicon === "string" ? data.favicon : null,
        kind: nextKind,
      });
      setTitle((current) => (current.trim() ? current : data.title?.trim() ?? ""));
      if (!kindTouched.current) setKind(nextKind);
    } catch {
      // Link metadata is a convenience; the resource still saves without it.
    } finally {
      setFetchingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (!adding) return;
    const raw = link.trim();
    if (!raw) {
      previewTried.current = "";
      setPreview(null);
      return;
    }
    if (title.trim() || previewTried.current === raw) return;
    let valid = false;
    try {
      const url = new URL(raw);
      valid = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid) return;
    const timer = window.setTimeout(() => void loadPreview(raw), 700);
    return () => window.clearTimeout(timer);
  }, [adding, link, title, loadPreview]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: resources.length,
      paper: 0,
      book: 0,
      links: 0,
      files: 0,
    };
    for (const resource of resources) counts[tabForKind(resource.kind)] += 1;
    return counts;
  }, [resources]);

  const filteredBase = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((resource) => {
      if (mine && resource.addedById !== meId) return false;
      if (!tabMatches(resource.kind, tab)) return false;
      if (needle && !searchText(resource).includes(needle)) return false;
      return true;
    });
  }, [resources, mine, meId, tab, query]);

  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resource of filteredBase) {
      counts.set(resource.subject, (counts.get(resource.subject) ?? 0) + 1);
    }
    return counts;
  }, [filteredBase]);

  const visible = useMemo(
    () => filteredBase.filter((resource) => !subject || resource.subject === subject),
    [filteredBase, subject]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ResourceRow[]>();
    for (const resource of visible) {
      const list = map.get(resource.subject) ?? [];
      list.push(resource);
      map.set(resource.subject, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map(([name, list]) => ({ name, list: sortResources(list, sort) }));
  }, [visible, sort]);

  const recent = useMemo(
    () =>
      [...resources]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [resources]
  );

  const duplicate = useMemo(() => {
    const linkKey = link.trim() ? normalizeUrl(link) : "";
    const titleKey = title.trim().toLowerCase();
    const subjectKey = subjectInput.trim().toLowerCase();
    return resources.find(
      (resource) =>
        (linkKey && resource.url && normalizeUrl(resource.url) === linkKey) ||
        (titleKey &&
          resource.title.trim().toLowerCase() === titleKey &&
          (!subjectKey || resource.subject.toLowerCase() === subjectKey))
    );
  }, [resources, link, title, subjectInput]);

  function resetForm() {
    setTitle("");
    setSubjectInput("");
    setKind("paper");
    setLink("");
    setNote("");
    setFile(null);
    setYear("");
    setSemester("");
    setExamType("");
    setPreview(null);
    setFetchingPreview(false);
    setTitleTouched(false);
    kindTouched.current = false;
    previewTried.current = "";
  }

  function openAdd() {
    resetForm();
    setAdding(true);
  }

  function closeAdd() {
    if (busy) return;
    setAdding(false);
    resetForm();
  }

  function chooseKind(next: ResourceKind) {
    kindTouched.current = true;
    setKind(next);
  }

  function changeLink(value: string) {
    setLink(value);
    if (preview && normalizeUrl(preview.url) !== normalizeUrl(value)) setPreview(null);
    if (!titleTouched) setTitle("");
  }

  function changeFile(next: Attached | null) {
    setFile(next);
    if (next && !titleTouched && !title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, ""));
    }
  }

  function toggleSubject(name: string) {
    setCollapsedSubjects((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setSubject("");
    setTab("all");
    setMine(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalTitle = (title.trim() || file?.name.replace(/\.[^.]+$/, "") || "").trim();
    const finalSubject = subjectInput.trim();
    if (!finalTitle || !finalSubject) {
      toast("Add a title and subject first.", "error");
      return;
    }
    if (!link.trim() && !file) {
      toast("Add a link or upload a file first.", "error");
      return;
    }

    const fd = new FormData();
    fd.set("title", finalTitle);
    fd.set("subject", finalSubject);
    fd.set("kind", kind);
    fd.set("url", link.trim() || file?.url || "");
    fd.set("note", note);
    if (file && !link.trim()) {
      fd.set("fileName", file.name);
      fd.set("fileSize", file.size ? String(file.size) : "");
      fd.set("mime", file.mime ?? "");
    }
    if (kind === "paper") {
      fd.set("year", year);
      fd.set("semester", semester);
      fd.set("examType", examType);
    }

    setBusy(true);
    try {
      const result = await createResource(fd);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(
        "Resource added",
        "success",
        result.id ? { label: "View", href: `/resources#resource-${result.id}` } : undefined
      );
      setAdding(false);
      resetForm();
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const fd = new FormData();
    fd.set("resourceId", target.id);
    try {
      const result = await deleteResource(fd);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast("Resource removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  async function toggleAction(type: "favorite" | "useful" | "read", resource: ResourceRow) {
    const key = `${type}:${resource.id}`;
    setActionKey(key);
    const fd = new FormData();
    fd.set("resourceId", resource.id);
    try {
      const action =
        type === "favorite"
          ? toggleResourceFavorite
          : type === "useful"
            ? toggleResourceUseful
            : toggleResourceRead;
      const result = await action(fd);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setActionKey(null);
    }
  }

  async function copyLink(resource: ResourceRow) {
    if (!resource.url) return;
    try {
      await navigator.clipboard.writeText(resource.url);
      toast("Link copied", "success");
    } catch {
      toast("Could not copy the link.", "error");
    }
    setMenuResource(null);
  }

  function rowActions(resource: ResourceRow, mobile = false) {
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void toggleAction("useful", resource)}
          disabled={actionKey === `useful:${resource.id}`}
          aria-pressed={resource.useful}
          aria-label={`${resource.useful ? "Remove useful mark from" : "Mark useful"} ${resource.title}`}
          title="Useful"
          className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50 ${
            resource.useful ? "text-brand" : "text-muted hover:bg-surface2 hover:text-ink"
          }`}
        >
          <ThumbsUpIcon width={17} height={17} fill={resource.useful ? "currentColor" : "none"} />
          <span>{resource.usefulCount}</span>
        </button>
        <button
          type="button"
          onClick={() => void toggleAction("favorite", resource)}
          disabled={actionKey === `favorite:${resource.id}`}
          aria-pressed={resource.favorite}
          aria-label={`${resource.favorite ? "Unpin" : "Pin"} ${resource.title}`}
          title={resource.favorite ? "Unpin" : "Pin"}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50 ${
            resource.favorite ? "text-amber-500" : "text-muted hover:bg-surface2 hover:text-ink"
          }`}
        >
          <StarIcon
            width={17}
            height={17}
            fill={resource.favorite ? "currentColor" : "none"}
          />
        </button>
        <button
          type="button"
          onClick={() => setMenuResource(resource)}
          aria-label={`More actions for ${resource.title}`}
          title="More actions"
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-all hover:bg-surface2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
            mobile ? "" : "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          }`}
        >
          <MoreIcon width={18} height={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Past papers, books and links, organised by subject."
        right={
          <Button type="button" onClick={openAdd} className="min-h-11">
            <PlusIcon width={16} height={16} />
            Add resource
          </Button>
        }
      />

      {recent.length > 0 ? (
        <section className="mb-4" aria-labelledby="recent-resources">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="recent-resources" className="text-sm font-semibold">
              Recently added
            </h2>
            <span className="text-xs text-muted">
              {resources.length} resource{resources.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recent.map((resource) => {
              const meta = kindMeta(resource.kind);
              const Icon = meta.Icon;
              return (
                <a
                  key={resource.id}
                  href={resource.url ?? "#"}
                  {...(resource.url
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-brand/40 hover:bg-brand-soft/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface2 ${meta.className}`}>
                    <Icon width={16} height={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{resource.title}</span>
                    <span className="block truncate text-[10px] text-muted">{resource.subject}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="sticky top-[65px] z-20 mb-4 flex flex-col gap-2 border-b border-border/60 bg-bg/95 py-2.5 backdrop-blur md:top-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              width={15}
              height={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this page…"
              aria-label="Search resources"
              className="pl-9 pr-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink"
              >
                <XIcon width={14} height={14} />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort resources"
              className="min-h-11 w-auto text-xs"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setMine((value) => !value)}
              aria-pressed={mine}
              className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                mine
                  ? "border-brand/30 bg-brand-soft text-brand"
                  : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <PeopleIcon width={15} height={15} />
              Mine
            </button>
          </div>
        </div>

        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
          role="tablist"
          aria-label="Resource type"
        >
          {TABS.map((option) => {
            const active = tab === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(option.value)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  active
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                {option.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-surface2 text-muted"
                  }`}
                >
                  {tabCounts[option.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" aria-label="Subject filters">
          <button
            type="button"
            onClick={() => setSubject("")}
            aria-pressed={!subject}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
              !subject
                ? "border-brand/30 bg-brand-soft text-brand"
                : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
            }`}
          >
            All subjects
            <span className="rounded-full bg-surface2 px-1.5 py-0.5 text-[10px] text-muted">
              {filteredBase.length}
            </span>
          </button>
          {subjects.map((name) => {
            const active = subject === name;
            const count = subjectCounts.get(name) ?? 0;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSubject(active ? "" : name)}
                aria-pressed={active}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  active
                    ? "border-brand/30 bg-brand-soft text-brand"
                    : count === 0
                      ? "border-border/60 bg-surface text-muted/60 hover:bg-surface2"
                      : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                {name}
                <span className="rounded-full bg-surface2 px-1.5 py-0.5 text-[10px] text-muted">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={<BookIcon />}
          title="No resources yet"
          hint="Build a shelf of past papers, books and links, organised by subject."
          action={
            <Button type="button" onClick={openAdd} className="min-h-11">
              <PlusIcon width={16} height={16} />
              Add the first one
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="No matching resources"
          hint="Try a different subject, type, or search term."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const collapsed = collapsedSubjects.has(group.name);
            const readCount = group.list.filter((resource) => resource.read).length;
            return (
              <Card key={group.name} padded={false} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSubject(group.name)}
                  aria-expanded={!collapsed}
                  className="flex min-h-12 w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-surface2/50 focus-visible:bg-surface2/60 focus-visible:outline-none"
                >
                  <FolderIcon width={17} height={17} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{group.name}</span>
                  <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-medium text-muted">
                    {group.list.length}
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-[10px] text-muted sm:flex">
                    <CheckIcon width={11} height={11} />
                    {readCount}/{group.list.length} read
                  </span>
                  <ChevronDownIcon
                    width={16}
                    height={16}
                    className={`shrink-0 text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                </button>
                {!collapsed ? (
                  <ul className="divide-y divide-border border-t border-border">
                    {group.list.map((resource) => {
                      const meta = kindMeta(resource.kind);
                      const Icon = meta.Icon;
                      const subtitle = subtitleFor(resource);
                      const description =
                        resource.note &&
                        resource.note.trim().toLowerCase() !== resource.title.trim().toLowerCase()
                          ? resource.note
                          : null;
                      const uploaded = isUploaded(resource);
                      return (
                        <li
                          key={resource.id}
                          id={`resource-${resource.id}`}
                          className="group flex scroll-mt-28 flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface2/35 focus-within:bg-surface2/35 sm:flex-row sm:items-start sm:gap-3"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 ${meta.className}`}
                            >
                              <Icon width={18} height={18} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-start gap-1.5">
                                {resource.url ? (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-11 min-w-0 items-center break-words text-sm font-medium text-brand hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none sm:min-h-0"
                                  >
                                    {resource.title}
                                  </a>
                                ) : (
                                  <span className="min-w-0 break-words text-sm font-medium">
                                    {resource.title}
                                  </span>
                                )}
                                {resource.url ? (
                                  uploaded ? (
                                    <span className="sr-only">Opens uploaded file</span>
                                  ) : (
                                    <ExternalLinkIcon
                                      width={12}
                                      height={12}
                                      className="mt-1 shrink-0 text-muted"
                                      aria-hidden="true"
                                    />
                                  )
                                ) : null}
                              </div>
                              {subtitle ? (
                                <p className="mt-0.5 break-words text-xs text-muted">{subtitle}</p>
                              ) : null}
                              {description ? (
                                <p className="mt-1 line-clamp-2 break-words text-xs text-muted">
                                  {description}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pl-12 sm:hidden">
                            <AuthorLine resource={resource} />
                            {rowActions(resource, true)}
                          </div>

                          <div className="hidden shrink-0 items-center gap-2 pl-0 sm:flex">
                            <AuthorLine resource={resource} />
                            {rowActions(resource)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this resource?"
        body={pendingDelete ? `"${pendingDelete.title}" will be removed for everyone.` : undefined}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {menuResource ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close actions"
            onClick={() => setMenuResource(null)}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Actions for ${menuResource.title}`}
            className="relative w-full max-w-sm rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 ${kindMeta(menuResource.kind).className}`}>
                  {(() => {
                    const Icon = kindMeta(menuResource.kind).Icon;
                    return <Icon width={18} height={18} />;
                  })()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{menuResource.title}</p>
                  <p className="truncate text-xs text-muted">
                    {menuResource.subject} · {menuResource.addedBy.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuResource(null)}
                aria-label="Close actions"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink"
              >
                <XIcon width={16} height={16} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  const resource = menuResource;
                  setMenuResource(null);
                  void toggleAction("read", resource);
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <CheckIcon width={17} height={17} className="text-emerald-600" />
                {menuResource.read ? "Mark as unread" : "Mark as read"}
              </button>
              {menuResource.url ? (
                <a
                  href={menuResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <ExternalLinkIcon width={17} height={17} className="text-muted" />
                  {isUploaded(menuResource) ? "Open file" : "Open link"}
                </a>
              ) : null}
              {menuResource.url ? (
                <button
                  type="button"
                  onClick={() => void copyLink(menuResource)}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-sm hover:bg-surface2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <LinkIcon width={17} height={17} className="text-muted" />
                  Copy link
                </button>
              ) : null}
              {isAdmin || menuResource.addedById === meId ? (
                <button
                  type="button"
                  onClick={() => {
                    const resource = menuResource;
                    setMenuResource(null);
                    setPendingDelete(resource);
                  }}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left text-sm text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none dark:text-rose-300 dark:hover:bg-rose-950/60"
                >
                  <XIcon width={17} height={17} />
                  Remove resource
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {adding ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close add resource"
            onClick={closeAdd}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-resource-title"
            className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="add-resource-title" className="text-lg font-bold">
                  Add a resource
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Paste a link for auto-filled details, or upload a file.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdd}
                aria-label="Close add resource"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink"
              >
                <XIcon width={18} height={18} />
              </button>
            </div>

            <form onSubmit={save} className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setTitleTouched(true);
                  }}
                  maxLength={160}
                  required
                  autoFocus
                  placeholder="e.g. Past paper 2023"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                  <Input
                    value={subjectInput}
                    onChange={(event) => setSubjectInput(event.target.value)}
                    maxLength={60}
                    required
                    list="resource-subjects"
                    placeholder="e.g. Islamic Studies"
                  />
                  <datalist id="resource-subjects">
                    {subjects.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>

                <div>
                  <span className="mb-1 block text-xs font-medium text-muted">Type</span>
                  <div className="flex flex-wrap gap-1.5">
                    {KIND_OPTIONS.map((option) => {
                      const active = kind === option.value;
                      const Icon = option.Icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => chooseKind(option.value)}
                          aria-pressed={active}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                            active
                              ? "border-brand/30 bg-brand-soft text-brand"
                              : "border-border bg-surface text-muted hover:bg-surface2 hover:text-ink"
                          }`}
                        >
                          <Icon width={14} height={14} className={active ? "" : option.className} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Link (optional)</span>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={link}
                    onChange={(event) => changeLink(event.target.value)}
                    placeholder="https://…"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadPreview(link)}
                    disabled={fetchingPreview || !link.trim()}
                    className="min-h-11 shrink-0 px-3 text-xs"
                  >
                    {fetchingPreview ? "Looking…" : "Fetch"}
                  </Button>
                </div>
                <span className="mt-1 block text-[11px] text-muted">
                  A link takes priority over an uploaded file if you add both.
                </span>
              </label>

              {fetchingPreview ? (
                <p className="rounded-xl bg-surface2/60 px-3 py-2 text-xs text-muted">
                  Looking up the page title and icon…
                </p>
              ) : preview ? (
                <div className="flex items-start gap-2 rounded-xl border border-border bg-surface2/50 p-2.5">
                  {preview.favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny remote favicon
                    <img
                      src={preview.favicon}
                      alt=""
                      className="mt-0.5 h-4 w-4 shrink-0 rounded"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <LinkIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {preview.title || preview.siteName || "Link preview"}
                    </p>
                    {preview.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                        {preview.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div>
                <FileUpload
                  kind="file"
                  label="Or upload a file (optional)"
                  value={file}
                  onChange={changeFile}
                />
              </div>

              {duplicate ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                  This looks like a duplicate of “{duplicate.title}”. You can still add it.
                </p>
              ) : null}

              {kind === "paper" ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    placeholder="Year"
                    aria-label="Past paper year"
                  />
                  <Select
                    value={semester}
                    onChange={(event) => setSemester(event.target.value)}
                    aria-label="Semester"
                  >
                    <option value="">Semester</option>
                    {["Spring", "Summer", "Fall", "Winter", "Annual", "Other"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={examType}
                    onChange={(event) => setExamType(event.target.value)}
                    aria-label="Exam type"
                  >
                    <option value="">Exam type</option>
                    {["Midterm", "Final", "Quiz", "Assignment", "Annual", "Other"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Note (optional)</span>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Anything useful for the group?"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAdd}
                  disabled={busy}
                  className="min-h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="min-h-11">
                  <PlusIcon width={15} height={15} />
                  {busy ? "Saving…" : "Add resource"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuthorLine({ resource }: { resource: ResourceRow }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
      <Avatar user={resource.addedBy} size="sm" />
      <span className="truncate font-medium text-ink/80">{resource.addedBy.name}</span>
      <span aria-hidden="true">·</span>
      <time
        dateTime={resource.createdAt}
        title={new Date(resource.createdAt).toLocaleString()}
        className="shrink-0"
      >
        {relativeTime(resource.createdAt)}
      </time>
      {resource.read ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckIcon width={9} height={9} />
          Read
        </span>
      ) : null}
    </div>
  );
}
