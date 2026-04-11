import type { Prisma } from '@prisma/client';
import { diff as deepDiff } from 'deep-diff';

export const REVIEW_HISTORY_ACTIONS = [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'RESUBMITTED',
] as const;

export type ReviewHistoryAction = (typeof REVIEW_HISTORY_ACTIONS)[number];

export type PropertyReviewHistoryEntry = {
  action: ReviewHistoryAction;
  note?: string | null;
  adminId?: string | null;
  createdAt: string;
  snapshot: unknown;
};

export type PropertyFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

const VALID_ACTIONS = new Set<string>(REVIEW_HISTORY_ACTIONS);
const DEFAULT_IGNORED_PREFIXES = [
  'status',
  'updatedAt',
  'lastSubmittedAt',
  'lastReviewedAt',
  'lastEditedAt',
  'reviewHistory',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pathToField(path: Array<string | number> | undefined): string {
  if (!path || path.length === 0) return '(root)';

  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
      continue;
    }

    if (!out) out = segment;
    else out += `.${segment}`;
  }
  return out;
}

function normalizeCreatedAt(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function asHistoryEntry(
  value: unknown,
): PropertyReviewHistoryEntry | null {
  if (!isRecord(value)) return null;

  const action = typeof value.action === 'string' ? value.action : null;
  if (!action || !VALID_ACTIONS.has(action)) return null;

  return {
    action: action as ReviewHistoryAction,
    note: typeof value.note === 'string' ? value.note : null,
    adminId: typeof value.adminId === 'string' ? value.adminId : null,
    createdAt: normalizeCreatedAt(value.createdAt),
    snapshot: value.snapshot ?? null,
  };
}

export function parseReviewHistory(
  value: Prisma.JsonValue | null | undefined,
): PropertyReviewHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asHistoryEntry(item))
    .filter((item): item is PropertyReviewHistoryEntry => item !== null);
}

export function appendReviewHistoryEntry(
  existing: Prisma.JsonValue | null | undefined,
  entry: {
    action: ReviewHistoryAction;
    note?: string | null;
    adminId?: string | null;
    createdAt?: Date | string;
    snapshot: unknown;
  },
): Prisma.InputJsonValue {
  const current = parseReviewHistory(existing);
  const next: PropertyReviewHistoryEntry = {
    action: entry.action,
    note: entry.note ?? null,
    adminId: entry.adminId ?? null,
    createdAt: normalizeCreatedAt(entry.createdAt),
    snapshot: entry.snapshot,
  };

  return [...current, next] as unknown as Prisma.InputJsonValue;
}

export function findLastReviewAnchor(
  history: PropertyReviewHistoryEntry[],
): PropertyReviewHistoryEntry | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const row = history[i];
    if (!row) continue;
    if (row.action === 'CHANGES_REQUESTED' || row.action === 'APPROVED') {
      return row;
    }
  }
  return null;
}

function pushFieldChange(
  acc: PropertyFieldChange[],
  fieldPath: Array<string | number> | undefined,
  before: unknown,
  after: unknown,
) {
  acc.push({
    field: pathToField(fieldPath),
    before,
    after,
  });
}

export function computePropertyChanges(
  beforeSnapshot: unknown,
  afterSnapshot: unknown,
  opts?: { ignorePrefixes?: string[] },
): PropertyFieldChange[] {
  const raw = deepDiff(beforeSnapshot as object, afterSnapshot as object);
  if (!raw || raw.length === 0) return [];

  const changes: PropertyFieldChange[] = [];
  for (const item of raw as any[]) {
    if (!item || typeof item.kind !== 'string') continue;

    if (item.kind === 'E') {
      pushFieldChange(changes, item.path, item.lhs, item.rhs);
      continue;
    }

    if (item.kind === 'N') {
      pushFieldChange(changes, item.path, null, item.rhs);
      continue;
    }

    if (item.kind === 'D') {
      pushFieldChange(changes, item.path, item.lhs, null);
      continue;
    }

    if (item.kind === 'A' && item.item) {
      const base = Array.isArray(item.path)
        ? [...item.path, item.index]
        : [item.index];
      if (item.item.kind === 'E') {
        pushFieldChange(changes, base, item.item.lhs, item.item.rhs);
      } else if (item.item.kind === 'N') {
        pushFieldChange(changes, base, null, item.item.rhs);
      } else if (item.item.kind === 'D') {
        pushFieldChange(changes, base, item.item.lhs, null);
      }
    }
  }

  const prefixes = opts?.ignorePrefixes ?? DEFAULT_IGNORED_PREFIXES;
  return changes
    .filter((change) => {
      const field = change.field;
      return !prefixes.some(
        (prefix) =>
          field === prefix ||
          field.startsWith(`${prefix}.`) ||
          field.startsWith(`${prefix}[`),
      );
    })
    .sort((a, b) => a.field.localeCompare(b.field));
}

export function toJsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
