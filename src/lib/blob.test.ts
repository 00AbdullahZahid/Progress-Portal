import test from "node:test";
import assert from "node:assert/strict";
import {
  attachmentError,
  claimUploads,
  deletableUrls,
  referencedUrls,
} from "./blob";

const OWNER = "user-owner";
const OTHER = "user-other";
const OWNED = "https://store.public.blob.vercel-storage.com/uploads/owned.png";
const NOT_OWNED = "https://store.public.blob.vercel-storage.com/uploads/other.png";

type FakeDb = NonNullable<Parameters<typeof attachmentError>[2]>;

type Row = { url: string; ownerId: string; claimedAt: Date | null };

/** A tiny in-memory stand-in for the Prisma methods blob.ts uses. */
function fakeDb(overrides: {
  uploads?: Row[];
  sessions?: { image: string | null; fileUrl: string | null }[];
  notes?: { image: string | null; fileUrl: string | null }[];
  avatars?: { image: string | null }[];
  resources?: { url: string | null }[];
} = {}) {
  const uploads = [...(overrides.uploads ?? [])];
  const db = {
    upload: {
      findMany: async ({ where }: { where: { url: { in: string[] } } }) =>
        uploads.filter((row) => where.url.in.includes(row.url)),
      updateMany: async ({
        where,
        data,
      }: {
        where: { ownerId: string; url: { in: string[] } };
        data: { claimedAt: Date };
      }) => {
        let count = 0;
        for (const row of uploads) {
          if (row.ownerId === where.ownerId && where.url.in.includes(row.url)) {
            row.claimedAt = data.claimedAt;
            count += 1;
          }
        }
        return { count };
      },
      findFirst: async ({
        where,
      }: {
        where: { url: string; ownerId: string };
      }) =>
        uploads.find(
          (row) => row.url === where.url && row.ownerId === where.ownerId
        ) ?? null,
    },
    studySession: {
      findMany: async () => overrides.sessions ?? [],
    },
    note: {
      findMany: async () => overrides.notes ?? [],
    },
    user: {
      findMany: async () => overrides.avatars ?? [],
    },
    resource: {
      findMany: async () => overrides.resources ?? [],
    },
  };
  return { db: db as FakeDb, uploads };
}

test("attachmentError accepts a file owned by the uploading member", async () => {
  const { db } = fakeDb({
    uploads: [{ url: OWNED, ownerId: OWNER, claimedAt: null }],
  });

  assert.equal(await attachmentError(OWNER, [[OWNED, null]], db), null);
});

test("attachmentError rejects somebody else's upload", async () => {
  const { db } = fakeDb({
    uploads: [{ url: NOT_OWNED, ownerId: OTHER, claimedAt: null }],
  });

  assert.match(
    (await attachmentError(OWNER, [[NOT_OWNED, null]], db)) ?? "",
    /upload button/
  );
});

test("attachmentError lets an unchanged legacy attachment survive an edit", async () => {
  const { db } = fakeDb({
    uploads: [{ url: NOT_OWNED, ownerId: OTHER, claimedAt: null }],
  });

  assert.equal(await attachmentError(OWNER, [[NOT_OWNED, NOT_OWNED]], db), null);
});

test("claimUploads only claims rows owned by the member", async () => {
  const { db, uploads } = fakeDb({
    uploads: [
      { url: OWNED, ownerId: OWNER, claimedAt: null },
      { url: NOT_OWNED, ownerId: OTHER, claimedAt: null },
    ],
  });

  await claimUploads(OWNER, [OWNED, NOT_OWNED], db);

  assert.ok(uploads[0].claimedAt instanceof Date);
  assert.equal(uploads[1].claimedAt, null);
});

test("referencedUrls finds every table that can hold a blob URL", async () => {
  const { db } = fakeDb({
    sessions: [{ image: OWNED, fileUrl: null }],
    notes: [{ image: null, fileUrl: NOT_OWNED }],
    avatars: [{ image: "https://store.public.blob.vercel-storage.com/avatar.png" }],
    resources: [{ url: "https://store.public.blob.vercel-storage.com/resource.pdf" }],
  });

  const found = await referencedUrls(db, [
    OWNED,
    NOT_OWNED,
    "https://store.public.blob.vercel-storage.com/avatar.png",
    "https://store.public.blob.vercel-storage.com/resource.pdf",
  ]);

  assert.deepEqual(
    [...found].sort(),
    [
      OWNED,
      NOT_OWNED,
      "https://store.public.blob.vercel-storage.com/avatar.png",
      "https://store.public.blob.vercel-storage.com/resource.pdf",
    ].sort()
  );
});

test("deletableUrls requires ownership when an owner is supplied", async () => {
  const { db } = fakeDb({
    uploads: [
      { url: OWNED, ownerId: OWNER, claimedAt: new Date() },
      { url: NOT_OWNED, ownerId: OTHER, claimedAt: new Date() },
    ],
  });

  assert.deepEqual(await deletableUrls(db, OWNER, [OWNED, NOT_OWNED]), [OWNED]);
});

test("deletableUrls skips files still referenced by another row", async () => {
  const { db } = fakeDb({
    uploads: [{ url: OWNED, ownerId: OWNER, claimedAt: new Date() }],
    notes: [{ image: OWNED, fileUrl: null }],
  });

  assert.deepEqual(await deletableUrls(db, OWNER, [OWNED]), []);
});
