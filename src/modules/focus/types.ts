export interface FocusModuleSettings {
  enabled: boolean;
}

export const FOCUS_SECTION_IDS = ["sources", "work", "unfiled"] as const;
export type FocusSectionId = (typeof FOCUS_SECTION_IDS)[number];

export const FOCUS_VIEW_SECTION_IDS = ["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"] as const;
export type FocusViewSectionId = (typeof FOCUS_VIEW_SECTION_IDS)[number];

export type FocusFilesMode = "all" | "filtered";
export type FocusDisplayMode = "drill";

export type FocusSectionLabels = Record<FocusSectionId, string>;

export interface LegacyFocusDefinition {
  id?: unknown;
  name?: unknown;
  items?: unknown;
  sourceItems?: unknown;
  workItems?: unknown;
  unfiledItems?: unknown;
  visibleBookmarkGroups?: unknown;
  visibleSections?: unknown;
  visibleWatchFolders?: unknown;
  visibleFolders?: unknown;
  filesMode?: unknown;
  sectionLabels?: unknown;
}

export interface FocusDefinition {
  id: string;
  name: string;
  visibleBookmarkGroups: string[];
  visibleSections: FocusViewSectionId[];
  visibleWatchFolders: string[];
  filesMode: FocusFilesMode;
  visibleFolders: string[];
  items: string[];
  sourceItems: string[];
  workItems: string[];
  unfiledItems: string[];
  sectionLabels: FocusSectionLabels;
  displayMode: FocusDisplayMode;
}

export interface NormalizeFocusOptions {
  createId?: () => string;
}
