import type { LighthouseIntegrationState, LighthouseModuleState, LighthouseSettingsWithModules } from "./types";

export const DEFAULT_MODULE_SETTINGS: Record<string, LighthouseModuleState> = {
  focus: { enabled: true },
  recents: { enabled: true },
  files: { enabled: true },
  pins: { enabled: true },
  watchFolders: { enabled: true },
  bookmarksHome: { enabled: true },
  graphFocus: { enabled: false },
  sidecarNotes: { enabled: false }
};

export const DEFAULT_INTEGRATION_SETTINGS: Record<string, LighthouseIntegrationState> = {
  noteActions: { enabled: true, status: "not-installed" },
  sourceCompanion: { enabled: true, status: "not-installed" },
  squido: { enabled: true, status: "not-installed" },
  crateDigger: { enabled: true, status: "not-installed" }
};

export function normalizeModuleSettings(settings: LighthouseSettingsWithModules): void {
  settings.modules = normalizeSettingsGroup(DEFAULT_MODULE_SETTINGS, settings.modules);
  settings.integrations = normalizeSettingsGroup(DEFAULT_INTEGRATION_SETTINGS, settings.integrations);
}

function normalizeSettingsGroup<T extends { enabled: boolean }>(
  defaults: Record<string, T>,
  current: Record<string, T> | undefined,
): Record<string, T> {
  const normalized: Record<string, T> = {};
  const source = current && typeof current === "object" ? current : {};

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const existing = source[key];
    normalized[key] = {
      ...defaultValue,
      ...(existing && typeof existing === "object" ? existing : {}),
      enabled: typeof existing?.enabled === "boolean" ? existing.enabled : defaultValue.enabled,
    };
  }

  for (const [key, value] of Object.entries(source)) {
    if (key in normalized || !value || typeof value !== "object") continue;
    normalized[key] = {
      ...value,
      enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    };
  }

  return normalized;
}
