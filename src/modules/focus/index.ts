import type { LighthouseModule } from "../types";

export const FOCUS_MODULE_ID = "focus";

export * from "./model";
export * from "./membership";
export * from "./items";
export * from "./types";

export const focusModule: LighthouseModule = {
  id: FOCUS_MODULE_ID,
  name: "Focus",
  description: "Core Lighthouse Focus boundary. Runtime behavior remains in the existing implementation until the Focus Context Model is implemented.",
  category: "core",
  enabledByDefault: true,
  settingsKey: "focus",
  register() {
    // Boundary-only module for the initial registry foundation.
    // Existing v0.25 Focus behavior remains in src/main.ts until issue #16.
  },
};
