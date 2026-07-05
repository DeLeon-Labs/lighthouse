import type {
  ActiveFocusContext,
  FocusDefinition,
  FocusSettingsState,
} from "./types";

export const ALL_FOCUS_ID = "all";

export function normalizeActiveFocusId(value: unknown, focuses: readonly FocusDefinition[]): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id === ALL_FOCUS_ID) return ALL_FOCUS_ID;

  return focuses.some((focus) => focus.id === id) ? id : ALL_FOCUS_ID;
}

export function getActiveFocusDefinition(settings: FocusSettingsState): FocusDefinition | null {
  const activeFocusId = normalizeActiveFocusId(settings.activeFocusId, settings.focuses);
  if (activeFocusId === ALL_FOCUS_ID) return null;

  return settings.focuses.find((focus) => focus.id === activeFocusId) || null;
}

export function getActiveFocusContext(settings: FocusSettingsState): ActiveFocusContext {
  const id = normalizeActiveFocusId(settings.activeFocusId, settings.focuses);
  const focus = id === ALL_FOCUS_ID
    ? null
    : settings.focuses.find((item) => item.id === id) || null;

  return {
    id: focus ? focus.id : ALL_FOCUS_ID,
    focus,
    shouldInheritNewItems: !!focus,
  };
}
