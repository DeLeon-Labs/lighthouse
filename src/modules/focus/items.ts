import type {
  FocusItemReference,
  FocusItemStatus,
  VaultFocusItemInput,
} from "./types";

export const VAULT_FOCUS_PROVIDER_ID = "vault";

export function normalizeFocusItemPath(path: string | null | undefined): string {
  return (path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

export function createVaultFocusItemId(path: string): string {
  return `${VAULT_FOCUS_PROVIDER_ID}:${normalizeFocusItemPath(path)}`;
}

export function createVaultFocusItemReference(input: VaultFocusItemInput): FocusItemReference {
  const path = normalizeFocusItemPath(input.path);

  return {
    id: createVaultFocusItemId(path),
    providerId: VAULT_FOCUS_PROVIDER_ID,
    type: input.type || "unknown",
    title: normalizeFocusItemTitle(input.title, path),
    status: input.status || "available",
    path,
    metadata: input.metadata,
    updatedAt: input.updatedAt,
  };
}

export function createVaultFocusItemReferencesFromPaths(paths: Iterable<string>): FocusItemReference[] {
  const items: FocusItemReference[] = [];
  const seen = new Set<string>();

  for (const rawPath of paths) {
    const path = normalizeFocusItemPath(rawPath);
    if (!path || seen.has(path)) continue;

    seen.add(path);
    items.push(createVaultFocusItemReference({ path }));
  }

  return items;
}

export function isVaultFocusItemReference(
  item: FocusItemReference | null | undefined,
): item is FocusItemReference & { providerId: "vault"; path: string } {
  return item?.providerId === VAULT_FOCUS_PROVIDER_ID && typeof item.path === "string" && item.path.length > 0;
}

export function isPathInVaultFocusItem(itemPath: string | null | undefined, candidatePath: string | null | undefined): boolean {
  const normalizedItemPath = normalizeFocusItemPath(itemPath);
  const normalizedCandidatePath = normalizeFocusItemPath(candidatePath);

  if (!normalizedItemPath || !normalizedCandidatePath) return false;
  return normalizedCandidatePath === normalizedItemPath || normalizedCandidatePath.startsWith(`${normalizedItemPath}/`);
}

export function normalizeFocusItemStatus(status: unknown): FocusItemStatus {
  return status === "missing" || status === "unresolved" || status === "available" ? status : "available";
}

function normalizeFocusItemTitle(title: string | null | undefined, path: string): string {
  const normalizedTitle = (title || "").trim();
  if (normalizedTitle) return normalizedTitle;

  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || "Untitled item";
}
