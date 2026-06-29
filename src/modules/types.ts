export type LighthouseModuleCategory =
  | "core"
  | "core-module"
  | "integration"
  | "experimental"
  | "companion-detected";

export type LighthouseModuleCleanup = () => void | Promise<void>;

export interface LighthouseModuleState {
  enabled: boolean;
  [key: string]: unknown;
}

export interface LighthouseIntegrationState {
  enabled: boolean;
  status?: "not-installed" | "detected" | "connected" | "disabled" | "requires-update";
  [key: string]: unknown;
}

export interface LighthouseSettingsWithModules {
  modules?: Record<string, LighthouseModuleState>;
  integrations?: Record<string, LighthouseIntegrationState>;
  [key: string]: unknown;
}

export interface LighthousePluginContext {
  app: unknown;
  plugin: unknown;
  settings: LighthouseSettingsWithModules;
}

export interface LighthouseSettingsContext {
  settings: LighthouseSettingsWithModules;
  plugin: unknown;
}

export interface LighthouseModule {
  id: string;
  name: string;
  description: string;
  category: LighthouseModuleCategory;
  enabledByDefault: boolean;
  requiresDesktop?: boolean;
  settingsKey: string;
  register(context: LighthousePluginContext): void | Promise<void> | LighthouseModuleCleanup | Promise<LighthouseModuleCleanup | void>;
  unregister?(): void | Promise<void>;
  renderSettings?(containerEl: HTMLElement, context: LighthouseSettingsContext): void;
}
