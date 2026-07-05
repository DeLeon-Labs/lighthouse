import {
  normalizeFocusDisplayMode,
} from "./model";
import type {
  FocusDefinition,
  FocusDisplayMode,
  FocusInheritanceContext,
  FocusSectionId,
} from "./types";

export const DEFAULT_FOCUS_INHERITANCE_SECTION_ID: FocusSectionId = "work";

export function getFocusDisplayMode(focus: FocusDefinition | null | undefined): FocusDisplayMode {
  return normalizeFocusDisplayMode(focus?.displayMode);
}

export function isSingleFocusDisplayMode(focus: FocusDefinition | null | undefined): boolean {
  return getFocusDisplayMode(focus) === "single";
}

export function isSplitFocusDisplayMode(focus: FocusDefinition | null | undefined): boolean {
  return getFocusDisplayMode(focus) === "split";
}

export function getInheritedFocusSectionId(focus: FocusDefinition | null | undefined): FocusSectionId | null {
  if (!focus) return null;

  return DEFAULT_FOCUS_INHERITANCE_SECTION_ID;
}

export function getFocusInheritanceContext(focus: FocusDefinition | null | undefined): FocusInheritanceContext {
  const resolvedFocus = focus || null;

  return {
    focus: resolvedFocus,
    displayMode: getFocusDisplayMode(resolvedFocus),
    shouldInherit: !!resolvedFocus,
    sectionId: getInheritedFocusSectionId(resolvedFocus),
  };
}
