import type {
  LighthouseModule,
  LighthouseModuleCleanup,
  LighthouseModuleState,
  LighthousePluginContext,
} from "./types";

interface RegisteredModuleRuntime {
  module: LighthouseModule;
  cleanup?: LighthouseModuleCleanup;
}

export class LighthouseModuleRegistry {
  private readonly modules = new Map<string, LighthouseModule>();
  private readonly registered = new Map<string, RegisteredModuleRuntime>();

  constructor(private readonly context: LighthousePluginContext) {}

  registerModule(module: LighthouseModule): void {
    validateModule(module);
    this.modules.set(module.id, module);
  }

  registerModules(modules: LighthouseModule[]): void {
    for (const module of modules) this.registerModule(module);
  }

  getModule(id: string): LighthouseModule | undefined {
    return this.modules.get(id);
  }

  getModules(): LighthouseModule[] {
    return Array.from(this.modules.values());
  }

  isModuleEnabled(moduleOrId: LighthouseModule | string): boolean {
    const module = typeof moduleOrId === "string" ? this.modules.get(moduleOrId) : moduleOrId;
    if (!module) return false;
    const settings = this.getModuleSettings(module);
    if (settings && typeof settings.enabled === "boolean") return settings.enabled;
    return module.enabledByDefault;
  }

  async enableRegisteredModules(): Promise<void> {
    for (const module of this.modules.values()) {
      if (!this.isModuleEnabled(module)) continue;
      await this.registerRuntime(module);
    }
  }

  async unload(): Promise<void> {
    const runtimes = Array.from(this.registered.values()).reverse();
    this.registered.clear();

    for (const runtime of runtimes) {
      if (runtime.cleanup) await runtime.cleanup();
      if (runtime.module.unregister) await runtime.module.unregister();
    }
  }

  private getModuleSettings(module: LighthouseModule): LighthouseModuleState | undefined {
    const modules = this.context.settings.modules;
    if (!modules || typeof modules !== "object") return undefined;
    const value = modules[module.settingsKey] || modules[module.id];
    return value && typeof value === "object" ? value : undefined;
  }

  private async registerRuntime(module: LighthouseModule): Promise<void> {
    if (this.registered.has(module.id)) return;
    const cleanup = await module.register(this.context);
    this.registered.set(module.id, {
      module,
      cleanup: typeof cleanup === "function" ? cleanup : undefined,
    });
  }
}

function validateModule(module: LighthouseModule): void {
  if (!module || typeof module !== "object") throw new Error("Lighthouse module must be an object.");
  if (!module.id || typeof module.id !== "string") throw new Error("Lighthouse module requires a stable string id.");
  if (!module.name || typeof module.name !== "string") throw new Error(`Lighthouse module ${module.id} requires a display name.`);
  if (!module.description || typeof module.description !== "string") throw new Error(`Lighthouse module ${module.id} requires a description.`);
  if (!module.settingsKey || typeof module.settingsKey !== "string") throw new Error(`Lighthouse module ${module.id} requires a settingsKey.`);
  if (typeof module.enabledByDefault !== "boolean") throw new Error(`Lighthouse module ${module.id} requires enabledByDefault.`);
  if (typeof module.register !== "function") throw new Error(`Lighthouse module ${module.id} requires register().`);
}
