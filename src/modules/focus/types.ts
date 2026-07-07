export interface FocusModuleSettings {
  enabled: boolean;
}

export const FOCUS_PROVIDER_IDS = ["vault"] as const;
export type BuiltInFocusProviderId = (typeof FOCUS_PROVIDER_IDS)[number];
export type FocusProviderId = BuiltInFocusProviderId | (string & {});

export const FOCUS_ITEM_TYPES = ["note", "folder", "attachment", "bookmark", "unknown"] as const;
export type BuiltInFocusItemType = (typeof FOCUS_ITEM_TYPES)[number];
export type FocusItemType = BuiltInFocusItemType | (string & {});

export type FocusItemStatus = "available" | "missing" | "unresolved";

export interface FocusItemReference {
  id: string;
  providerId: FocusProviderId;
  type: FocusItemType;
  title: string;
  status: FocusItemStatus;
  path?: string;
  metadata?: Record<string, unknown>;
  updatedAt?: number;
}

export interface VaultFocusItemInput {
  path: string;
  type?: FocusItemType;
  title?: string;
  status?: FocusItemStatus;
  metadata?: Record<string, unknown>;
  updatedAt?: number;
}

export const FOCUS_SECTION_IDS = ["sources", "work", "unfiled"] as const;
export type FocusSectionId = (typeof FOCUS_SECTION_IDS)[number];

export const FOCUS_VIEW_SECTION_IDS = ["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"] as const;
export type FocusViewSectionId = (typeof FOCUS_VIEW_SECTION_IDS)[number];

export type FocusFilesMode = "all" | "filtered";
export const FOCUS_DISPLAY_MODES = ["single", "split"] as const;
export type FocusDisplayMode = (typeof FOCUS_DISPLAY_MODES)[number];
export type LegacyFocusDisplayMode = FocusDisplayMode | "drill";

export type FocusSectionLabels = Record<FocusSectionId, string>;

export const FOCUS_RULE_TYPES = ["path-prefix"] as const;
export type FocusRuleType = (typeof FOCUS_RULE_TYPES)[number] | (string & {});

export interface FocusManualItem {
  item: FocusItemReference;
  sectionId: FocusSectionId;
}

export interface FocusFilterRule {
  id: string;
  type: FocusRuleType;
  providerId: FocusProviderId;
  enabled: boolean;
  sectionId?: FocusSectionId;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface FocusExclusion {
  item: FocusItemReference;
  reason?: string;
}

export interface FocusSectionAssignment {
  itemId: string;
  sectionId: FocusSectionId;
}

export interface FocusContextDefinition {
  id: string;
  name: string;
  displayMode: FocusDisplayMode;
  manualItems: FocusManualItem[];
  rules: FocusFilterRule[];
  exclusions: FocusExclusion[];
  sectionAssignments: FocusSectionAssignment[];
}

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
  displayMode?: unknown;
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

export interface FocusSettingsState {
  focuses: FocusDefinition[];
  activeFocusId?: unknown;
  focusGlobalItems?: string[];
  focusGlobalSourceItems?: string[];
  focusGlobalWorkItems?: string[];
  focusGlobalUnfiledItems?: string[];
}

export type FocusSectionItemReferences = Record<FocusSectionId, FocusItemReference[]>;

export interface ActiveFocusContext {
  id: string;
  focus: FocusDefinition | null;
  shouldInheritNewItems: boolean;
}

export interface FocusInheritanceContext {
  focus: FocusDefinition | null;
  displayMode: FocusDisplayMode;
  shouldInherit: boolean;
  sectionId: FocusSectionId | null;
}
