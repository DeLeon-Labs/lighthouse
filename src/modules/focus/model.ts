import {
  FOCUS_SECTION_IDS,
  FOCUS_VIEW_SECTION_IDS,
  type FocusDefinition,
  type FocusSectionId,
  type FocusSectionLabels,
  type FocusViewSectionId,
  type LegacyFocusDefinition,
  type NormalizeFocusOptions,
} from "./types";

export const DEFAULT_FOCUS_SECTION_LABELS: FocusSectionLabels = {
  sources: "Sources",
  work: "Work",
  unfiled: "Unfiled",
};

export function isFocusSectionId(value: unknown): value is FocusSectionId {
  return typeof value === "string" && (FOCUS_SECTION_IDS as readonly string[]).includes(value);
}

export function isFocusViewSectionId(value: unknown): value is FocusViewSectionId {
  return typeof value === "string" && (FOCUS_VIEW_SECTION_IDS as readonly string[]).includes(value);
}

export function uniqueStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item) continue;
    const text = String(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

export function normalizeFocusSectionLabels(value: unknown): FocusSectionLabels {
  const raw = isRecord(value) ? value : {};
  return {
    sources: normalizeLabel(raw.sources, DEFAULT_FOCUS_SECTION_LABELS.sources),
    work: normalizeLabel(raw.work, DEFAULT_FOCUS_SECTION_LABELS.work),
    unfiled: normalizeLabel(raw.unfiled, DEFAULT_FOCUS_SECTION_LABELS.unfiled),
  };
}

export function normalizeFocusDefinition(
  value: LegacyFocusDefinition | unknown,
  options: NormalizeFocusOptions = {},
): FocusDefinition {
  const raw = isRecord(value) ? value : {};
  const legacyItems = uniqueStringList(raw.items);
  const visibleFolders = uniqueStringList(raw.visibleFolders);
  const workItems = uniqueStringList(raw.workItems);
  const unfiledItems = uniqueStringList(raw.unfiledItems);
  const assignedSet = new Set([...workItems, ...unfiledItems]);
  const explicitSourceItems = uniqueStringList(raw.sourceItems);
  const sourceItems = (explicitSourceItems.length ? explicitSourceItems : legacyItems)
    .filter((path) => !assignedSet.has(path));

  return {
    id: normalizeId(raw.id, options.createId),
    name: normalizeName(raw.name),
    visibleBookmarkGroups: uniqueStringList(raw.visibleBookmarkGroups),
    visibleSections: uniqueStringList(raw.visibleSections).filter(isFocusViewSectionId),
    visibleWatchFolders: uniqueStringList(raw.visibleWatchFolders),
    filesMode: raw.filesMode === "filtered" ? "filtered" : "all",
    visibleFolders,
    items: sourceItems,
    sourceItems,
    workItems,
    unfiledItems,
    sectionLabels: normalizeFocusSectionLabels(raw.sectionLabels),
    displayMode: "drill",
  };
}

export function normalizeFocusDefinitions(
  value: unknown,
  options: NormalizeFocusOptions = {},
): FocusDefinition[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: FocusDefinition[] = [];

  for (const item of value) {
    const focus = normalizeFocusDefinition(item, options);
    if (seen.has(focus.id)) continue;
    seen.add(focus.id);
    result.push(focus);
  }

  return result;
}

function normalizeId(value: unknown, createId?: () => string): string {
  const text = value ? String(value) : "";
  if (text) return text;
  return createId ? createId() : `focus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeName(value: unknown): string {
  const text = value ? String(value) : "";
  return text || "Untitled Focus";
}

function normalizeLabel(value: unknown, fallback: string): string {
  const text = value ? String(value).trim() : "";
  return text || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
