
// @ts-nocheck
// Transitional parity source: this file is a mechanical copy of the current
// JavaScript runtime. Add types incrementally without combining that work with
// behavior changes.
const {
  Plugin,
  ItemView,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  TFolder,
  Menu,
  MarkdownView,
  setIcon,
  normalizePath,
  Modal
} = require("obsidian");

const VIEW_TYPE = "simple-drafts-navigator-view";

// Defaults are intentionally conservative: Recents and Files are core, so avoid experimental
// features here unless they have been tested on both desktop and mobile.
const DEFAULT_SETTINGS = {
  defaultNewNoteFolder: "10 Inbox",
  quickCaptureFile: "Fragments.md",
  openQuickCaptureAtBottom: true,
  dailyNotesFolder: "20 Daily Notes/YYYY/YYYY-MM",
  dailyNotesFolderPattern: "20 Daily Notes/YYYY/YYYY-MM",
  rootDisplayName: "Writing",
  recentLimit: 50,
  navigatorFontSize: 14,
  recentFontSize: 14,
  fileTreeFontSize: 13,
  bookmarksFontSize: 13,
  previewLines: 1,
  showRecentLocation: true,
  recentSort: "modified-desc",
  recentDateDisplay: "hidden",
  recentDateFormat: "relative",
  pinnedNotes: [],
  watchedFolders: [],
  showWatchIndicator: true,
  showEmptyWatchFolderStatus: true,
  showZeroWatchCounts: true,
  showWatchCounts: true,
  showBookmarkedFileIndicators: true,
  hideRedundantBookmarks: true,
  folderCountMode: "watched",
  watchFolderCountsDefaultUpdated: true,
  pinnedNotesCollapsed: false,
  collapsedBookmarkGroups: [],
  collapsedBookmarkFolders: [],
  expandedBookmarkFolders: [],
  collapsedHomeSections: [],
  showBookmarksLocation: false,
  showBookmarksInfo: true,
  homeSections: ["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"],
  homeSectionOrder: ["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"],
  bookmarksItemSort: "name-asc",
  bookmarkGroupOrder: [],
  workspaceHomeLayouts: {},
  workspaceHomeLayoutVersion: 1,
  focuses: [],
  activeFocusId: "all",
  confirmFocusDelete: true,
  focusGlobalItems: [],
  focusGlobalSourceItems: [],
  focusGlobalWorkItems: [],
  focusSectionLabels: { sources: "Sources", work: "Work", unfiled: "Unfiled" },
  focusFilterRecents: true,
  focusFilterFiles: true,
  focusFilterBookmarks: true,
  focusFlattenSourceLimit: 250,
  tabActionButtons: {
    recent: ["toggle-pin", "sort-items"],
    files: ["reveal-current", "toggle-folders"],
    bookmarks: ["new-bookmark-group", "customize-bookmarks"]
  },
  fileTreeSort: "name-asc",
  fileTreeFolderBehavior: "folders-first",
  autoRevealCurrentFile: false,
  autoOpenNavigator: true,
  showRibbonIcon: false,
  replaceCurrentNote: true,
  showScrollButtons: true,
  scrollButtonSize: 34,
  ignoredPaths: "00.daily_note_template\nTemplates\nAttachments\n.obsidian\n.trash"
};

module.exports = class LighthousePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.lastActiveMarkdownPath = null;
    this.pendingSettingsSave = null;
    this.settingsSaveDelay = 250;
    const migratedLegacyVaultScopedState = this.migrateLegacyVaultScopedState();
    this.normalizeFontSizeSettings();
    this.normalizeFolderCountMode();
    this.normalizeHomeSettings();
    this.normalizeFocusSettings();
    this.normalizeTabActions();
    await this.normalizePinnedNotes({ save: false, pruneMissing: false });
    await this.normalizeWatchedFolders({ save: false, pruneMissing: false });
    if (migratedLegacyVaultScopedState) await this.saveData(this.settings);
    if (!this.settings.dailyNotesFolder && this.settings.dailyNotesFolderPattern) {
      this.settings.dailyNotesFolder = this.settings.dailyNotesFolderPattern;
    }

    this.registerView(VIEW_TYPE, (leaf) => new LighthouseView(leaf, this));

    this.addCommand({
      id: "open-simple-drafts-navigator",
      name: "Open Lighthouse",
      callback: () => this.activateView()
    });

    this.addCommand({
      id: "open-simple-drafts-navigator-main",
      name: "Open Lighthouse in main pane",
      callback: () => this.openNavigatorInMainPane()
    });

    this.addCommand({
      id: "create-new-note-in-inbox",
      name: "Create new note in default folder",
      callback: () => this.createNewNote()
    });

    this.addCommand({
      id: "open-quick-capture-file",
      name: "Open quick capture file",
      callback: () => this.openQuickCapture()
    });

    this.addCommand({
      id: "open-daily-note",
      name: "Open today's daily note",
      callback: () => this.openDailyNote()
    });

    this.addCommand({
      id: "toggle-current-note-pin-in-navigator-recents",
      name: "Toggle note pin in Recents",
      checkCallback: (checking) => {
        const file = this.getCurrentMarkdownFile();
        const canToggle = file instanceof TFile && file.extension === "md";
        if (checking) return canToggle;
        if (canToggle) this.togglePinnedFile(file);
      }
    });

    this.addCommand({
      id: "add-current-file-to-active-focus",
      name: "Add current file to active Lighthouse Focus",
      checkCallback: (checking) => {
        const focus = this.getActiveFocus();
        const file = this.getCurrentMarkdownFile();
        const canAdd = !!focus && file instanceof TFile;
        if (checking) return canAdd;
        if (canAdd) this.setFocusItemMembership(file.path, focus.id, true).then(() => new Notice(`Added ${file.basename} to ${focus.name}`));
      }
    });

    this.addCommand({
      id: "add-current-file-to-global-focus",
      name: "Add current file to all Lighthouse Focuses",
      checkCallback: (checking) => {
        const file = this.getCurrentMarkdownFile();
        const canAdd = file instanceof TFile;
        if (checking) return canAdd;
        if (canAdd) this.setFocusItemMembership(file.path, "global", true).then(() => new Notice(`Added ${file.basename} to Global Focus items`));
      }
    });

    this.addCommand({
      id: "inspect-hidden-vault-files",
      name: "Inspect hidden vault files",
      callback: () => new HiddenVaultInspectorModal(this.app).open()
    });

    if (this.settings.showRibbonIcon) {
      this.ribbonIcon = this.addRibbonIcon("notebook-tabs", "Lighthouse", () => this.activateView());
    }

    this.addSettingTab(new LighthouseSettingTab(this.app, this));

    this.scrollControls = new ScrollControls(this);
    this.scrollControls.init();

    this.registerEvent(this.app.workspace.on("file-open", (file) => this.handleFileOpen(file)));
    this.registerEvent(this.app.vault.on("create", () => this.refreshViews()));
    this.registerEvent(this.app.vault.on("delete", () => this.handleVaultDelete()));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.handleVaultRename(file, oldPath)));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.refreshViews()));

    this.app.workspace.onLayoutReady(() => this.installBookmarkRefreshHooks());

    if (this.settings.autoOpenNavigator) {
      this.app.workspace.onLayoutReady(() => this.activateView());
    }
  }

  onunload() {
    this.flushSettingsSave();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
    if (this.scrollControls) this.scrollControls.destroy();
  }

  async saveSettings() {
    this.flushSettingsSave({ clearOnly: true });
    await this.saveData(this.settings);
    this.applyRuntimeSettings();
    this.refreshViews();
  }

  requestSaveSettings() {
    this.applyRuntimeSettings();
    this.refreshViews();
    this.flushSettingsSave({ clearOnly: true });
    this.pendingSettingsSave = window.setTimeout(async () => {
      this.pendingSettingsSave = null;
      await this.saveData(this.settings);
    }, this.settingsSaveDelay || 250);
  }

  flushSettingsSave(options = {}) {
    if (!this.pendingSettingsSave) return;
    window.clearTimeout(this.pendingSettingsSave);
    this.pendingSettingsSave = null;
    if (!options.clearOnly) this.saveData(this.settings);
  }

  applyRuntimeSettings() {
    document.documentElement.style.setProperty("--sdn-font-size", `${this.settings.navigatorFontSize}px`);
    if (this.scrollControls) this.scrollControls.updateSettings();
  }

  refreshViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view && leaf.view.render) leaf.view.render();
    }
  }

  installBookmarkRefreshHooks() {
    try {
      const instance = getBookmarksInstance(this.app);
      if (!instance || instance.__navigatorRefreshHooksInstalled) return;
      instance.__navigatorRefreshHooksInstalled = true;
      const refresh = () => window.setTimeout(() => this.refreshViews(), 60);
      for (const key of ["saveData", "requestSave", "save", "addItem", "deleteItem", "removeItem", "createGroup", "addGroup"]) {
        if (typeof instance[key] !== "function" || instance[key].__navigatorWrapped) continue;
        const original = instance[key].bind(instance);
        const wrapped = (...args) => {
          const result = original(...args);
          if (result && typeof result.then === "function") {
            return result.then(value => { refresh(); return value; });
          }
          refresh();
          return result;
        };
        wrapped.__navigatorWrapped = true;
        instance[key] = wrapped;
      }
    } catch (e) {
      console.warn("Lighthouse bookmark refresh hooks failed", e);
    }
  }

  normalizeFontSizeSettings() {
    const fallback = Number(this.settings.navigatorFontSize) || DEFAULT_SETTINGS.navigatorFontSize;
    if (!Number.isFinite(Number(this.settings.recentFontSize))) this.settings.recentFontSize = fallback;
    if (!Number.isFinite(Number(this.settings.fileTreeFontSize))) this.settings.fileTreeFontSize = Math.max(12, fallback - 1);
    if (!Number.isFinite(Number(this.settings.bookmarksFontSize))) this.settings.bookmarksFontSize = Math.max(12, fallback - 1);
  }


  normalizeFolderCountMode() {
    const allowedModes = new Set(["off", "watched", "all"]);

    // v1.7.6 changes the intended default from "off" to "watched" so a watched
    // folder shows both the dot and recursive count unless the user opts out.
    // This one-time migration keeps existing dev installs aligned with the new default
    // without repeatedly overriding a user's later choice.
    if (this.settings.watchFolderCountsDefaultUpdated !== true) {
      if (!allowedModes.has(this.settings.folderCountMode) || this.settings.folderCountMode === "off") {
        this.settings.folderCountMode = "watched";
        this.settings.showWatchCounts = true;
      }
      this.settings.watchFolderCountsDefaultUpdated = true;
    }

    if (!allowedModes.has(this.settings.folderCountMode)) {
      this.settings.folderCountMode = this.settings.showWatchCounts === true ? "watched" : "off";
    }

    if (typeof this.settings.showEmptyWatchFolderStatus !== "boolean") this.settings.showEmptyWatchFolderStatus = true;
    if (typeof this.settings.showZeroWatchCounts !== "boolean") this.settings.showZeroWatchCounts = true;
  }


  normalizeHomeSettings() {
    const validSections = new Set(["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"]);
    const defaultOrder = [...DEFAULT_SETTINGS.homeSectionOrder];
    const normalizeSectionList = (value, fallback) => {
      const raw = Array.isArray(value) ? value : fallback;
      const seen = new Set();
      const result = [];
      for (const section of raw) {
        if (!validSections.has(section) || seen.has(section)) continue;
        seen.add(section);
        result.push(section);
      }
      for (const section of fallback) {
        if (!seen.has(section)) result.push(section);
      }
      return result;
    };

    this.settings.homeSectionOrder = normalizeSectionList(this.settings.homeSectionOrder, defaultOrder);
    const enabledRaw = Array.isArray(this.settings.homeSections) ? this.settings.homeSections : defaultOrder;
    this.settings.homeSections = enabledRaw.filter((section, index, arr) => validSections.has(section) && arr.indexOf(section) === index);
    if (!this.settings.homeSections.length) this.settings.homeSections = ["bookmark-groups"];

    const allowedItemSorts = new Set(["name-asc", "name-desc", "modified-desc", "modified-asc", "created-desc", "created-asc", "name", "modified", "created", "custom"]);
    if (!allowedItemSorts.has(this.settings.bookmarksItemSort)) {
      const legacySorts = this.settings.homeSectionSorts && typeof this.settings.homeSectionSorts === "object" ? this.settings.homeSectionSorts : {};
      const legacyMap = { name: "name-asc", modified: "modified-desc", created: "created-desc", custom: "name-asc" };
      const firstLegacySort = defaultOrder.map(section => legacySorts[section]).find(sort => ["name", "modified", "created"].includes(sort));
      this.settings.bookmarksItemSort = legacyMap[firstLegacySort] || "name-asc";
    }

    const legacySortMap = { custom: "name-asc", name: "name-asc", modified: "modified-desc", created: "created-desc" };
    if (legacySortMap[this.settings.bookmarksItemSort]) this.settings.bookmarksItemSort = legacySortMap[this.settings.bookmarksItemSort];

    this.settings.bookmarkGroupOrder = Array.isArray(this.settings.bookmarkGroupOrder) ? this.settings.bookmarkGroupOrder.filter(Boolean) : [];
    this.settings.collapsedHomeSections = Array.isArray(this.settings.collapsedHomeSections) ? this.settings.collapsedHomeSections.filter(section => validSections.has(section)) : [];
    this.settings.collapsedBookmarkFolders = Array.isArray(this.settings.collapsedBookmarkFolders) ? this.settings.collapsedBookmarkFolders.filter(Boolean) : [];
    this.settings.expandedBookmarkFolders = Array.isArray(this.settings.expandedBookmarkFolders) ? this.settings.expandedBookmarkFolders.filter(Boolean) : [];
    if (typeof this.settings.showBookmarksLocation !== "boolean") this.settings.showBookmarksLocation = false;
    if (typeof this.settings.showBookmarksInfo !== "boolean") this.settings.showBookmarksInfo = true;
    if (typeof this.settings.showBookmarkedFileIndicators !== "boolean") this.settings.showBookmarkedFileIndicators = true;
    if (typeof this.settings.hideRedundantBookmarks !== "boolean") this.settings.hideRedundantBookmarks = true;
    this.settings.workspaceHomeLayouts = this.settings.workspaceHomeLayouts && typeof this.settings.workspaceHomeLayouts === "object" ? this.settings.workspaceHomeLayouts : {};
    if (!Number.isFinite(Number(this.settings.workspaceHomeLayoutVersion))) this.settings.workspaceHomeLayoutVersion = 1;
  }


  normalizeFocusSettings() {
    const validSections = new Set(["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"]);
    const cleanList = (value) => Array.isArray(value) ? Array.from(new Set(value.filter(Boolean).map(String))) : [];
    const raw = Array.isArray(this.settings.focuses) ? this.settings.focuses : [];
    const seen = new Set();
    this.settings.focuses = raw.map((focus) => {
      const id = focus && focus.id ? String(focus.id) : `focus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (seen.has(id)) return null;
      seen.add(id);
      const legacyItems = cleanList(focus && focus.items);
      const visibleFolders = cleanList(focus && focus.visibleFolders);
      const workItems = cleanList(focus && focus.workItems);
      const unfiledItems = cleanList(focus && focus.unfiledItems);
      const assignedSet = new Set([...workItems, ...unfiledItems]);
      const sourceSeed = cleanList(focus && focus.sourceItems);
      const sourceItems = sourceSeed.length ? sourceSeed.filter(path => !assignedSet.has(path)) : legacyItems.filter(path => !assignedSet.has(path));
      const rawLabels = focus && focus.sectionLabels && typeof focus.sectionLabels === "object" ? focus.sectionLabels : {};
      const sectionLabels = {
        sources: rawLabels.sources && String(rawLabels.sources).trim() ? String(rawLabels.sources).trim() : "Sources",
        work: rawLabels.work && String(rawLabels.work).trim() ? String(rawLabels.work).trim() : "Work",
        unfiled: rawLabels.unfiled && String(rawLabels.unfiled).trim() ? String(rawLabels.unfiled).trim() : "Unfiled"
      };
      return {
        id,
        name: focus && focus.name ? String(focus.name) : "Untitled Focus",
        visibleBookmarkGroups: cleanList(focus && focus.visibleBookmarkGroups),
        visibleSections: cleanList(focus && focus.visibleSections).filter(section => validSections.has(section)),
        visibleWatchFolders: cleanList(focus && focus.visibleWatchFolders),
        filesMode: focus && focus.filesMode === "filtered" ? "filtered" : "all",
        visibleFolders,
        items: sourceItems,
        sourceItems,
        workItems,
        unfiledItems,
        sectionLabels,
        displayMode: "drill"
      };
    }).filter(Boolean);
    const ids = new Set(this.settings.focuses.map(f => f.id));
    if (!this.settings.activeFocusId || (this.settings.activeFocusId !== "all" && !ids.has(this.settings.activeFocusId))) this.settings.activeFocusId = "all";
    this.settings.focusGlobalItems = cleanList(this.settings.focusGlobalItems);
    this.settings.focusGlobalSourceItems = cleanList(this.settings.focusGlobalSourceItems);
    this.settings.focusGlobalWorkItems = cleanList(this.settings.focusGlobalWorkItems);
    this.settings.focusGlobalUnfiledItems = cleanList(this.settings.focusGlobalUnfiledItems);
    const globalWorkSet = new Set([...this.settings.focusGlobalWorkItems, ...this.settings.focusGlobalUnfiledItems]);
    if (!this.settings.focusGlobalSourceItems.length && this.settings.focusGlobalItems.length) {
      this.settings.focusGlobalSourceItems = this.settings.focusGlobalItems.filter(path => !globalWorkSet.has(path));
    } else {
      this.settings.focusGlobalSourceItems = this.settings.focusGlobalSourceItems.filter(path => !globalWorkSet.has(path));
    }
    this.settings.focusGlobalItems = [...this.settings.focusGlobalSourceItems];
    const globalLabels = this.settings.focusSectionLabels && typeof this.settings.focusSectionLabels === "object" ? this.settings.focusSectionLabels : {};
    this.settings.focusSectionLabels = {
      sources: globalLabels.sources && String(globalLabels.sources).trim() ? String(globalLabels.sources).trim() : "Sources",
      work: globalLabels.work && String(globalLabels.work).trim() ? String(globalLabels.work).trim() : "Work",
      unfiled: globalLabels.unfiled && String(globalLabels.unfiled).trim() ? String(globalLabels.unfiled).trim() : "Unfiled"
    };
    if (typeof this.settings.focusFilterRecents !== "boolean") this.settings.focusFilterRecents = true;
    if (typeof this.settings.focusFilterFiles !== "boolean") this.settings.focusFilterFiles = true;
    if (typeof this.settings.focusFilterBookmarks !== "boolean") this.settings.focusFilterBookmarks = true;
    if (!Number.isFinite(this.settings.focusFlattenSourceLimit)) this.settings.focusFlattenSourceLimit = 250;
  }

  getActiveFocus() {
    this.normalizeFocusSettings();
    if (this.settings.activeFocusId === "all") return null;
    return this.settings.focuses.find(focus => focus.id === this.settings.activeFocusId) || null;
  }

  getActiveFocusName() {
    const focus = this.getActiveFocus();
    return focus ? focus.name : "All";
  }

  getFocusSectionLabel(focus, sectionId) {
    this.normalizeFocusSettings();
    const fallback = sectionId === "work" ? "Work" : (sectionId === "unfiled" ? "Unfiled" : "Sources");
    const labels = focus && focus.sectionLabels && typeof focus.sectionLabels === "object" ? focus.sectionLabels : this.settings.focusSectionLabels;
    const value = labels && labels[sectionId] ? String(labels[sectionId]).trim() : "";
    return value || fallback;
  }

  async renameFocusSection(focusId, sectionId, label) {
    this.normalizeFocusSettings();
    if (!["sources", "work", "unfiled"].includes(sectionId)) return false;
    const value = label && String(label).trim() ? String(label).trim() : (sectionId === "work" ? "Work" : (sectionId === "unfiled" ? "Unfiled" : "Sources"));
    if (focusId === "all" || focusId === "global") {
      this.settings.focusSectionLabels = this.settings.focusSectionLabels || { sources: "Sources", work: "Work", unfiled: "Unfiled" };
      this.settings.focusSectionLabels[sectionId] = value;
    } else {
      const focus = this.settings.focuses.find(item => item.id === focusId);
      if (!focus) return false;
      focus.sectionLabels = focus.sectionLabels || { sources: "Sources", work: "Work", unfiled: "Unfiled" };
      focus.sectionLabels[sectionId] = value;
    }
    await this.saveSettings();
    this.refreshViews();
    return true;
  }

  async setActiveFocus(id) {
    this.normalizeFocusSettings();
    const exists = id === "all" || this.settings.focuses.some(focus => focus.id === id);
    this.settings.activeFocusId = exists ? id : "all";
    await this.saveSettings();
    this.refreshViews();
  }

  async upsertFocus(focus) {
    this.normalizeFocusSettings();
    const rawLabels = focus && focus.sectionLabels && typeof focus.sectionLabels === "object" ? focus.sectionLabels : {};
    const normalized = {
      id: focus.id || `focus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: focus.name && focus.name.trim() ? focus.name.trim() : "Untitled Focus",
      visibleBookmarkGroups: [],
      visibleSections: [],
      visibleWatchFolders: [],
      filesMode: focus.filesMode === "filtered" ? "filtered" : "all",
      visibleFolders: Array.isArray(focus.visibleFolders) ? focus.visibleFolders.filter(Boolean) : [],
      items: Array.isArray(focus.sourceItems) ? focus.sourceItems.filter(Boolean) : (Array.isArray(focus.items) ? focus.items.filter(Boolean) : []),
      sourceItems: Array.isArray(focus.sourceItems) ? focus.sourceItems.filter(Boolean) : (Array.isArray(focus.items) ? focus.items.filter(Boolean) : []),
      workItems: Array.isArray(focus.workItems) ? focus.workItems.filter(Boolean) : [],
      unfiledItems: Array.isArray(focus.unfiledItems) ? focus.unfiledItems.filter(Boolean) : [],
      sectionLabels: {
        sources: rawLabels.sources && String(rawLabels.sources).trim() ? String(rawLabels.sources).trim() : "Sources",
        work: rawLabels.work && String(rawLabels.work).trim() ? String(rawLabels.work).trim() : "Work"
      },
      displayMode: "drill"
    };
    const index = this.settings.focuses.findIndex(item => item.id === normalized.id);
    if (index >= 0) this.settings.focuses[index] = normalized;
    else this.settings.focuses.push(normalized);
    this.settings.activeFocusId = normalized.id;
    await this.saveSettings();
    this.refreshViews();
    return normalized;
  }

  async deleteFocus(id) {
    this.normalizeFocusSettings();
    this.settings.focuses = this.settings.focuses.filter(focus => focus.id !== id);
    if (this.settings.activeFocusId === id) this.settings.activeFocusId = "all";
    await this.saveSettings();
    this.refreshViews();
  }

  async addFolderToFocus(focusId, folderPath) {
    this.normalizeFocusSettings();
    const focus = this.settings.focuses.find(item => item.id === focusId);
    if (!focus || !folderPath) return false;
    const visibleFolders = new Set(Array.isArray(focus.visibleFolders) ? focus.visibleFolders : []);
    visibleFolders.add(folderPath);
    focus.visibleFolders = Array.from(visibleFolders);
    focus.filesMode = "filtered";
    await this.saveSettings();
    this.refreshViews();
    return true;
  }

  isFolderInFocus(focusId, folderPath) {
    this.normalizeFocusSettings();
    const focus = this.settings.focuses.find(item => item.id === focusId);
    if (!focus || !folderPath) return false;
    return Array.isArray(focus.visibleFolders) && focus.visibleFolders.includes(folderPath);
  }


  getFocusItemPaths(focus = this.getActiveFocus()) {
    this.normalizeFocusSettings();
    const paths = new Set(Array.isArray(this.settings.focusGlobalItems) ? this.settings.focusGlobalItems : []);
    for (const path of this.settings.focusGlobalSourceItems || []) if (path) paths.add(path);
    for (const path of this.settings.focusGlobalWorkItems || []) if (path) paths.add(path);
    for (const path of this.settings.focusGlobalUnfiledItems || []) if (path) paths.add(path);
    if (focus && Array.isArray(focus.items)) {
      for (const path of focus.items) if (path) paths.add(path);
    }
    if (focus && Array.isArray(focus.sourceItems)) {
      for (const path of focus.sourceItems) if (path) paths.add(path);
    }
    if (focus && Array.isArray(focus.workItems)) {
      for (const path of focus.workItems) if (path) paths.add(path);
    }
    if (focus && Array.isArray(focus.unfiledItems)) {
      for (const path of focus.unfiledItems) if (path) paths.add(path);
    }
    return paths;
  }

  getBookmarkPathsForFocus(focus = this.getActiveFocus()) {
    const paths = new Set();
    if (!focus || !Array.isArray(focus.visibleBookmarkGroups) || !focus.visibleBookmarkGroups.length) return paths;
    const groups = new Set(focus.visibleBookmarkGroups);
    const walk = (items) => {
      for (const item of items || []) {
        if (item && item.path) paths.add(item.path);
        const children = getBookmarkChildren(item);
        if (children && children.length) walk(children);
      }
    };
    for (const item of getBookmarkRootItems(this.app) || []) {
      const key = item && (item.title || item.name || item.path || "Untitled");
      if (isBookmarkGroupItem(item) && groups.has(key)) walk(getBookmarkChildren(item));
      else if (!isBookmarkGroupItem(item) && groups.has(key)) walk([item]);
    }
    return paths;
  }

  getFocusScopePaths(focus = this.getActiveFocus()) {
    return new Set(this.getFocusItemPaths(focus));
  }


  isPathInFocus(path, focus = this.getActiveFocus()) {
    if (!focus || !path) return true;
    const paths = this.getFocusScopePaths(focus);
    for (const focusPath of paths) {
      if (!focusPath) continue;
      if (path === focusPath || path.startsWith(focusPath + "/")) return true;
    }
    return false;
  }

  async setFocusItemMembership(path, focusId, enabled) {
    return this.setFocusSectionMembership(path, focusId, "sources", enabled);
  }

  async setFocusSectionMembership(path, focusId, sectionId, enabled) {
    this.normalizeFocusSettings();
    if (!path || !["sources", "work", "unfiled"].includes(sectionId)) return false;
    if (focusId === "all" || focusId === "global") {
      const keyMap = { sources: "focusGlobalSourceItems", work: "focusGlobalWorkItems", unfiled: "focusGlobalUnfiledItems" };
      const key = keyMap[sectionId];
      const sets = {
        focusGlobalSourceItems: new Set(this.settings.focusGlobalSourceItems || []),
        focusGlobalWorkItems: new Set(this.settings.focusGlobalWorkItems || []),
        focusGlobalUnfiledItems: new Set(this.settings.focusGlobalUnfiledItems || [])
      };
      if (enabled) {
        for (const set of Object.values(sets)) set.delete(path);
        sets[key].add(path);
      } else sets[key].delete(path);
      this.settings.focusGlobalSourceItems = Array.from(sets.focusGlobalSourceItems);
      this.settings.focusGlobalWorkItems = Array.from(sets.focusGlobalWorkItems);
      this.settings.focusGlobalUnfiledItems = Array.from(sets.focusGlobalUnfiledItems);
      this.settings.focusGlobalItems = [...this.settings.focusGlobalSourceItems];
    } else {
      const focus = this.settings.focuses.find(item => item.id === focusId);
      if (!focus) return false;
      const keyMap = { sources: "sourceItems", work: "workItems", unfiled: "unfiledItems" };
      const key = keyMap[sectionId];
      const sets = {
        sourceItems: new Set(focus.sourceItems || []),
        workItems: new Set(focus.workItems || []),
        unfiledItems: new Set(focus.unfiledItems || [])
      };
      if (enabled) {
        for (const set of Object.values(sets)) set.delete(path);
        sets[key].add(path);
      } else sets[key].delete(path);
      focus.sourceItems = Array.from(sets.sourceItems);
      focus.workItems = Array.from(sets.workItems);
      focus.unfiledItems = Array.from(sets.unfiledItems);
      focus.items = [...focus.sourceItems];
    }
    await this.saveSettings();
    this.refreshViews();
    return true;
  }

  isItemInFocusSection(path, focusId, sectionId) {
    this.normalizeFocusSettings();
    if (!path || !["sources", "work", "unfiled"].includes(sectionId)) return false;
    if (focusId === "all" || focusId === "global") {
      const keyMap = { sources: "focusGlobalSourceItems", work: "focusGlobalWorkItems", unfiled: "focusGlobalUnfiledItems" };
      return (this.settings[keyMap[sectionId]] || []).includes(path);
    }
    const focus = this.settings.focuses.find(item => item.id === focusId);
    const keyMap = { sources: "sourceItems", work: "workItems", unfiled: "unfiledItems" };
    return !!(focus && (focus[keyMap[sectionId]] || []).includes(path));
  }

  async removeFocusItemMembership(path, focusId) {
    return this.setFocusItemMembership(path, focusId, false);
  }

  isItemInFocus(path, focusId) {
    this.normalizeFocusSettings();
    if (!path) return false;
    if (focusId === "all" || focusId === "global") {
      return (this.settings.focusGlobalSourceItems || []).includes(path) || (this.settings.focusGlobalWorkItems || []).includes(path) || (this.settings.focusGlobalUnfiledItems || []).includes(path);
    }
    const focus = this.settings.focuses.find(item => item.id === focusId);
    return !!(focus && ((focus.sourceItems || []).includes(path) || (focus.workItems || []).includes(path) || (focus.unfiledItems || []).includes(path)));
  }

  getFocusHomeSections() {
    const focus = this.getActiveFocus();
    if (!focus || !focus.visibleSections || !focus.visibleSections.length) return null;
    return new Set(focus.visibleSections);
  }

  getFocusBookmarkGroups() {
    const focus = this.getActiveFocus();
    if (!focus || !focus.visibleBookmarkGroups || !focus.visibleBookmarkGroups.length) return null;
    return new Set(focus.visibleBookmarkGroups);
  }

  getFocusWatchFolders() {
    const focus = this.getActiveFocus();
    if (!focus || !focus.visibleWatchFolders || !focus.visibleWatchFolders.length) return null;
    return new Set(focus.visibleWatchFolders);
  }

  getFocusFileRoots() {
    const focus = this.getActiveFocus();
    if (!focus || this.settings.focusFilterFiles === false) return null;
    const roots = new Set(this.getFocusScopePaths(focus));
    return roots.size ? Array.from(roots) : null;
  }

  getFocusFileRootItems() {
    const paths = this.getFocusFileRoots();
    if (!paths || !paths.length) return null;

    const normalized = paths
      .filter(Boolean)
      .map(path => this.app.vault.getAbstractFileByPath(path))
      .filter(item => (item instanceof TFile || item instanceof TFolder) && !shouldHidePath(this, item.path));

    // If a parent folder is already visible, avoid showing its children as duplicate roots.
    const selectedPaths = normalized.map(item => item.path);
    return normalized.filter(item => {
      return !selectedPaths.some(parent => parent !== item.path && item.path.startsWith(parent + "/"));
    });
  }

  getWorkspaceKey() {
    // Lightweight backend hook for v1.9: no vault scan, no layout lookup cost.
    const workspace = this.app.workspace;
    const name = workspace && typeof workspace.getActiveFile === "function" && workspace.getActiveFile() ? "default" : "default";
    return name;
  }

  getHomeLayoutConfig() {
    this.normalizeHomeSettings();
    const workspaceKey = this.getWorkspaceKey();
    const workspaceLayouts = this.settings.workspaceHomeLayouts || {};
    const workspaceLayout = workspaceLayouts[workspaceKey];
    if (workspaceLayout && Array.isArray(workspaceLayout.homeSectionOrder) && Array.isArray(workspaceLayout.homeSections)) {
      return workspaceLayout;
    }
    return {
      homeSections: this.settings.homeSections,
      homeSectionOrder: this.settings.homeSectionOrder,
      bookmarksItemSort: this.settings.bookmarksItemSort
    };
  }

  getHomeLayout() {
    const config = this.getHomeLayoutConfig();
    const enabled = new Set(config.homeSections || this.settings.homeSections);
    const order = Array.isArray(config.homeSectionOrder) ? config.homeSectionOrder : this.settings.homeSectionOrder;
    const sections = order.filter(section => enabled.has(section));
    const focusSections = this.getFocusHomeSections();
    return focusSections ? sections.filter(section => focusSections.has(section)) : sections;
  }

  isHomeSectionEnabled(sectionId) {
    return this.getHomeLayout().includes(sectionId);
  }

  isHomeSectionCollapsed(sectionId) {
    const collapsed = Array.isArray(this.settings.collapsedHomeSections) ? this.settings.collapsedHomeSections : [];
    return collapsed.includes(sectionId);
  }

  async toggleHomeSectionCollapsed(sectionId) {
    this.normalizeHomeSettings();
    const collapsed = new Set(this.settings.collapsedHomeSections || []);
    if (collapsed.has(sectionId)) collapsed.delete(sectionId);
    else collapsed.add(sectionId);
    this.settings.collapsedHomeSections = this.settings.homeSectionOrder.filter(section => collapsed.has(section));
    this.requestSaveSettings();
  }

  async setHomeSectionEnabled(sectionId, enabled) {
    this.normalizeHomeSettings();
    const sections = new Set(this.settings.homeSections);
    if (enabled) sections.add(sectionId);
    else sections.delete(sectionId);
    this.settings.homeSections = this.settings.homeSectionOrder.filter(section => sections.has(section));
    if (!this.settings.homeSections.length) this.settings.homeSections = ["bookmark-groups"];
    this.requestSaveSettings();
  }

  async setBookmarksItemSort(sort) {
    this.normalizeHomeSettings();
    const allowedSorts = new Set(["name-asc", "name-desc", "modified-desc", "modified-asc", "created-desc", "created-asc"]);
    const legacySortMap = { custom: "name-asc", name: "name-asc", modified: "modified-desc", created: "created-desc" };
    if (legacySortMap[sort]) sort = legacySortMap[sort];
    if (!allowedSorts.has(sort)) sort = "name-asc";
    this.settings.bookmarksItemSort = sort;
    this.requestSaveSettings();
  }

  async moveHomeSection(sectionId, targetSectionId) {
    this.normalizeHomeSettings();
    if (!sectionId || !targetSectionId || sectionId === targetSectionId) return;
    const order = this.settings.homeSectionOrder.filter(id => id !== sectionId);
    const targetIndex = order.indexOf(targetSectionId);
    if (targetIndex === -1) return;
    order.splice(targetIndex, 0, sectionId);
    this.settings.homeSectionOrder = order;
    const enabled = new Set(this.settings.homeSections);
    this.settings.homeSections = order.filter(id => enabled.has(id));
    this.requestSaveSettings();
  }

  async moveBookmarkGroup(groupKey, targetGroupKey) {
    if (!groupKey || !targetGroupKey || groupKey === targetGroupKey) return;
    const current = Array.isArray(this.settings.bookmarkGroupOrder) ? [...this.settings.bookmarkGroupOrder] : [];
    const order = current.filter(key => key !== groupKey);
    let targetIndex = order.indexOf(targetGroupKey);
    if (targetIndex === -1) {
      order.push(groupKey);
    } else {
      order.splice(targetIndex, 0, groupKey);
    }
    this.settings.bookmarkGroupOrder = order;
    this.requestSaveSettings();
  }


  normalizeTabActions() {
    const defaults = DEFAULT_SETTINGS.tabActionButtons || {};
    const allowed = {
      recent: new Set(["toggle-pin", "sort-items", "toggle-pinned-section"]),
      files: new Set(["reveal-current", "toggle-folders", "sort-items", "customize-files", "new-folder"]),
      bookmarks: new Set(["new-bookmark-group", "customize-bookmarks", "sort-items", "collapse-expand-sections"])
    };
    const current = this.settings.tabActionButtons && typeof this.settings.tabActionButtons === "object" ? this.settings.tabActionButtons : {};
    const normalized = {};
    for (const mode of Object.keys(allowed)) {
      const raw = Array.isArray(current[mode]) ? current[mode] : defaults[mode];
      const seen = new Set();
      normalized[mode] = [];
      for (const actionId of raw || []) {
        if (!allowed[mode].has(actionId) || seen.has(actionId)) continue;
        seen.add(actionId);
        normalized[mode].push(actionId);
      }
      for (const actionId of defaults[mode] || []) {
        if (normalized[mode].length >= 2) break;
        if (!allowed[mode].has(actionId) || seen.has(actionId)) continue;
        seen.add(actionId);
        normalized[mode].push(actionId);
      }
      for (const actionId of allowed[mode]) {
        if (normalized[mode].length >= 2) break;
        if (!seen.has(actionId)) normalized[mode].push(actionId);
      }
      normalized[mode] = normalized[mode].slice(0, 2);
    }
    this.settings.tabActionButtons = normalized;
  }

  getTabActionButtons(mode) {
    this.normalizeTabActions();
    return this.settings.tabActionButtons[mode] || DEFAULT_SETTINGS.tabActionButtons[mode] || [];
  }

  async setTabActionButton(mode, slot, actionId) {
    this.normalizeTabActions();
    const allowed = this.getAvailableTabActions(mode).map(action => action.id);
    if (!allowed.includes(actionId)) return;
    const buttons = [...this.settings.tabActionButtons[mode]];
    buttons[slot] = actionId;
    this.settings.tabActionButtons[mode] = buttons.filter((id, idx, arr) => id && arr.indexOf(id) === idx).slice(0, 2);
    for (const fallback of DEFAULT_SETTINGS.tabActionButtons[mode] || []) {
      if (this.settings.tabActionButtons[mode].length >= 2) break;
      if (!this.settings.tabActionButtons[mode].includes(fallback)) this.settings.tabActionButtons[mode].push(fallback);
    }
    this.requestSaveSettings();
  }

  async moveTabActionButton(mode, fromIndex, toIndex) {
    this.normalizeTabActions();
    const buttons = [...this.settings.tabActionButtons[mode]];
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= buttons.length || toIndex >= buttons.length) return;
    const [moved] = buttons.splice(fromIndex, 1);
    buttons.splice(toIndex, 0, moved);
    this.settings.tabActionButtons[mode] = buttons;
    this.requestSaveSettings();
  }

  getAvailableTabActions(mode) {
    const actions = {
      recent: [
        { id: "toggle-pin", label: "Pin current note", icon: "pin" },
        { id: "toggle-pinned-section", label: "Collapse/expand pinned", icon: "chevrons-up-down" },
        { id: "sort-items", label: "Sort items", icon: "arrow-up-down" }
      ],
      files: [
        { id: "reveal-current", label: "Reveal current note", icon: "folder-search" },
        { id: "toggle-folders", label: "Collapse/expand folders", icon: "chevrons-up-down" },
        { id: "sort-items", label: "Sort items", icon: "arrow-up-down" },
        { id: "customize-files", label: "Customize Files view", icon: "sliders-horizontal" },
        { id: "new-folder", label: "New folder", icon: "folder-plus" }
      ],
      bookmarks: [
        { id: "new-bookmark-group", label: "New bookmark group", icon: "folder-plus" },
        { id: "customize-bookmarks", label: "Customize Bookmarks view", icon: "sliders-horizontal" },
        { id: "sort-items", label: "Sort items", icon: "arrow-up-down" },
        { id: "collapse-expand-sections", label: "Collapse/expand bookmarked folders", icon: "chevrons-up-down" }
      ]
    };
    return actions[mode] || [];
  }

  getPinnedNotePaths() {
    return Array.isArray(this.settings.pinnedNotes) ? this.settings.pinnedNotes : [];
  }

  migrateLegacyVaultScopedState() {
    let changed = false;

    const pinnedNotes = this.coerceLegacyPathList(this.settings.pinnedNotes);
    if (!arraysEqual(pinnedNotes, this.settings.pinnedNotes)) {
      this.settings.pinnedNotes = pinnedNotes;
      changed = true;
    }

    const watchedFolders = this.coerceLegacyPathList(this.settings.watchedFolders);
    if (!arraysEqual(watchedFolders, this.settings.watchedFolders)) {
      this.settings.watchedFolders = watchedFolders;
      changed = true;
    }

    return changed;
  }

  coerceLegacyPathList(value) {
    const rawPaths = [];

    const collect = (item) => {
      if (!item) return;
      if (typeof item === "string") {
        rawPaths.push(item);
        return;
      }
      if (Array.isArray(item)) {
        for (const child of item) collect(child);
        return;
      }
      if (typeof item === "object") {
        for (const child of Object.values(item)) collect(child);
      }
    };

    collect(value);

    const seen = new Set();
    const paths = [];
    for (const rawPath of rawPaths) {
      const path = normalizePath(String(rawPath || ""));
      if (!path || seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
    return paths;
  }

  getPinnedNoteFiles() {
    return this.getPinnedNotePaths()
      .map(path => this.app.vault.getAbstractFileByPath(path))
      .filter(file => file instanceof TFile && file.extension === "md" && !shouldHidePath(this, file.path));
  }

  isPinnedFile(file) {
    return file instanceof TFile && this.getPinnedNotePaths().includes(file.path);
  }

  async pinFile(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    const current = this.getPinnedNotePaths().filter(path => path !== file.path);
    this.settings.pinnedNotes = [file.path, ...current];
    await this.saveSettings();
  }

  async unpinFile(file) {
    if (!(file instanceof TFile)) return;
    this.settings.pinnedNotes = this.getPinnedNotePaths().filter(path => path !== file.path);
    await this.saveSettings();
  }

  async togglePinnedFile(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return;
    if (this.isPinnedFile(file)) {
      await this.unpinFile(file);
      new Notice("Unpinned from Recents");
    } else {
      await this.pinFile(file);
      new Notice("Pinned to Recents");
    }
  }

  async normalizePinnedNotes({ save = true, pruneMissing = true } = {}) {
    const seen = new Set();
    const normalized = [];
    let changed = !Array.isArray(this.settings.pinnedNotes);

    for (const rawPath of this.getPinnedNotePaths()) {
      const path = this.normalizeStoredVaultPath(rawPath, "file");
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!path || seen.has(path)) {
        changed = true;
        continue;
      }
      if (pruneMissing && (!(file instanceof TFile) || file.extension !== "md")) {
        changed = true;
        continue;
      }
      seen.add(path);
      normalized.push(path);
      if (path !== rawPath) changed = true;
    }

    if (!changed) return;
    this.settings.pinnedNotes = normalized;
    if (save) await this.saveSettings();
  }

  getWatchedFolderPaths() {
    return Array.isArray(this.settings.watchedFolders) ? this.settings.watchedFolders : [];
  }

  isWatchedFolder(folder) {
    return folder instanceof TFolder && this.getWatchedFolderPaths().includes(folder.path);
  }

  async watchFolder(folder) {
    if (!(folder instanceof TFolder)) return;
    const current = this.getWatchedFolderPaths().filter(path => path !== folder.path);
    this.settings.watchedFolders = [folder.path, ...current];
    await this.saveSettings();
  }

  async unwatchFolder(folder) {
    if (!(folder instanceof TFolder)) return;
    this.settings.watchedFolders = this.getWatchedFolderPaths().filter(path => path !== folder.path);
    await this.saveSettings();
  }

  async normalizeWatchedFolders({ save = true, pruneMissing = true } = {}) {
    const seen = new Set();
    const normalized = [];
    let changed = !Array.isArray(this.settings.watchedFolders);

    for (const rawPath of this.getWatchedFolderPaths()) {
      const path = this.normalizeStoredVaultPath(rawPath, "folder");
      const folder = this.app.vault.getAbstractFileByPath(path);
      if (!path || seen.has(path)) {
        changed = true;
        continue;
      }
      if (pruneMissing && !(folder instanceof TFolder)) {
        changed = true;
        continue;
      }
      seen.add(path);
      normalized.push(path);
      if (path !== rawPath) changed = true;
    }

    if (!changed) return;
    this.settings.watchedFolders = normalized;
    if (save) await this.saveSettings();
  }

  normalizeStoredVaultPath(rawPath, expectedType) {
    const path = normalizePath(String(rawPath || ""));
    if (!path) return "";

    const direct = this.app.vault.getAbstractFileByPath(path);
    if (expectedType === "file" && direct instanceof TFile) return path;
    if (expectedType === "folder" && direct instanceof TFolder) return path;

    const currentVaultPath = this.stripCurrentVaultBasePath(rawPath);
    if (currentVaultPath && currentVaultPath !== path) {
      const currentVaultItem = this.app.vault.getAbstractFileByPath(currentVaultPath);
      if (expectedType === "file" && currentVaultItem instanceof TFile) return currentVaultPath;
      if (expectedType === "folder" && currentVaultItem instanceof TFolder) return currentVaultPath;
    }

    const suffixPath = this.findVaultPathByStoredSuffix(rawPath, expectedType);
    return suffixPath || path;
  }

  stripCurrentVaultBasePath(rawPath) {
    try {
      const adapter = this.app.vault.adapter;
      if (!adapter || typeof adapter.getBasePath !== "function") return "";
      const basePath = adapter.getBasePath();
      if (!basePath) return "";
      const source = String(rawPath || "").replace(/\\/g, "/");
      const base = String(basePath || "").replace(/\\/g, "/").replace(/\/+$/, "");
      if (source === base) return "";
      if (!source.startsWith(`${base}/`)) return "";
      return normalizePath(source.slice(base.length + 1));
    } catch (e) {
      return "";
    }
  }

  findVaultPathByStoredSuffix(rawPath, expectedType) {
    const source = String(rawPath || "").replace(/\\/g, "/");
    if (!source) return "";

    const paths = expectedType === "file"
      ? this.app.vault.getMarkdownFiles().map(file => file.path)
      : getAllFolderPaths(this.app.vault.getRoot());

    return paths
      .filter(path => path && (source === path || source.endsWith(`/${path}`)))
      .sort((a, b) => b.length - a.length)[0] || "";
  }

  async handleVaultDelete() {
    await this.normalizePinnedNotes();
    await this.normalizeWatchedFolders();
    this.refreshViews();
  }

  async handleVaultRename(file, oldPath) {
    let changed = false;

    const getRenamedPath = (path) => {
      if (!oldPath) return path;
      if (path === oldPath) return file.path;

      const oldPrefix = `${oldPath}/`;
      if (file instanceof TFolder && path.startsWith(oldPrefix)) {
        return `${file.path}/${path.slice(oldPrefix.length)}`;
      }

      return path;
    };

    const pinned = this.getPinnedNotePaths();
    const renamedPinned = pinned.map(path => getRenamedPath(path));
    if (renamedPinned.some((path, index) => path !== pinned[index])) {
      this.settings.pinnedNotes = renamedPinned;

      // Do not normalize pinned notes immediately after a folder rename.
      // On some platforms, especially mobile sync targets, child file paths may not
      // be queryable yet when the folder-level rename event fires. Validating here
      // can falsely treat those pinned files as deleted and remove them.
      // Delete cleanup still happens in handleVaultDelete, and direct file renames
      // are handled by the path replacement above.
      if (!(file instanceof TFolder)) await this.normalizePinnedNotes({ save: false });

      changed = true;
    }

    const watched = this.getWatchedFolderPaths();
    const renamedWatched = watched.map(path => getRenamedPath(path));
    if (renamedWatched.some((path, index) => path !== watched[index])) {
      this.settings.watchedFolders = renamedWatched;

      // Same timing issue as pinned notes: save the path rewrite first and let
      // future delete/cleanup passes remove truly missing folders.
      if (!(file instanceof TFolder)) await this.normalizeWatchedFolders({ save: false });

      changed = true;
    }

    if (changed) await this.saveSettings();
    else this.refreshViews();
  }

  getCurrentMarkdownFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile instanceof TFile && activeFile.extension === "md") {
      this.lastActiveMarkdownPath = activeFile.path;
      return activeFile;
    }

    if (this.lastActiveMarkdownPath) {
      const remembered = this.app.vault.getAbstractFileByPath(this.lastActiveMarkdownPath);
      if (remembered instanceof TFile && remembered.extension === "md") return remembered;
    }

    return null;
  }

  handleFileOpen(file) {
    if (file instanceof TFile && file.extension === "md") {
      this.lastActiveMarkdownPath = file.path;
    }

    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (!leaf.view) continue;

      // Auto-reveal should only navigate the Files browser when the Files tab is
      // already active. Otherwise clicking a Recent/Pinned/Bookmark item opens the
      // note and unexpectedly pulls the user away from their current Lighthouse tab.
      if (this.settings.autoRevealCurrentFile && leaf.view.mode === "files" && leaf.view.revealCurrentFile) {
        leaf.view.revealCurrentFile({ silent: true, flash: true });
      } else if (leaf.view.render) {
        leaf.view.render();
      }
    }
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeftLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  async openNavigatorInMainPane() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  async createNewNote(folderPath = this.settings.defaultNewNoteFolder) {
    const folder = normalizePath(folderPath || "");
    await ensureFolder(this.app, folder);

    const now = new Date();
    const stamp = formatDate(now, "YYYY-MM-DD HHmm");
    let baseName = `Untitled ${stamp}`;
    let path = normalizePath(`${folder}/${baseName}.md`);
    let i = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${folder}/${baseName} ${i}.md`);
      i++;
    }

    const file = await this.app.vault.create(path, "");
    await this.openFile(file);
    return file;
  }

  // Opens the configured capture file. Optional bottom-scroll keeps appending fast on mobile.
  async openQuickCapture() {
    const path = normalizePath(this.settings.quickCaptureFile || "Fragments.md");
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      const folder = path.split("/").slice(0, -1).join("/");
      if (folder) await ensureFolder(this.app, folder);
      file = await this.app.vault.create(path, "");
    }

    await this.openFile(file);

    if (this.settings.openQuickCaptureAtBottom) {
      window.setTimeout(() => this.scrollActiveNoteToBottom(), 80);
      window.setTimeout(() => this.scrollActiveNoteToBottom(), 250);
      window.setTimeout(() => this.scrollActiveNoteToBottom(), 650);
    }
  }

  scrollActiveNoteToBottom() {
    const leaf = this.app.workspace.activeLeaf;
    if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return;

    const view = leaf.view;
    const contentEl = view.contentEl;

    try {
      if (view.editor && typeof view.editor.lastLine === "function") {
        const last = view.editor.lastLine();
        view.editor.setCursor({ line: last, ch: 9999 });
        view.editor.scrollIntoView({ from: { line: last, ch: 0 }, to: { line: last, ch: 9999 } }, true);
      }
    } catch (e) {
      console.warn("Lighthouse quick capture CM scroll fallback", e);
    }

    const scrollers = [
      contentEl.querySelector(".cm-scroller"),
      contentEl.querySelector(".markdown-source-view .cm-scroller"),
      contentEl.querySelector(".markdown-reading-view"),
      contentEl.querySelector(".markdown-preview-view")
    ].filter(Boolean);

    for (const scroller of scrollers) scroller.scrollTop = scroller.scrollHeight;
  }

  // Daily notes are created directly here to avoid fuzzy command matching against Quick Capture.
  getDailyPath() {
    const now = new Date();
    const dateName = formatDate(now, "YYYY-MM-DD");
    const folderSetting = this.settings.dailyNotesFolder || this.settings.dailyNotesFolderPattern || "20 Daily Notes/YYYY/YYYY-MM";
    const folder = normalizePath(folderSetting
      .replace(/YYYY-MM/g, formatDate(now, "YYYY-MM"))
      .replace(/YYYY/g, formatDate(now, "YYYY"))
      .replace(/MM/g, formatDate(now, "MM"))
      .replace(/DD/g, formatDate(now, "DD"))
    );
    return normalizePath(folder ? `${folder}/${dateName}.md` : `${dateName}.md`);
  }

  async openDailyNote() {
    const path = this.getDailyPath();
    const folder = path.split("/").slice(0, -1).join("/");
    if (folder) await ensureFolder(this.app, folder);

    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) file = await this.app.vault.create(path, "");

    await this.openFile(file, false);
    return file;
  }


  async openFile(file, forceNewTab = false) {
    if (!(file instanceof TFile)) return;

    if (this.settings.replaceCurrentNote && !forceNewTab) {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view && activeLeaf.view.getViewType && activeLeaf.view.getViewType() === "markdown") {
        await activeLeaf.openFile(file);
        return;
      }

      const markdownLeaves = this.app.workspace.getLeavesOfType("markdown");
      if (markdownLeaves.length) {
        await markdownLeaves[0].openFile(file);
        this.app.workspace.setActiveLeaf(markdownLeaves[0], { focus: true });
        return;
      }
    }

    await this.app.workspace.getLeaf(forceNewTab).openFile(file);
  }
};

class LighthouseView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mode = "recent";
    this.expanded = new Set([""]);
    this.dragHoverFolderPath = null;
    this.focusDrillPaths = { sources: null, work: null };
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Lighthouse"; }
  getIcon() { return "notebook-tabs"; }

  async onOpen() {
    this.containerEl.addClass("sdn-view");
    this.render();
  }

  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("sdn-root");
    root.style.setProperty("--sdn-font-size", `${this.plugin.settings.navigatorFontSize}px`);

    const header = root.createDiv({ cls: "sdn-header" });

    const navActions = header.createDiv({ cls: "sdn-nav-actions" });
    this.renderHeaderNavActions(navActions);

    const actions = header.createDiv({ cls: "sdn-actions" });
    const daily = actions.createEl("button", { cls: "sdn-icon-button", attr: { "aria-label": "Daily note" } });
    setIcon(daily, "calendar-days");
    daily.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.plugin.openDailyNote();
    };

    const quick = actions.createEl("button", { cls: "sdn-icon-button", attr: { "aria-label": "Quick capture" } });
    setIcon(quick, "zap");
    quick.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.plugin.openQuickCapture();
    };

    const add = actions.createEl("button", { cls: "sdn-icon-button", attr: { "aria-label": "New note" } });
    setIcon(add, "plus");
    add.onclick = () => this.plugin.createNewNote();

    const tabs = root.createDiv({ cls: "sdn-tabs" });
    const tabButtons = tabs.createDiv({ cls: "sdn-tab-buttons" });
    this.makeTab(tabButtons, "recent", "Recent");
    this.makeTab(tabButtons, "files", "Files");
    this.makeTab(tabButtons, "bookmarks", "Focus");

    const body = root.createDiv({ cls: "sdn-body" });
    if (this.mode === "recent") {
      body.style.setProperty("--sdn-font-size", `${this.plugin.settings.recentFontSize || this.plugin.settings.navigatorFontSize}px`);
      this.renderRecent(body);
    }
    if (this.mode === "files") {
      body.style.setProperty("--sdn-font-size", `${this.plugin.settings.fileTreeFontSize || this.plugin.settings.navigatorFontSize}px`);
      this.renderFiles(body);
    }
    if (this.mode === "bookmarks") {
      body.style.setProperty("--sdn-font-size", `${this.plugin.settings.bookmarksFontSize || this.plugin.settings.recentFontSize || this.plugin.settings.navigatorFontSize}px`);
      this.renderBookmarks(body);
    }
  }

  renderHeaderNavActions(parent) {
    const actions = this.plugin.getTabActionButtons(this.mode);
    actions.forEach((actionId, slot) => this.renderTabActionButton(parent, this.mode, actionId, slot));
    this.renderActiveFocusIndicator(parent);
  }

  renderActiveFocusIndicator(parent) {
    const focus = this.plugin.getActiveFocus();
    const button = parent.createEl("button", {
      cls: `sdn-icon-button sdn-focus-indicator ${focus ? "is-active" : ""}`,
      attr: { "aria-label": focus ? `Active Focus: ${focus.name}` : "Lighthouse Focus: All" }
    });
    button.setAttr("title", focus ? `Focus: ${focus.name}. Click to change Focus.` : "Focus: All. Click to change Focus.");
    setIcon(button, focus ? "list-filter" : "list-filter");
    button.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.showFocusMenu(evt);
    };
  }

  renderTabActionButton(parent, mode, actionId, slot) {
    const meta = this.getTabActionMeta(mode, actionId);
    if (!meta) return;
    const button = parent.createEl("button", { cls: "sdn-icon-button sdn-tab-action-button", attr: { "aria-label": meta.label } });
    button.dataset.mode = mode;
    button.dataset.actionId = actionId;
    button.dataset.slot = String(slot);
    button.setAttr("title", `${meta.label}. Drag sideways to reorder. Right-click to change action.`);
    setIcon(button, this.getTabActionIcon(mode, actionId));
    this.updateTabActionState(button, mode, actionId);

    button.onclick = async (evt) => {
      if (this.suppressActionClickUntil && Date.now() < this.suppressActionClickUntil) {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      await this.runTabAction(mode, actionId, evt, button);
    };

    button.oncontextmenu = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.showTabActionMenu(evt, mode, slot);
    };

    this.attachActionButtonSwapDrag(button, parent, mode, slot);
    this.attachContextMenu(button, (evt) => this.showTabActionMenu(evt, mode, slot));
  }

  resetTabActionDragStyles(parent) {
    if (!parent) return;
    parent.querySelectorAll(".sdn-tab-action-button").forEach(el => {
      el.style.transform = "";
      el.style.transition = "";
      el.removeClass("sdn-dragging");
      el.removeClass("sdn-action-swap-target");
    });
    parent.removeClass("sdn-action-drag-active");
  }

  attachActionButtonSwapDrag(button, parent, mode, initialSlot) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let axisLocked = false;
    let dragging = false;
    let swapped = false;
    let other = null;
    let travel = 0;
    let threshold = 0;
    let latestX = 0;

    const animateBack = () => {
      button.style.transition = "transform 140ms cubic-bezier(0.25, 0.8, 0.25, 1)";
      if (other) other.style.transition = "transform 140ms cubic-bezier(0.25, 0.8, 0.25, 1)";
      button.style.transform = "translateX(0px)";
      if (other) other.style.transform = "translateX(0px)";
      window.setTimeout(() => this.resetTabActionDragStyles(parent), 160);
    };

    const finish = async (evt, cancelled = false) => {
      if (pointerId === null || (evt && evt.pointerId !== pointerId)) return;
      try { button.releasePointerCapture(pointerId); } catch (e) {}
      pointerId = null;
      const didDrag = dragging;
      axisLocked = false;
      dragging = false;
      if (didDrag) this.suppressActionClickUntil = Date.now() + 450;

      if (cancelled || !swapped) {
        if (didDrag) animateBack();
        else this.resetTabActionDragStyles(parent);
        swapped = false;
        other = null;
        return;
      }

      // Commit the visual swap first, then save and render. This avoids the old
      // stutter caused by repeatedly reordering DOM while the pointer is moving.
      button.style.transition = "transform 110ms cubic-bezier(0.2, 0.9, 0.2, 1)";
      if (other) other.style.transition = "transform 110ms cubic-bezier(0.2, 0.9, 0.2, 1)";
      button.style.transform = `translateX(${travel}px)`;
      if (other) other.style.transform = `translateX(${-travel}px)`;
      const targetSlot = initialSlot === 0 ? 1 : 0;
      window.setTimeout(async () => {
        this.resetTabActionDragStyles(parent);
        await this.plugin.moveTabActionButton(mode, initialSlot, targetSlot);
      }, 115);
    };

    button.addEventListener("pointerdown", (evt) => {
      if (evt.button !== undefined && evt.button !== 0) return;
      pointerId = evt.pointerId;
      startX = evt.clientX;
      startY = evt.clientY;
      latestX = startX;
      axisLocked = false;
      dragging = false;
      swapped = false;
      other = Array.from(parent.querySelectorAll(".sdn-tab-action-button")).find(el => el !== button) || null;
      travel = 0;
      threshold = 0;
      if (other) {
        const br = button.getBoundingClientRect();
        const or = other.getBoundingClientRect();
        travel = or.left - br.left;
        threshold = Math.abs(travel) / 2;
      }
      try { button.setPointerCapture(pointerId); } catch (e) {}
    });

    button.addEventListener("pointermove", (evt) => {
      if (pointerId === null || evt.pointerId !== pointerId || !other) return;
      const rawDx = evt.clientX - startX;
      const rawDy = evt.clientY - startY;

      if (!axisLocked) {
        if (Math.abs(rawDx) < 7 && Math.abs(rawDy) < 7) return;
        if (Math.abs(rawDy) > Math.abs(rawDx) + 4) {
          finish(evt, true);
          return;
        }
        axisLocked = true;
        dragging = true;
        button.addClass("sdn-dragging");
        parent.addClass("sdn-action-drag-active");
        button.style.transition = "none";
        other.style.transition = "transform 145ms cubic-bezier(0.2, 0.85, 0.25, 1)";
      }

      evt.preventDefault();
      evt.stopPropagation();
      latestX = evt.clientX;

      // Horizontal-only drag lane. Clamp slightly past the destination so the
      // dragged icon feels like it is pushing the other icon into its old slot.
      const min = Math.min(0, travel) - 6;
      const max = Math.max(0, travel) + 6;
      const dx = Math.max(min, Math.min(max, rawDx));
      button.style.transform = `translateX(${dx}px)`;

      const crossed = Math.abs(dx) >= threshold;
      if (crossed !== swapped) {
        swapped = crossed;
        if (swapped) other.addClass("sdn-action-swap-target");
        else other.removeClass("sdn-action-swap-target");
        other.style.transform = swapped ? `translateX(${-travel}px)` : "translateX(0px)";
      }
    }, { passive: false });

    button.addEventListener("pointerup", (evt) => { finish(evt); });
    button.addEventListener("pointercancel", (evt) => { finish(evt, true); });
  }

  clearTabActionDragState() {
    this.containerEl.querySelectorAll(".sdn-tab-action-button.sdn-drop-target, .sdn-tab-action-button.sdn-shift-left, .sdn-tab-action-button.sdn-shift-right, .sdn-tab-action-button.sdn-swap-left, .sdn-tab-action-button.sdn-swap-right, .sdn-tab-action-button.sdn-action-swap-target, .sdn-tab-action-button.sdn-action-swap-commit")
      .forEach(el => {
        el.removeClass("sdn-drop-target");
        el.removeClass("sdn-shift-left");
        el.removeClass("sdn-shift-right");
        el.removeClass("sdn-ios-nudge-left");
        el.removeClass("sdn-ios-nudge-right");
        el.removeClass("sdn-swap-left");
        el.removeClass("sdn-swap-right");
        el.removeClass("sdn-action-swap-target");
        el.removeClass("sdn-action-swap-commit");
      });
  }

  getTabActionMeta(mode, actionId) {
    return this.plugin.getAvailableTabActions(mode).find(action => action.id === actionId);
  }

  getTabActionIcon(mode, actionId) {
    if (mode === "recent" && actionId === "toggle-pin") {
      const file = this.plugin.getCurrentMarkdownFile();
      if (file instanceof TFile && this.plugin.isPinnedFile(file)) return "pin-off";
    }
    if (mode === "recent" && actionId === "toggle-pinned-section") return this.plugin.settings.pinnedNotesCollapsed ? "chevrons-down-up" : "chevrons-up-down";
    if (mode === "files" && actionId === "toggle-folders") {
      const folderPaths = getAllFolderPaths(this.app.vault.getRoot());
      const allExpanded = folderPaths.length > 0 && folderPaths.every(path => this.expanded.has(path));
      return allExpanded ? "chevrons-down-up" : "chevrons-up-down";
    }
    if (mode === "bookmarks" && actionId === "collapse-expand-sections") {
      const paths = this.getBookmarkFolderPaths();
      const expanded = new Set(this.plugin.settings.expandedBookmarkFolders || []);
      const allExpanded = paths.length > 0 && paths.every(path => expanded.has(path));
      return allExpanded ? "chevrons-down-up" : "chevrons-up-down";
    }
    const meta = this.getTabActionMeta(mode, actionId);
    return meta ? meta.icon : "circle";
  }

  updateTabActionState(button, mode, actionId) {
    if (mode === "recent" && actionId === "toggle-pin") {
      const file = this.plugin.getCurrentMarkdownFile();
      const canPin = file instanceof TFile && file.extension === "md";
      const isPinned = canPin && this.plugin.isPinnedFile(file);
      button.toggleClass("is-active", !!isPinned);
      button.toggleClass("is-disabled", !canPin);
      button.setAttr("title", canPin ? `${isPinned ? "Unpin" : "Pin"} current note. Drag to reorder. Right-click to change action.` : "Open a markdown note to pin it. Drag to reorder. Right-click to change action.");
    }
    if (mode === "files" && actionId === "reveal-current") {
      const active = this.plugin.getCurrentMarkdownFile();
      const isRevealed = !!(active && this.revealedPath === active.path);
      button.toggleClass("is-active", !!this.plugin.settings.autoRevealCurrentFile || isRevealed);
      button.setAttr("title", `${this.plugin.settings.autoRevealCurrentFile ? "Auto-reveal current file: on" : "Reveal current note"}. Drag to reorder. Right-click to change action.`);
    }
  }

  async runTabAction(mode, actionId, evt, button) {
    if (mode === "recent") {
      if (actionId === "toggle-pin") {
        const file = this.plugin.getCurrentMarkdownFile();
        if (!(file instanceof TFile) || file.extension !== "md") return;
        await this.plugin.togglePinnedFile(file);
        this.render();
        return;
      }
      if (actionId === "toggle-pinned-section") {
        this.plugin.settings.pinnedNotesCollapsed = !this.plugin.settings.pinnedNotesCollapsed;
        await this.plugin.saveSettings();
        this.render();
        return;
      }
      if (actionId === "sort-items") return this.showRecentSortMenu(evt);
    }

    if (mode === "files") {
      if (actionId === "reveal-current") {
        this.plugin.settings.autoRevealCurrentFile = !this.plugin.settings.autoRevealCurrentFile;
        await this.plugin.saveSettings();
        if (button) this.updateTabActionState(button, mode, actionId);
        if (this.plugin.settings.autoRevealCurrentFile) await this.revealCurrentFile({ silent: true, flash: true });
        return;
      }
      if (actionId === "toggle-folders") {
        const paths = getAllFolderPaths(this.app.vault.getRoot());
        const allExpanded = paths.length > 0 && paths.every(path => this.expanded.has(path));
        this.expanded = allExpanded ? new Set([""]) : new Set(paths);
        this.render();
        return;
      }
      if (actionId === "sort-items") return this.showFileTreeSortMenu(evt);
      if (actionId === "customize-files") return new FilesCustomizeModal(this.app, this.plugin, this).open();
      if (actionId === "new-folder") {
        const name = await this.askText("New folder", "Folder name");
        if (!name) return;
        await ensureFolder(this.app, normalizePath(name));
        this.expanded.add("");
        this.render();
        return;
      }
    }

    if (mode === "bookmarks") {
      if (actionId === "new-bookmark-group") return this.createBookmarkGroupFromHeader();
      if (actionId === "customize-bookmarks") return new HomeCustomizeModal(this.app, this.plugin).open();
      if (actionId === "sort-items") return this.showBookmarksItemSortMenu(evt);
      if (actionId === "collapse-expand-sections") {
        await this.toggleAllBookmarkFolders();
        return;
      }
    }
  }

  showTabActionMenu(evt, mode, slot) {
    const buttons = this.plugin.getTabActionButtons(mode);
    const current = buttons[slot];
    const usedByOtherSlot = new Set(buttons.filter((id, idx) => idx !== slot && !!id));
    const menu = new Menu();
    for (const action of this.plugin.getAvailableTabActions(mode)) {
      menu.addItem(i => {
        const unavailable = usedByOtherSlot.has(action.id);
        i.setTitle(`${current === action.id ? "✓ " : ""}${action.label}`);
        i.setIcon(action.icon);
        if (unavailable && typeof i.setDisabled === "function") i.setDisabled(true);
        if (unavailable) {
          if (typeof i.setTooltip === "function") i.setTooltip("Already assigned to the other action button");
          return;
        }
        i.onClick(async () => {
          await this.plugin.setTabActionButton(mode, slot, action.id);
          this.render();
        });
      });
    }
    this.showMenu(menu, evt);
  }

  makeTab(parent, mode, label) {
    const tab = parent.createEl("button", { cls: `sdn-tab ${this.mode === mode ? "is-active" : ""}`, text: label });
    if (mode === "recent") {
      tab.setAttr("aria-label", "Recent. Right-click for view options.");
      tab.setAttr("title", "Right-click for Recent options");
      tab.oncontextmenu = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.showRecentTabMenu(evt);
      };
    }
    if (mode === "files") {
      tab.setAttr("aria-label", "Files. Right-click for view options.");
      tab.setAttr("title", "Right-click for Files options");
      tab.oncontextmenu = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.showFilesTabMenu(evt);
      };
    }
    if (mode === "bookmarks") {
      tab.setAttr("aria-label", "Bookmarks. Right-click for view options.");
      tab.setAttr("title", "Right-click for Bookmarks options");
      tab.oncontextmenu = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this.showBookmarksTabMenu(evt);
      };
    }
    tab.onclick = () => {
      this.mode = mode;
      this.render();
    };
  }


  addSubmenuItems(item, fallbackEvt, fillSubmenu, fallbackClick) {
    if (typeof item.setSubmenu === "function") {
      const submenu = item.setSubmenu();
      if (submenu && typeof submenu.addItem === "function") {
        fillSubmenu(submenu);
        return;
      }
    }
    if (fallbackClick) item.onClick(fallbackClick);
  }

  addFileTreeSortItems(menu) {
    const currentSort = this.plugin.settings.fileTreeSort || "name-asc";
    const addSort = (key, label, icon) => {
      menu.addItem(item => item
        .setTitle(`${currentSort === key ? "✓ " : ""}${label}`)
        .setIcon(icon)
        .onClick(async () => {
          this.plugin.settings.fileTreeSort = key;
          await this.plugin.saveSettings();
          this.render();
        }));
    };
    addSort("name-asc", "Name, A to Z", "a-arrow-down");
    addSort("name-desc", "Name, Z to A", "a-arrow-up");
    addSort("modified-desc", "Modified, newest first", "clock");
    addSort("modified-asc", "Modified, oldest first", "history");
  }

  addFileTreeFolderBehaviorItems(menu) {
    const currentFolderBehavior = this.plugin.settings.fileTreeFolderBehavior || "folders-first";
    const addFolderBehavior = (key, label, icon) => {
      menu.addItem(item => item
        .setTitle(`${currentFolderBehavior === key ? "✓ " : ""}${label}`)
        .setIcon(icon)
        .onClick(async () => {
          this.plugin.settings.fileTreeFolderBehavior = key;
          await this.plugin.saveSettings();
          this.render();
        }));
    };
    addFolderBehavior("folders-first", "Folders first", "folder-tree");
    addFolderBehavior("mixed", "Mix folders and files", "list-tree");
  }

  showRecentTabMenu(evt) {
    const menu = new Menu();
    menu.addItem(i => {
      i.setTitle("Sort items").setIcon("arrow-up-down");
      this.addSubmenuItems(i, evt, submenu => this.addRecentSortItems(submenu), () => this.showRecentSortMenu(evt));
    });
    menu.addItem(i => {
      i.setTitle("Date display").setIcon("calendar-days");
      this.addSubmenuItems(i, evt, submenu => this.showRecentDateMenu(submenu), () => this.showRecentSortMenu(evt));
    });
    this.showMenu(menu, evt);
  }

  showFilesTabMenu(evt) {
    const menu = new Menu();
    menu.addItem(i => {
      i.setTitle("Sort items").setIcon("arrow-up-down");
      this.addSubmenuItems(i, evt, submenu => this.addFileTreeSortItems(submenu), () => this.showFileTreeSortMenu(evt));
    });
    menu.addItem(i => {
      i.setTitle("Folder behavior").setIcon("folder-tree");
      this.addSubmenuItems(i, evt, submenu => this.addFileTreeFolderBehaviorItems(submenu), () => this.showFileTreeSortMenu(evt));
    });
    menu.addSeparator();
    menu.addItem(i => i
      .setTitle("Customize Files view")
      .setIcon("sliders-horizontal")
      .onClick(() => new FilesCustomizeModal(this.app, this.plugin, this).open()));
    this.showMenu(menu, evt);
  }

  showBookmarksTabMenu(evt) {
    const menu = new Menu();
    menu.addItem(i => {
      i.setTitle("Sort items").setIcon("arrow-up-down");
      this.addSubmenuItems(i, evt, submenu => this.addBookmarksSortItems(submenu), () => this.showBookmarksItemSortMenu(evt));
    });
    menu.addSeparator();
    menu.addItem(i => i
      .setTitle("Customize view")
      .setIcon("sliders-horizontal")
      .onClick(() => new HomeCustomizeModal(this.app, this.plugin).open()));
    menu.addItem(i => i
      .setTitle("New bookmark group")
      .setIcon("folder-plus")
      .onClick(() => this.createBookmarkGroupFromHeader()));
    this.showMenu(menu, evt);
  }

  async revealCurrentFile(options = {}) {
    const { silent = false, flash = true } = options;
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      if (!silent) new Notice("No active file to reveal.");
      return;
    }
    if (shouldHidePath(this.plugin, file.path)) {
      if (!silent) new Notice("Active file is hidden by Lighthouse settings.");
      return;
    }

    this.mode = "files";
    this.revealedPath = file.path;
    this.expanded = getAncestorFolderSet(file.path);
    this.render();

    window.setTimeout(() => {
      const row = [...this.containerEl.querySelectorAll(".sdn-tree-row")].find(el => el.dataset && el.dataset.path === file.path);
      if (!row) return;
      row.scrollIntoView({ block: "center", inline: "nearest" });
      if (flash) {
        row.addClass("sdn-revealed-file");
        window.setTimeout(() => row.removeClass("sdn-revealed-file"), 1400);
      }
    }, 0);
  }

  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles().filter(file => !shouldHidePath(this.plugin, file.path));
  }

  showMenu(menu, evt) {
    if (evt && evt.preventDefault) evt.preventDefault();
    if (evt && evt.stopPropagation) evt.stopPropagation();

    const x = evt && typeof evt.clientX === "number" ? evt.clientX : null;
    const y = evt && typeof evt.clientY === "number" ? evt.clientY : null;

    if (x !== null && y !== null && typeof menu.showAtPosition === "function") {
      menu.showAtPosition({ x, y });
      return;
    }

    if (evt && typeof menu.showAtMouseEvent === "function") {
      menu.showAtMouseEvent(evt);
    }
  }

  attachContextMenu(el, openMenu) {
    el.oncontextmenu = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (this.suppressContextUntil && Date.now() < this.suppressContextUntil) return;
      openMenu(evt);
    };

    let longPressTimer = null;
    let startX = 0;
    let startY = 0;
    let longPressTriggered = false;

    const clearLongPress = () => {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;
    };

    const suppressTap = (evt) => {
      if (this.suppressClickUntil && Date.now() < this.suppressClickUntil) {
        evt.preventDefault();
        evt.stopPropagation();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    el.addEventListener("click", suppressTap, true);
    el.addEventListener("pointerup", (evt) => {
      clearLongPress();
      if (longPressTriggered || suppressTap(evt)) {
        longPressTriggered = false;
      }
    }, true);
    el.addEventListener("touchend", suppressTap, true);

    el.addEventListener("pointerdown", (evt) => {
      if (!document.body.classList.contains("is-mobile")) return;
      if (evt.pointerType && evt.pointerType !== "touch" && evt.pointerType !== "pen") return;

      startX = evt.clientX;
      startY = evt.clientY;
      longPressTriggered = false;
      clearLongPress();

      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        longPressTriggered = true;
        this.suppressClickUntil = Date.now() + 1200;
        this.suppressContextUntil = Date.now() + 1200;
        if (navigator.vibrate) navigator.vibrate(10);
        openMenu({
          clientX: startX,
          clientY: startY,
          preventDefault() {},
          stopPropagation() {}
        });
      }, 550);
    }, { passive: true });

    el.addEventListener("pointermove", (evt) => {
      if (!longPressTimer) return;
      if (Math.abs(evt.clientX - startX) > 10 || Math.abs(evt.clientY - startY) > 10) clearLongPress();
    }, { passive: true });

    el.addEventListener("pointercancel", clearLongPress, true);
  }

  // Recents stays file-only. Pinned notes are shown first and do not count against the recent limit.
  renderRecent(parent) {
    const focus = this.plugin.getActiveFocus();
    const shouldFilterFocus = !!focus && this.plugin.settings.focusFilterRecents !== false;
    const inFocus = (file) => !shouldFilterFocus || this.plugin.isPathInFocus(file.path, focus);
    const pinnedFiles = this.plugin.getPinnedNoteFiles().filter(inFocus);
    const pinnedPaths = new Set(pinnedFiles.map(file => file.path));
    const files = this.getMarkdownFiles()
      .filter(file => !pinnedPaths.has(file.path))
      .filter(inFocus)
      .sort((a, b) => this.compareRecentFiles(a, b))
      .slice(0, this.plugin.settings.recentLimit);

    const list = parent.createDiv({ cls: "sdn-list" });
    list.oncontextmenu = (evt) => {
      if (evt.target && evt.target.closest && evt.target.closest(".sdn-recent-item")) return;
      evt.preventDefault();
      evt.stopPropagation();
      this.showRecentSortMenu(evt);
    };

    if (pinnedFiles.length) {
      this.renderPinnedHeader(list, pinnedFiles.length);
      if (!this.plugin.settings.pinnedNotesCollapsed) {
        for (const file of pinnedFiles) this.renderRecentItem(list, file, { pinned: true });
        if (files.length) this.renderPinnedSeparator(list);
      }
    }
    for (const file of files) this.renderRecentItem(list, file);
  }

  renderPinnedHeader(parent, count) {
    const collapsed = this.plugin.settings.pinnedNotesCollapsed === true;
    const row = parent.createDiv({ cls: "sdn-pinned-header" });
    row.setAttr("role", "button");
    row.setAttr("aria-expanded", collapsed ? "false" : "true");

    const caret = row.createSpan({ cls: "sdn-pinned-caret" });
    setIcon(caret, collapsed ? "chevron-right" : "chevron-down");

    const label = row.createSpan({ cls: "sdn-pinned-label", text: "Pinned" });
    row.createSpan({ cls: "sdn-pinned-count", text: String(count) });

    row.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.plugin.settings.pinnedNotesCollapsed = !collapsed;
      await this.plugin.saveSettings();
      this.render();
    };
  }

  renderPinnedSeparator(parent) {
    parent.createDiv({ cls: "sdn-pinned-separator" });
  }

  compareRecentFiles(a, b) {
    switch (this.plugin.settings.recentSort || "modified-desc") {
      case "modified-asc": return a.stat.mtime - b.stat.mtime;
      case "name-asc": return a.basename.localeCompare(b.basename);
      case "name-desc": return b.basename.localeCompare(a.basename);
      case "modified-desc":
      default: return b.stat.mtime - a.stat.mtime;
    }
  }

  addRecentSortItems(menu) {
    const current = this.plugin.settings.recentSort || "modified-desc";
    const addSort = (key, label, icon) => {
      menu.addItem(item => item
        .setTitle(`${current === key ? "✓ " : ""}${label}`)
        .setIcon(icon)
        .onClick(async () => {
          this.plugin.settings.recentSort = key;
          await this.plugin.saveSettings();
          this.render();
        }));
    };
    addSort("modified-desc", "Modified, newest first", "clock");
    addSort("modified-asc", "Modified, oldest first", "history");
    addSort("name-asc", "Name, A to Z", "a-arrow-down");
    addSort("name-desc", "Name, Z to A", "a-arrow-up");
  }

  showRecentSortMenu(evt) {
    const menu = new Menu();
    this.addRecentSortItems(menu);
    menu.addSeparator();
    this.showRecentDateMenu(menu);
    this.showMenu(menu, evt);
  }

  showRecentItemMenu(evt, file) {
    const menu = new Menu();
    this.addFileMenuActions(menu, file);
    this.showMenu(menu, evt);
  }

  showRecentDateMenu(menu) {
    const current = this.plugin.settings.recentDateDisplay || "hidden";
    const addDateOption = (key, label) => {
      menu.addItem(item => item
        .setTitle(`${current === key ? "✓ " : ""}${label}`)
        .setIcon(key === "hidden" ? "eye-off" : "calendar-days")
        .onClick(async () => {
          this.plugin.settings.recentDateDisplay = key;
          await this.plugin.saveSettings();
          this.render();
        }));
    };
    addDateOption("hidden", "Hide dates");
    addDateOption("modified", "Show modified date");
    addDateOption("created", "Show created date");
    addDateOption("both", "Show modified and created dates");

    if (current !== "hidden") {
      const currentFormat = this.plugin.settings.recentDateFormat || "relative";
      const addFormatOption = (key, label) => {
        menu.addItem(item => item
          .setTitle(`${currentFormat === key ? "✓ " : ""}${label}`)
          .onClick(async () => {
            this.plugin.settings.recentDateFormat = key;
            await this.plugin.saveSettings();
            this.render();
          }));
      };
      menu.addSeparator();
      addFormatOption("relative", "Date format: relative");
      addFormatOption("absolute", "Date format: absolute");
    }
  }

  formatRecentAbsoluteDate(timestamp) {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  formatRecentRelativeDate(timestamp) {
    if (!timestamp) return "";
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return this.formatRecentAbsoluteDate(timestamp);

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes}m ago`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours}h ago`;
    }

    const days = Math.floor(diffMs / day);
    if (days === 1) return "Yesterday";
    if (days <= 7) return `${days}d ago`;

    return this.formatRecentAbsoluteDate(timestamp);
  }

  formatRecentDate(timestamp) {
    const format = this.plugin.settings.recentDateFormat || "relative";
    return format === "absolute" ? this.formatRecentAbsoluteDate(timestamp) : this.formatRecentRelativeDate(timestamp);
  }

  getRecentDateText(file) {
    const mode = this.plugin.settings.recentDateDisplay || "hidden";
    const modified = this.formatRecentDate(file.stat && file.stat.mtime);
    const created = this.formatRecentDate(file.stat && file.stat.ctime);
    if (mode === "modified") return modified ? `Modified ${modified}` : "";
    if (mode === "created") return created ? `Created ${created}` : "";
    if (mode === "both") {
      return [modified ? `Modified ${modified}` : "", created ? `Created ${created}` : ""].filter(Boolean).join(" · ");
    }
    return "";
  }

  async getPreview(file) {
    try {
      const text = await this.app.vault.cachedRead(file);
      return stripMarkdownPreviewText(stripFrontmatter(text));
    } catch {
      return "";
    }
  }

  renderRecentItem(parent, file, options = {}) {
    const item = parent.createDiv({ cls: `sdn-recent-item ${options.pinned ? "is-pinned" : ""}` });
    const titleRow = item.createDiv({ cls: "sdn-note-title-row" });
    if (options.pinned) {
      const pinIcon = titleRow.createSpan({ cls: "sdn-pin-icon", attr: { "aria-label": "Pinned note" } });
      setIcon(pinIcon, "pin");
    }
    titleRow.createDiv({ cls: "sdn-note-title", text: file.basename });
    const previewEl = item.createDiv({ cls: `sdn-preview sdn-preview-lines-${this.plugin.settings.previewLines}` });
    const locEl = item.createDiv({ cls: "sdn-location", text: file.parent ? file.parent.path : "/" });
    locEl.toggle(this.plugin.settings.showRecentLocation);
    const dateText = this.getRecentDateText(file);
    const dateEl = item.createDiv({ cls: "sdn-recent-date", text: dateText });
    dateEl.toggle(!!dateText);

    if (this.plugin.settings.previewLines > 0) {
      this.getPreview(file).then(preview => {
        previewEl.setText(preview || "");
        previewEl.toggle(!!preview);
      });
    } else {
      previewEl.remove();
    }

    item.onclick = () => this.plugin.openFile(file);
    this.attachContextMenu(item, (evt) => this.showRecentItemMenu(evt, file));
  }

  // Files tab mirrors a lightweight Obsidian file explorer with one expand/collapse toggle.
  renderFiles(parent) {
    const wrap = parent.createDiv({ cls: "sdn-file-wrap" });

    const tree = wrap.createDiv({ cls: "sdn-tree" });
    tree.oncontextmenu = (evt) => {
      if (evt.target && evt.target.closest && evt.target.closest(".sdn-tree-row, .sdn-tree-control")) return;
      evt.preventDefault();
      evt.stopPropagation();
      this.showBackgroundFilesMenu(evt);
    };
    wrap.oncontextmenu = (evt) => {
      if (evt.target && evt.target.closest && evt.target.closest(".sdn-tree-row, .sdn-tree-control")) return;
      evt.preventDefault();
      evt.stopPropagation();
      this.showBackgroundFilesMenu(evt);
    };

    this.renderRootChildren(tree);
  }

  renderRootChildren(parent) {
    const focusedItems = this.plugin.getFocusFileRootItems();
    if (focusedItems && focusedItems.length) {
      const { folders, files, items, mixed } = this.sortFileTreeChildren(focusedItems);
      const ordered = mixed ? items : [...folders, ...files];
      if (!ordered.length) {
        parent.createDiv({ cls: "sdn-empty", text: "No items in this Focus" });
        return;
      }
      for (const item of ordered) {
        if (item instanceof TFolder) this.renderFolderNode(parent, item, 0);
        if (item instanceof TFile) this.renderFileNode(parent, item, 0);
      }
      return;
    }

    const focus = this.plugin.getActiveFocus();
    if (focus && this.plugin.settings.focusFilterFiles !== false) {
      parent.createDiv({ cls: "sdn-empty", text: "No Files items in this Focus" });
      return;
    }

    const root = this.app.vault.getRoot();
    this.renderSortedChildren(parent, [...root.children], 0);
  }

  renderSortedChildren(parent, children, depth) {
    const { folders, files, items, mixed } = this.sortFileTreeChildren(children);
    const ordered = mixed ? items : [...folders, ...files];

    for (const item of ordered) {
      if (item instanceof TFolder) this.renderFolderNode(parent, item, depth);
      if (item instanceof TFile) this.renderFileNode(parent, item, depth);
    }
  }

  sortFileTreeChildren(children) {
    const visible = children.filter(child => !shouldHide(child));
    const folders = visible.filter(c => c instanceof TFolder);
    const files = visible.filter(c => c instanceof TFile && ["md", "canvas", "base"].includes(c.extension));
    const mixed = (this.plugin.settings.fileTreeFolderBehavior || "folders-first") === "mixed";

    // In Folders First mode, only files use the selected file sort.
    // Folders remain grouped and alphabetized so the tree structure stays stable.
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => this.compareFileTreeItems(a, b));

    // Mixed mode intentionally sorts folders and files together by the selected sort.
    const items = mixed ? [...folders, ...files].sort((a, b) => this.compareFileTreeItems(a, b)) : [];
    return { folders, files, items, mixed };
  }

  compareFileTreeItems(a, b) {
    const sort = this.plugin.settings.fileTreeSort || "name-asc";
    const aName = a instanceof TFile ? a.basename : a.name;
    const bName = b instanceof TFile ? b.basename : b.name;

    switch (sort) {
      case "name-desc":
        return bName.localeCompare(aName);
      case "modified-desc":
        return this.getTreeItemMtime(b) - this.getTreeItemMtime(a) || aName.localeCompare(bName);
      case "modified-asc":
        return this.getTreeItemMtime(a) - this.getTreeItemMtime(b) || aName.localeCompare(bName);
      case "name-asc":
      default:
        return aName.localeCompare(bName);
    }
  }

  getTreeItemMtime(item) {
    if (item instanceof TFile) return item.stat ? item.stat.mtime : 0;
    if (!(item instanceof TFolder)) return 0;

    let newest = 0;
    for (const child of item.children || []) {
      if (shouldHide(child)) continue;
      newest = Math.max(newest, this.getTreeItemMtime(child));
    }
    return newest;
  }

  showFileTreeSortMenu(evt) {
    const menu = new Menu();
    this.addFileTreeSortItems(menu);
    menu.addSeparator();
    this.addFileTreeFolderBehaviorItems(menu);
    this.showMenu(menu, evt);
  }

  // Render the contents of an expanded folder. The visible root row was removed in v1.4.x,
  // so root children are rendered directly by renderRootChildren().
  renderFolder(parent, folder, depth) {
    this.renderSortedChildren(parent, [...folder.children], depth + 1);
  }

  renderFolderNode(parent, folder, depth) {
    const path = folder.path;
    const row = parent.createDiv({ cls: "sdn-tree-row sdn-folder-row", attr: { "data-depth": depth } });
    row.style.paddingLeft = `${depth * 18 + 4}px`;
    row.dataset.path = folder.path;
    row.dataset.type = "folder";
    row.draggable = true;
    const arrow = row.createSpan({ cls: "sdn-arrow" });
    setIcon(arrow, this.expanded.has(path) ? "chevron-down" : "chevron-right");
    row.createSpan({ cls: "sdn-folder-name", text: folder.name });
    this.renderBookmarkedIndicator(row, folder);
    if (this.revealedPath === folder.path) row.addClass("is-revealed");
    this.renderWatchFolderStatus(row, folder);
    this.attachDragSource(row, folder);
    this.attachFolderDropTarget(row, folder);
    row.onclick = () => {
      toggleSet(this.expanded, path);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      row.blur && row.blur();
      this.render();
    };
    this.attachContextMenu(row, (evt) => this.showFolderMenu(evt, folder));
    if (this.expanded.has(path)) this.renderFolder(parent, folder, depth);
  }

  renderBookmarkedIndicator(row, item) {
    if (this.plugin.settings.showBookmarkedFileIndicators === false) return;
    if (!(item instanceof TFile || item instanceof TFolder)) return;
    if (!isBookmarkedPath(this.app, item.path)) return;
    const icon = row.createSpan({ cls: "sdn-bookmark-status-icon", attr: { "aria-label": "Bookmarked" } });
    setIcon(icon, "bookmark");
  }

  renderWatchFolderStatus(row, folder) {
    const isWatched = this.plugin.isWatchedFolder(folder);
    const countMode = this.plugin.settings.folderCountMode || (this.plugin.settings.showWatchCounts === true ? "watched" : "off");
    const shouldShowCount = countMode === "all" || (countMode === "watched" && isWatched);

    if (!isWatched && !shouldShowCount) return;

    const count = this.getFolderFileCount(folder);
    const isEmptyWatchedFolder = isWatched && count <= 0;
    const showEmptyStatus = this.plugin.settings.showEmptyWatchFolderStatus !== false;
    const showZeroCount = this.plugin.settings.showZeroWatchCounts !== false;

    if (isWatched && this.plugin.settings.showWatchIndicator !== false) {
      if (count > 0) {
        row.createSpan({ cls: "sdn-watch-dot", attr: { "aria-label": "Watched folder contains files" } });
      } else if (showEmptyStatus) {
        row.createSpan({ cls: "sdn-watch-dot sdn-watch-dot-empty", attr: { "aria-label": "Watched folder is empty" } });
      }
    }

    if (shouldShowCount && (count > 0 || (isEmptyWatchedFolder && showZeroCount))) {
      row.createSpan({ cls: "sdn-watch-count", text: `(${count})` });
    }
  }

  getFolderFileCount(folder) {
    if (!(folder instanceof TFolder)) return 0;

    let count = 0;
    const walk = (current) => {
      for (const child of current.children || []) {
        if (shouldHide(child)) continue;
        if (child instanceof TFile) {
          count += 1;
        } else if (child instanceof TFolder) {
          walk(child);
        }
      }
    };

    walk(folder);
    return count;
  }

  renderFileNode(parent, file, depth) {
    const row = parent.createDiv({ cls: "sdn-tree-row sdn-file-row", attr: { "data-depth": depth } });
    row.style.paddingLeft = `${depth * 18 + 28}px`;
    row.dataset.path = file.path;
    row.dataset.type = "file";
    if (this.revealedPath === file.path) row.addClass("is-revealed");
    row.draggable = true;
    row.createSpan({ cls: "sdn-file-name", text: file.basename });
    this.renderBookmarkedIndicator(row, file);
    this.attachDragSource(row, file);
    row.onclick = () => {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      row.blur && row.blur();
      this.plugin.openFile(file);
    };
    this.attachContextMenu(row, (evt) => this.showFileMenu(evt, file));
  }

  // Track drag source internally because some webviews hide dataTransfer contents until drop.
  attachDragSource(row, item) {
    row.addEventListener("dragstart", (evt) => {
      evt.stopPropagation();
      this.dragSourcePath = item.path;
      row.addClass("sdn-dragging");
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", item.path);
        evt.dataTransfer.setData("application/x-simple-drafts-path", item.path);
      }
    });

    row.addEventListener("dragend", () => {
      this.dragSourcePath = null;
      this.dragHoverFolderPath = null;
      clearTimeout(this.dragExpandTimer);
      row.removeClass("sdn-dragging");
      this.containerEl.querySelectorAll(".sdn-drop-target").forEach(el => el.removeClass("sdn-drop-target"));
    });
  }

  attachFolderDropTarget(row, folder) {
    const canDropHere = () => {
      const sourcePath = this.dragSourcePath;
      if (!sourcePath) return false;
      if (sourcePath === folder.path) return false;
      if (folder.path && sourcePath.startsWith(folder.path + "/")) return false;
      return true;
    };

    row.addEventListener("dragenter", (evt) => {
      if (!canDropHere()) return;
      evt.preventDefault();
      evt.stopPropagation();
      row.addClass("sdn-drop-target");
    });

    row.addEventListener("dragover", (evt) => {
      if (!canDropHere()) return;
      evt.preventDefault();
      evt.stopPropagation();
      if (evt.dataTransfer) evt.dataTransfer.dropEffect = "move";
      row.addClass("sdn-drop-target");
      if (this.dragHoverFolderPath !== folder.path) {
        this.dragHoverFolderPath = folder.path;
        clearTimeout(this.dragExpandTimer);
        this.dragExpandTimer = setTimeout(() => {
          if (this.dragSourcePath && this.dragHoverFolderPath === folder.path && !this.expanded.has(folder.path)) {
            this.expanded.add(folder.path);
            this.render();
          }
        }, 550);
      }
    });

    row.addEventListener("dragleave", (evt) => {
      const related = evt.relatedTarget;
      if (related && row.contains(related)) return;
      row.removeClass("sdn-drop-target");
      this.dragHoverFolderPath = null;
      clearTimeout(this.dragExpandTimer);
    });

    row.addEventListener("drop", async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      row.removeClass("sdn-drop-target");

      const sourcePath = this.dragSourcePath || (evt.dataTransfer && (evt.dataTransfer.getData("application/x-simple-drafts-path") || evt.dataTransfer.getData("text/plain")));
      if (!sourcePath) {
        new Notice("Move failed: no dragged item found.");
        return;
      }

      const source = this.app.vault.getAbstractFileByPath(sourcePath);
      if (!source) return;
      if (source.path === folder.path) return;
      if (folder.path && source.path.startsWith(folder.path + "/")) return;

      const targetPath = normalizePath(`${folder.path}/${source.name}`);
      if (targetPath === source.path) return;

      if (this.app.vault.getAbstractFileByPath(targetPath)) {
        new Notice("A file or folder with that name already exists there.");
        return;
      }

      try {
        await this.app.fileManager.renameFile(source, targetPath);
        this.dragSourcePath = null;
        clearTimeout(this.dragExpandTimer);
        this.expanded.add(folder.path);
        this.render();
      } catch (e) {
        console.error("Lighthouse move failed", e);
        new Notice(`Move failed: ${e.message || e}`);
      }
    });
  }


  renderFocusSwitcher(parent) {
    const active = this.plugin.getActiveFocus();
    const row = parent.createDiv({ cls: "sdn-focus-switcher" });
    const button = row.createEl("button", {
      cls: `sdn-focus-button ${active ? "is-active" : ""}`,
      attr: { "aria-label": "Lighthouse Focus" }
    });
    const icon = button.createSpan({ cls: "sdn-focus-icon", attr: { "aria-hidden": "true" } });
    setIcon(icon, active ? "list-filter" : "list-filter");
    button.createSpan({ cls: "sdn-focus-name", text: this.plugin.getActiveFocusName() });
    const caret = button.createSpan({ cls: "sdn-focus-caret", attr: { "aria-hidden": "true" } });
    setIcon(caret, "chevron-down");
    button.onclick = (evt) => this.showFocusMenu(evt);
  }

  showFocusMenu(evt) {
    const menu = new Menu();
    const current = this.plugin.settings.activeFocusId || "all";
    menu.addItem(item => item
      .setTitle(`${current === "all" ? "✓ " : ""}All`)
      .setIcon("layers")
      .onClick(() => this.plugin.setActiveFocus("all")));
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    if (focuses.length) menu.addSeparator();
    for (const focus of focuses) {
      menu.addItem(item => item
        .setTitle(`${current === focus.id ? "✓ " : ""}${focus.name}`)
        .setIcon("crosshair")
        .onClick(() => this.plugin.setActiveFocus(focus.id)));
    }
    menu.addSeparator();
    menu.addItem(item => item
      .setTitle("New Focus…")
      .setIcon("plus")
      .onClick(() => new FocusEditModal(this.app, this.plugin, null).open()));
    const active = this.plugin.getActiveFocus();
    if (active) {
      menu.addItem(item => item
        .setTitle("Edit Current Focus…")
        .setIcon("sliders-horizontal")
        .onClick(() => new FocusEditModal(this.app, this.plugin, active).open()));
      menu.addItem(item => item
        .setTitle("Delete Current Focus")
        .setIcon("trash")
        .onClick(() => this.confirmDeleteFocus(active)));
    }
    this.showMenu(menu, evt);
  }

  confirmDeleteFocus(focus) {
    if (!focus) return;
    if (this.plugin.settings.confirmFocusDelete === false) {
      this.plugin.deleteFocus(focus.id);
      return;
    }
    new FocusDeleteConfirmModal(this.app, this.plugin, focus).open();
  }

  renderBookmarks(parent) {
    this.renderBookmarksHome(parent);
  }

  renderBookmarksHome(parent) {
    const list = parent.createDiv({ cls: "sdn-list sdn-home-list" });
    this.renderFocusSwitcher(list);
    const activeFocus = this.plugin.getActiveFocus();
    if (activeFocus) {
      this.renderFocusDrillView(list, activeFocus);
      return;
    }
    const layout = this.plugin.getHomeLayout();

    if (!layout.length) {
      list.createDiv({ cls: "sdn-empty", text: "No sections enabled" });
      return;
    }

    for (const sectionId of layout) this.renderHomeSection(list, sectionId);
  }

  renderHomeSection(parent, sectionId) {
    const section = parent.createDiv({ cls: "sdn-home-section" });
    section.dataset.homeSection = sectionId;
    this.attachHomeSectionDrag(section, sectionId);
    this.renderHomeSectionHeader(section, sectionId);

    const collapsed = this.plugin.isHomeSectionCollapsed(sectionId);
    if (collapsed) section.addClass("is-collapsed");
    const content = section.createDiv({ cls: "sdn-home-section-content" });
    if (collapsed) return;
    if (sectionId === "bookmark-groups") this.renderHomeBookmarkGroups(content);
    if (sectionId === "pinned-notes") this.renderHomePinnedNotes(content);
    if (sectionId === "open-tabs") this.renderHomeOpenTabs(content);
    if (sectionId === "watch-folders") this.renderHomeWatchFolders(content);
  }

  renderHomeSectionHeader(parent, sectionId) {
    const meta = this.getHomeSectionMeta(sectionId);
    const header = parent.createDiv({ cls: "sdn-home-section-header" });
    header.setAttr("role", "button");
    header.setAttr("aria-expanded", this.plugin.isHomeSectionCollapsed(sectionId) ? "false" : "true");
    const caret = header.createSpan({ cls: "sdn-home-section-caret", attr: { "aria-hidden": "true" } });
    setIcon(caret, this.plugin.isHomeSectionCollapsed(sectionId) ? "chevron-right" : "chevron-down");
    const icon = header.createSpan({ cls: "sdn-home-section-icon" });
    setIcon(icon, meta.icon);
    header.createSpan({ cls: "sdn-home-section-title", text: meta.label });
    const grip = header.createSpan({ cls: "sdn-home-drag-handle", attr: { "aria-label": "Drag to reorder section" } });
    setIcon(grip, "grip-vertical");
    header.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.plugin.toggleHomeSectionCollapsed(sectionId);
    };
  }

  getBookmarksItemSort() {
    const sort = this.plugin.settings.bookmarksItemSort || "name-asc";
    const legacySortMap = { custom: "name-asc", name: "name-asc", modified: "modified-desc", created: "created-desc" };
    const normalized = legacySortMap[sort] || sort;
    return ["name-asc", "name-desc", "modified-desc", "modified-asc", "created-desc", "created-asc"].includes(normalized) ? normalized : "name-asc";
  }

  getBookmarksSortOptions() {
    return [
      ["name-asc", "Name, A to Z", "a-arrow-down"],
      ["name-desc", "Name, Z to A", "a-arrow-up"],
      ["modified-desc", "Modified, newest first", "clock"],
      ["modified-asc", "Modified, oldest first", "history"],
      ["created-desc", "Created, newest first", "calendar-plus"],
      ["created-asc", "Created, oldest first", "calendar-days"]
    ];
  }

  addBookmarksSortItems(menu) {
    const current = this.getBookmarksItemSort();
    for (const [value, label, icon] of this.getBookmarksSortOptions()) {
      menu.addItem(item => item
        .setTitle(`${current === value ? "✓ " : ""}${label}`)
        .setIcon(icon)
        .onClick(() => this.plugin.setBookmarksItemSort(value)));
    }
  }

  showBookmarksItemSortMenu(evt) {
    const menu = new Menu();
    this.addBookmarksSortItems(menu);
    this.showMenu(menu, evt);
  }

  attachHomeSectionDrag(section, sectionId) {
    section.draggable = true;
    section.addEventListener("dragstart", (evt) => {
      this.dragHomeSectionId = sectionId;
      section.addClass("sdn-dragging");
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("application/x-navigator-home-section", sectionId);
      }
    });
    section.addEventListener("dragend", () => {
      section.removeClass("sdn-dragging");
      this.dragHomeSectionId = null;
      this.containerEl.querySelectorAll(".sdn-home-section.sdn-drop-target").forEach(el => el.removeClass("sdn-drop-target"));
    });
    section.addEventListener("dragover", (evt) => {
      if (!this.dragHomeSectionId || this.dragHomeSectionId === sectionId) return;
      evt.preventDefault();
      section.addClass("sdn-drop-target");
    });
    section.addEventListener("dragleave", () => section.removeClass("sdn-drop-target"));
    section.addEventListener("drop", async (evt) => {
      if (!this.dragHomeSectionId || this.dragHomeSectionId === sectionId) return;
      evt.preventDefault();
      evt.stopPropagation();
      await this.plugin.moveHomeSection(this.dragHomeSectionId, sectionId);
    });
  }

  renderHomeEmpty(parent) {
    parent.createDiv({ cls: "sdn-home-empty", text: "Empty" });
  }

  getHomeSectionMeta(sectionId) {
    const map = {
      "bookmark-groups": { label: "Bookmarks", icon: "bookmark" },
      "pinned-notes": { label: "Pinned Notes", icon: "pin" },
      "open-tabs": { label: "Open Tabs", icon: "panel-top" },
      "watch-folders": { label: "Watch Folders", icon: "eye" }
    };
    return map[sectionId] || { label: sectionId, icon: "circle" };
  }

  renderHomeBookmarkGroups(parent) {
    const focus = this.plugin.getActiveFocus();
    if (focus && this.plugin.settings.focusFilterBookmarks !== false) {
      this.renderFocusFlatBookmarks(parent, focus);
      return;
    }

    const items = getBookmarkRootItems(this.app) || [];
    if (!items.length) {
      this.renderHomeEmpty(parent);
      return;
    }
    const orderedItems = this.orderRootBookmarkGroups(items);
    if (!orderedItems.length) {
      this.renderHomeEmpty(parent);
      return;
    }
    for (const item of orderedItems) this.renderBookmarkItem(parent, item, 0, "");
  }

  renderFocusFlatBookmarks(parent, focus) {
    this.renderFocusDrillView(parent, focus);
  }

  renderFocusDrillView(parent, focus) {
    const wrap = parent.createDiv({ cls: "sdn-focus-drill" });
    this.renderFocusDrillSection(wrap, focus, "sources", this.plugin.getFocusSectionLabel(focus, "sources"), "book-open");
    this.renderFocusDrillSection(wrap, focus, "work", this.plugin.getFocusSectionLabel(focus, "work"), "hammer");
    if (this.getFocusSectionSourcePaths(focus, "unfiled").length) {
      this.renderFocusDrillSection(wrap, focus, "unfiled", this.plugin.getFocusSectionLabel(focus, "unfiled"), "inbox");
    }
  }

  getFocusSectionSourcePaths(focus, sectionId) {
    const paths = new Set();
    if (sectionId === "sources") {
      for (const path of this.plugin.settings.focusGlobalItems || []) if (path) paths.add(path);
      for (const path of this.plugin.settings.focusGlobalSourceItems || []) if (path) paths.add(path);
      for (const path of focus.sourceItems || []) if (path) paths.add(path);
    } else if (sectionId === "work") {
      for (const path of this.plugin.settings.focusGlobalWorkItems || []) if (path) paths.add(path);
      for (const path of focus.workItems || []) if (path) paths.add(path);
    } else if (sectionId === "unfiled") {
      for (const path of this.plugin.settings.focusGlobalUnfiledItems || []) if (path) paths.add(path);
      for (const path of focus.unfiledItems || []) if (path) paths.add(path);
    }
    return Array.from(paths);
  }


  getFocusDrillItems(focus, sectionId) {
    const drillPath = this.focusDrillPaths && this.focusDrillPaths[sectionId];
    if (drillPath) {
      const folder = this.app.vault.getAbstractFileByPath(drillPath);
      if (folder instanceof TFolder) {
        return (folder.children || [])
          .filter(item => (item instanceof TFile || item instanceof TFolder) && !shouldHidePath(this.plugin, item.path))
          .map(af => ({ af, path: af.path, sourceLabel: folder.name, isDrillChild: true }));
      }
      this.focusDrillPaths[sectionId] = null;
    }
    return this.getFocusSectionSourcePaths(focus, sectionId)
      .map(path => this.app.vault.getAbstractFileByPath(path))
      .filter(af => (af instanceof TFile || af instanceof TFolder) && !shouldHidePath(this.plugin, af.path))
      .map(af => ({ af, path: af.path, sourceLabel: sectionId === "work" ? "Work" : "Sources" }));
  }

  renderFocusDrillSection(parent, focus, sectionId, label, icon) {
    const section = parent.createDiv({ cls: `sdn-focus-pane sdn-focus-pane-${sectionId}` });
    const header = section.createDiv({ cls: "sdn-focus-pane-header" });
    const left = header.createDiv({ cls: "sdn-focus-pane-heading" });
    const iconEl = left.createSpan({ cls: "sdn-focus-pane-icon" });
    setIcon(iconEl, icon);
    left.createSpan({ cls: "sdn-focus-pane-title", text: label });
    left.title = "Right-click to rename";
    this.attachContextMenu(left, (evt) => this.showFocusSectionMenu(evt, focus, sectionId, label));
    this.attachFocusSectionDrop(section, focus, sectionId);
    const drillPath = this.focusDrillPaths && this.focusDrillPaths[sectionId];
    if (drillPath) {
      const folder = this.app.vault.getAbstractFileByPath(drillPath);
      const back = header.createEl("button", { cls: "sdn-focus-back", attr: { "aria-label": `Back from ${folder ? folder.name : label}` } });
      setIcon(back, "chevron-left");
      back.createSpan({ text: folder ? folder.name : "Back" });
      back.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const current = this.app.vault.getAbstractFileByPath(drillPath);
        const sourcePaths = new Set(this.getFocusSectionSourcePaths(focus, sectionId));
        const parentPath = current && current.parent && current.parent.path;
        if (parentPath && !sourcePaths.has(drillPath) && this.app.vault.getAbstractFileByPath(parentPath) instanceof TFolder) this.focusDrillPaths[sectionId] = parentPath;
        else this.focusDrillPaths[sectionId] = null;
        this.render();
      };
    }
    const content = section.createDiv({ cls: "sdn-focus-pane-content" });
    const items = this.sortFocusFlatItems(this.getFocusDrillItems(focus, sectionId), "sources");
    if (!items.length) {
      content.createDiv({ cls: "sdn-home-empty", text: "Empty" });
      return;
    }
    for (const item of items) {
      if (item.af instanceof TFolder) this.renderFocusDrillFolder(content, item.af, sectionId);
      else if (item.af instanceof TFile) this.renderFocusDrillFile(content, item.af, sectionId);
    }
  }

  renderFocusDrillFolder(parent, folder, sectionId) {
    const row = parent.createDiv({ cls: "sdn-recent-item sdn-bookmark-item sdn-focus-drill-item is-folder", attr: { draggable: "true" } });
    this.attachFocusItemDrag(row, folder, sectionId);
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "folder");
    titleRow.createDiv({ cls: "sdn-note-title", text: folder.name });
    const count = Array.isArray(folder.children) ? folder.children.filter(child => !shouldHidePath(this.plugin, child.path)).length : 0;
    titleRow.createSpan({ cls: "sdn-folder-count", text: `(${count})` });
    row.onclick = (evt) => {
      evt.preventDefault();
      this.focusDrillPaths[sectionId] = folder.path;
      this.render();
    };
    this.attachContextMenu(row, (evt) => this.showFolderMenu(evt, folder));
  }

  renderFocusDrillFile(parent, file, sectionId) {
    const row = parent.createDiv({ cls: "sdn-recent-item sdn-bookmark-item sdn-focus-drill-item is-note", attr: { draggable: "true" } });
    this.attachFocusItemDrag(row, file, sectionId);
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "file-text");
    titleRow.createDiv({ cls: "sdn-note-title", text: file.basename });
    if (this.plugin.settings.showBookmarksLocation !== false && file.parent && file.parent.path) row.createDiv({ cls: "sdn-focus-source-label", text: file.parent.path });
    row.onclick = () => this.plugin.openFile(file);
    this.attachContextMenu(row, (evt) => this.showFileMenu(evt, file));
  }

  attachFocusItemDrag(row, af, sectionId) {
    if (!row || !af || !af.path) return;
    row.addEventListener("dragstart", (evt) => {
      this.dragFocusItem = { path: af.path, sectionId };
      row.addClass("is-dragging");
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", af.path);
      }
    });
    row.addEventListener("dragend", () => {
      row.removeClass("is-dragging");
      this.dragFocusItem = null;
    });
  }

  attachFocusSectionDrop(section, focus, sectionId) {
    if (!section) return;
    section.addEventListener("dragover", (evt) => {
      const path = this.dragFocusItem && this.dragFocusItem.path;
      if (!path) return;
      evt.preventDefault();
      if (evt.dataTransfer) evt.dataTransfer.dropEffect = "move";
      section.addClass("sdn-drop-target");
    });
    section.addEventListener("dragleave", () => section.removeClass("sdn-drop-target"));
    section.addEventListener("drop", async (evt) => {
      const path = (this.dragFocusItem && this.dragFocusItem.path) || (evt.dataTransfer && evt.dataTransfer.getData("text/plain"));
      if (!path) return;
      evt.preventDefault();
      evt.stopPropagation();
      section.removeClass("sdn-drop-target");
      const focusId = focus && focus.id ? focus.id : "global";
      await this.plugin.setFocusSectionMembership(path, focusId, sectionId, true);
    });
  }

  showFocusSectionMenu(evt, focus, sectionId, label) {
    const menu = new Menu();
    menu.addItem(item => item
      .setTitle(`Rename ${label}`)
      .setIcon("pencil")
      .onClick(() => {
        const focusId = focus && focus.id ? focus.id : "global";
        new TextInputModal(this.app, `Rename ${label}`, label, label, async (value) => {
          if (!value) return;
          await this.plugin.renameFocusSection(focusId, sectionId, value);
        }).open();
      }));
    menu.showAtMouseEvent(evt);
  }

  getFocusFlatBookmarkItems(focus) {
    const byPath = new Map();
    const addPath = (path, source = "focus", sourceLabel = "Focus") => {
      if (!path || byPath.has(path)) return;
      const af = this.app.vault.getAbstractFileByPath(path);
      if (!(af instanceof TFile) && !(af instanceof TFolder)) return;
      if (shouldHidePath(this.plugin, af.path)) return;
      byPath.set(path, { path, af, source, sourceLabel });
    };
    for (const path of this.plugin.getFocusItemPaths(focus)) addPath(path, "focus", "Focus");
    for (const entry of this.getBookmarkEntriesForFocus(focus)) addPath(entry.path, "bookmark-group", entry.groupName || "Bookmarks");
    return Array.from(byPath.values());
  }

  getFocusFlattenedFileItems(focus) {
    const byPath = new Map();
    const limit = Number.isFinite(this.plugin.settings.focusFlattenSourceLimit) ? this.plugin.settings.focusFlattenSourceLimit : 250;
    const addFile = (file, source, sourceLabel) => {
      if (!(file instanceof TFile) || byPath.has(file.path)) return;
      if (shouldHidePath(this.plugin, file.path)) return;
      byPath.set(file.path, { path: file.path, af: file, source, sourceLabel });
    };
    const addSourcePath = (path, source = "focus", sourceLabel = "Focus") => {
      if (!path || byPath.size >= limit) return;
      const af = this.app.vault.getAbstractFileByPath(path);
      if (af instanceof TFile) addFile(af, source, sourceLabel);
      if (af instanceof TFolder) {
        for (const file of this.collectFocusFolderFiles(af, limit - byPath.size)) addFile(file, source, sourceLabel || af.name);
      }
    };
    for (const path of this.plugin.getFocusItemPaths(focus)) {
      const af = this.app.vault.getAbstractFileByPath(path);
      addSourcePath(path, "focus", af instanceof TFolder ? af.name : "Focus");
    }
    for (const entry of this.getBookmarkEntriesForFocus(focus)) addSourcePath(entry.path, "bookmark-group", entry.groupName || "Bookmarks");
    return Array.from(byPath.values());
  }

  collectFocusFolderFiles(folder, limit = 250) {
    const out = [];
    const walk = (node) => {
      if (!node || out.length >= limit) return;
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        if (out.length >= limit) break;
        if (child instanceof TFile && child.extension === "md" && !shouldHidePath(this.plugin, child.path)) out.push(child);
        else if (child instanceof TFolder && !shouldHidePath(this.plugin, child.path)) walk(child);
      }
    };
    walk(folder);
    return out;
  }

  getBookmarkEntriesForFocus(focus) {
    const entries = [];
    if (!focus || !Array.isArray(focus.visibleBookmarkGroups) || !focus.visibleBookmarkGroups.length) return entries;
    const groups = new Set(focus.visibleBookmarkGroups);
    const walk = (items, groupName) => {
      for (const item of items || []) {
        if (item && item.path) entries.push({ path: item.path, groupName });
        const children = getBookmarkChildren(item);
        if (children && children.length) walk(children, groupName);
      }
    };
    for (const item of getBookmarkRootItems(this.app) || []) {
      const key = item && (item.title || item.name || item.path || "Untitled");
      if (isBookmarkGroupItem(item) && groups.has(key)) walk(getBookmarkChildren(item), key);
      else if (!isBookmarkGroupItem(item) && groups.has(key) && item.path) entries.push({ path: item.path, groupName: key });
    }
    return entries;
  }

  sortFocusFlatItems(items, mode = "sources") {
    return [...items].sort((a, b) => {
      if (mode !== "flattened") {
        const rank = (item) => item.af instanceof TFolder ? 0 : 1;
        const typeRank = rank(a) - rank(b);
        if (typeRank) return typeRank;
      }
      return this.compareHomeAbstractFiles(a.af, b.af, this.getBookmarksItemSort());
    });
  }

  renderFocusFlatFile(parent, file, item = {}) {
    const row = parent.createDiv({ cls: "sdn-recent-item sdn-bookmark-item sdn-focus-flat-item is-note" });
    row.style.setProperty("--sdn-depth", "0");
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    titleRow.createSpan({ cls: "sdn-bookmark-caret-spacer", attr: { "aria-hidden": "true" } });
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "file-text");
    titleRow.createDiv({ cls: "sdn-note-title", text: file.basename });
    const label = item.sourceLabel || (file.parent && file.parent.name) || "";
    if (label) row.createDiv({ cls: "sdn-focus-source-label", text: label });
    else if (this.plugin.settings.showBookmarksLocation !== false && file.parent && file.parent.path) row.createDiv({ cls: "sdn-location sdn-home-location", text: file.parent.path });
    row.onclick = () => this.plugin.openFile(file);
    this.attachContextMenu(row, (evt) => this.showFileMenu(evt, file));
  }

  renderFocusFlatFolder(parent, folder, item = {}) {
    const row = parent.createDiv({ cls: "sdn-recent-item sdn-bookmark-item sdn-focus-flat-item is-folder" });
    row.style.setProperty("--sdn-depth", "0");
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    titleRow.createSpan({ cls: "sdn-bookmark-caret-spacer", attr: { "aria-hidden": "true" } });
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "folder");
    const name = titleRow.createDiv({ cls: "sdn-note-title sdn-bookmark-folder-link", text: folder.name });
    name.setAttr("title", "Reveal in Files");
    const label = item.sourceLabel || "Source folder";
    if (label) row.createDiv({ cls: "sdn-focus-source-label", text: label });
    row.onclick = () => this.revealFolderInFiles(folder, true);
    this.attachContextMenu(row, (evt) => this.showFolderMenu(evt, folder));
  }

  orderRootBookmarkGroups(items) {
    const manual = Array.isArray(this.plugin.settings.bookmarkGroupOrder) ? this.plugin.settings.bookmarkGroupOrder : [];
    if (!manual.length) return this.sortBookmarkChildren(items);
    const index = new Map(manual.map((key, i) => [key, i]));
    return [...items].sort((a, b) => {
      const ak = a.title || a.name || "Untitled";
      const bk = b.title || b.name || "Untitled";
      const ai = index.has(ak) ? index.get(ak) : Number.MAX_SAFE_INTEGER;
      const bi = index.has(bk) ? index.get(bk) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return 0;
    });
  }

  sortBookmarkChildren(items) {
    const sort = this.getBookmarksItemSort();
    return this.filterRedundantBookmarkItems(items).sort((a, b) => this.compareBookmarkItems(a, b, sort));
  }

  filterRedundantBookmarkItems(items) {
    if (this.plugin.settings.hideRedundantBookmarks === false) return [...(items || [])];
    const folderPaths = this.getAllBookmarkedFolderPaths();
    if (!folderPaths.length) return [...(items || [])];
    return [...(items || [])].filter(item => !this.isRedundantBookmarkItem(item, folderPaths));
  }

  getAllBookmarkedFolderPaths() {
    const paths = new Set();
    const walk = (items) => {
      for (const item of items || []) {
        if (item && item.path) {
          const af = this.app.vault.getAbstractFileByPath(item.path);
          if (af instanceof TFolder && !shouldHidePath(this.plugin, af.path)) paths.add(af.path);
        }
        const children = getBookmarkChildren(item);
        if (children && children.length) walk(children);
      }
    };
    walk(getBookmarkRootItems(this.app) || []);
    return Array.from(paths).sort((a, b) => a.length - b.length);
  }

  isRedundantBookmarkItem(item, folderPaths) {
    if (!item || !item.path) return false;
    const af = this.app.vault.getAbstractFileByPath(item.path);
    if (!(af instanceof TFile) && !(af instanceof TFolder)) return false;
    return folderPaths.some(folderPath => item.path !== folderPath && item.path.startsWith(folderPath + "/"));
  }

  compareBookmarkItems(a, b, sort) {
    const folderFirst = this.getBookmarkItemTypeRank(a) - this.getBookmarkItemTypeRank(b);
    if (folderFirst) return folderFirst;
    const aName = this.getBookmarkSortName(a);
    const bName = this.getBookmarkSortName(b);
    if (sort === "name-desc") return bName.localeCompare(aName);
    if (sort === "name-asc") return aName.localeCompare(bName);
    const direction = sort.endsWith("-asc") ? 1 : -1;
    const baseSort = sort.startsWith("created") ? "created" : "modified";
    const aTime = this.getBookmarkSortTime(a, baseSort);
    const bTime = this.getBookmarkSortTime(b, baseSort);
    if (aTime !== bTime) return direction * (aTime - bTime);
    return aName.localeCompare(bName);
  }

  getBookmarkItemTypeRank(item) {
    if (!item) return 2;
    if (isBookmarkGroupItem(item)) return 0;
    if (item.path) {
      const af = this.app.vault.getAbstractFileByPath(item.path);
      if (af instanceof TFolder) return 0;
      if (af instanceof TFile) return 1;
    }
    return 2;
  }

  getBookmarkSortName(item) {
    return (item && (item.title || item.name || item.path) || "Untitled").toLowerCase();
  }

  getBookmarkSortTime(item, sort) {
    const children = getBookmarkChildren(item);
    if (item && item.path) {
      const af = this.app.vault.getAbstractFileByPath(item.path);
      if (af && af.stat) return sort === "created" ? af.stat.ctime || 0 : af.stat.mtime || 0;
    }
    if (!children.length) return 0;
    const times = children.map(child => this.getBookmarkSortTime(child, sort)).filter(Boolean);
    if (!times.length) return 0;
    return sort === "created" ? Math.min(...times) : Math.max(...times);
  }

  sortFilesForHome(files) {
    const sort = this.getBookmarksItemSort();
    return [...files].sort((a, b) => this.compareHomeAbstractFiles(a, b, sort));
  }

  compareHomeAbstractFiles(a, b, sort) {
    const aName = (a && (a.basename || a.name) || "").toLowerCase();
    const bName = (b && (b.basename || b.name) || "").toLowerCase();
    if (sort === "name-desc") return bName.localeCompare(aName);
    if (sort === "name-asc") return aName.localeCompare(bName);
    const direction = sort.endsWith("-asc") ? 1 : -1;
    const useCreated = sort.startsWith("created");
    const aTime = a && a.stat ? (useCreated ? a.stat.ctime : a.stat.mtime) : 0;
    const bTime = b && b.stat ? (useCreated ? b.stat.ctime : b.stat.mtime) : 0;
    if (aTime !== bTime) return direction * (aTime - bTime);
    return aName.localeCompare(bName);
  }

  renderHomePinnedNotes(parent) {
    const files = this.sortFilesForHome(this.plugin.getPinnedNoteFiles());
    if (!files.length) {
      this.renderHomeEmpty(parent);
      return;
    }
    for (const file of files) this.renderHomeNoteItem(parent, file, { pinned: true });
  }

  renderHomeNoteItem(parent, file, options = {}) {
    const row = parent.createDiv({ cls: `sdn-recent-item sdn-home-note-item ${options.pinned ? "is-pinned" : ""}` });
    const titleRow = row.createDiv({ cls: "sdn-note-title-row" });
    if (options.pinned) {
      const pinIcon = titleRow.createSpan({ cls: "sdn-pin-icon", attr: { "aria-label": "Pinned note" } });
      setIcon(pinIcon, "pin");
    }
    titleRow.createDiv({ cls: "sdn-note-title", text: file.basename });
    const loc = file.parent ? file.parent.path : "/";
    if (this.plugin.settings.showBookmarksLocation !== false && loc && loc !== "/") row.createDiv({ cls: "sdn-location sdn-home-location", text: loc });
    row.onclick = () => this.plugin.openFile(file);
    this.attachContextMenu(row, (evt) => this.showRecentItemMenu(evt, file));
  }

  renderHomeOpenTabs(parent) {
    const files = this.sortFilesForHome(this.getOpenMarkdownFiles());
    if (!files.length) {
      this.renderHomeEmpty(parent);
      return;
    }
    for (const file of files) {
      const row = parent.createDiv({ cls: "sdn-recent-item sdn-home-note-item sdn-open-tab-item" });
      const titleRow = row.createDiv({ cls: "sdn-note-title-row" });
      const fileIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
      setIcon(fileIcon, "file-text");
      titleRow.createDiv({ cls: "sdn-note-title", text: file.basename });
      const loc = file.parent ? file.parent.path : "/";
      if (this.plugin.settings.showBookmarksLocation !== false && loc && loc !== "/") row.createDiv({ cls: "sdn-location sdn-home-location", text: loc });
      row.onclick = () => this.activateOpenFile(file);
      this.attachContextMenu(row, (evt) => this.showFileMenu(evt, file));
    }
  }

  getOpenMarkdownFiles() {
    const seen = new Set();
    const files = [];
    const leaves = this.app.workspace.getLeavesOfType("markdown") || [];
    for (const leaf of leaves) {
      const file = leaf && leaf.view && leaf.view.file;
      if (!(file instanceof TFile) || file.extension !== "md") continue;
      if (shouldHidePath(this.plugin, file.path) || seen.has(file.path)) continue;
      seen.add(file.path);
      files.push(file);
    }
    return files;
  }

  activateOpenFile(file) {
    const leaves = this.app.workspace.getLeavesOfType("markdown") || [];
    for (const leaf of leaves) {
      if (leaf && leaf.view && leaf.view.file && leaf.view.file.path === file.path) {
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
        return;
      }
    }
    this.plugin.openFile(file);
  }

  renderHomeWatchFolders(parent) {
    const focusWatchFolders = this.plugin.getFocusWatchFolders();
    const watchedPaths = this.plugin.getWatchedFolderPaths().filter(path => !focusWatchFolders || focusWatchFolders.has(path));
    const folders = this.sortFilesForHome(watchedPaths
      .map(path => this.app.vault.getAbstractFileByPath(path))
      .filter(folder => folder instanceof TFolder && !shouldHidePath(this.plugin, folder.path)), "watch-folders");

    if (!folders.length) {
      this.renderHomeEmpty(parent);
      return;
    }

    for (const folder of folders) {
      const row = parent.createDiv({ cls: "sdn-tree-row sdn-folder-row sdn-home-watch-row" });
      row.dataset.path = folder.path;
      row.dataset.type = "folder";
      const icon = row.createSpan({ cls: "sdn-tree-caret" });
      setIcon(icon, "folder");
      row.createSpan({ cls: "sdn-folder-name", text: folder.name || folder.path });
      const count = this.getFolderFileCount(folder);
      if (this.plugin.settings.showWatchIndicator !== false) {
        if (count > 0) {
          row.createSpan({ cls: "sdn-watch-dot", attr: { "aria-label": "Watched folder contains files" } });
        } else if (this.plugin.settings.showEmptyWatchFolderStatus !== false) {
          row.createSpan({ cls: "sdn-watch-dot sdn-watch-dot-empty", attr: { "aria-label": "Watched folder is empty" } });
        }
      }
      if (this.plugin.settings.showBookmarksInfo !== false && (count > 0 || this.plugin.settings.showZeroWatchCounts !== false)) row.createSpan({ cls: "sdn-watch-count", text: `(${count})` });
      row.onclick = () => {
        this.mode = "files";
        expandAncestors(this.expanded, folder.path);
        this.expanded.add(folder.path);
        this.render();
      };
      this.attachContextMenu(row, (evt) => this.showFolderMenu(evt, folder));
    }
  }

  renderBookmarkGroupEmpty(parent, depth = 1) {
    const empty = parent.createDiv({ cls: "sdn-home-empty sdn-bookmark-group-empty", text: "Empty" });
    empty.style.setProperty("--sdn-depth", String(depth));
  }

  isBookmarkFolderCollapsed(path) {
    const expanded = Array.isArray(this.plugin.settings.expandedBookmarkFolders) ? this.plugin.settings.expandedBookmarkFolders : [];
    return !expanded.includes(path);
  }

  async toggleBookmarkFolder(path) {
    const expanded = new Set(Array.isArray(this.plugin.settings.expandedBookmarkFolders) ? this.plugin.settings.expandedBookmarkFolders : []);
    if (expanded.has(path)) expanded.delete(path);
    else expanded.add(path);
    this.plugin.settings.expandedBookmarkFolders = Array.from(expanded);
    await this.plugin.saveSettings();
    this.render();
  }

  getBookmarkFolderPaths() {
    const paths = new Set();
    const walkItems = (items) => {
      for (const item of items || []) {
        const children = getBookmarkChildren(item);
        if (item && item.path) {
          const af = this.app.vault.getAbstractFileByPath(item.path);
          if (af instanceof TFolder && !shouldHidePath(this.plugin, af.path)) {
            paths.add(af.path);
            this.collectChildFolderPaths(af, paths);
          }
        }
        if (children && children.length) walkItems(children);
      }
    };
    walkItems(getBookmarkRootItems(this.app) || []);
    return Array.from(paths);
  }

  collectChildFolderPaths(folder, paths) {
    for (const child of folder.children || []) {
      if (!(child instanceof TFolder) || shouldHide(child)) continue;
      paths.add(child.path);
      this.collectChildFolderPaths(child, paths);
    }
  }

  async toggleAllBookmarkFolders() {
    const paths = this.getBookmarkFolderPaths();
    const expanded = new Set(Array.isArray(this.plugin.settings.expandedBookmarkFolders) ? this.plugin.settings.expandedBookmarkFolders : []);
    const allExpanded = paths.length > 0 && paths.every(path => expanded.has(path));
    this.plugin.settings.expandedBookmarkFolders = allExpanded ? [] : paths;
    await this.plugin.saveSettings();
    this.render();
  }

  revealFolderInFiles(folder, flash = true) {
    if (!(folder instanceof TFolder)) return;
    this.mode = "files";
    this.revealedPath = folder.path;
    expandAncestors(this.expanded, folder.path);
    this.expanded.add(folder.path);
    this.render();
    window.setTimeout(() => {
      const row = [...this.containerEl.querySelectorAll(".sdn-tree-row")].find(el => el.dataset && el.dataset.path === folder.path);
      if (!row) return;
      row.scrollIntoView({ block: "center", inline: "nearest" });
      if (flash) {
        row.addClass("sdn-revealed-file");
        row.addClass("sdn-revealed-from-bookmark");
        window.setTimeout(() => {
          row.removeClass("sdn-revealed-file");
          row.removeClass("sdn-revealed-from-bookmark");
        }, 1600);
      }
    }, 0);
  }

  renderBookmarkFolderContents(parent, folder, depth) {
    const children = (folder.children || []).filter(child => !shouldHide(child));
    const visible = children.filter(child => child instanceof TFolder || (child instanceof TFile && ["md", "canvas", "base"].includes(child.extension)));
    if (!visible.length) {
      this.renderBookmarkGroupEmpty(parent, depth);
      return;
    }
    const sorted = this.sortBookmarkFolderChildren(visible);
    for (const child of sorted) {
      this.renderBookmarkFileSystemItem(parent, child, depth, true);
    }
  }

  sortBookmarkFolderChildren(children) {
    return [...children].sort((a, b) => {
      const foldersFirst = a instanceof TFolder && !(b instanceof TFolder) ? -1 : (!(a instanceof TFolder) && b instanceof TFolder ? 1 : 0);
      if (foldersFirst) return foldersFirst;
      return this.compareBookmarkFileSystemItems(a, b);
    });
  }

  compareBookmarkFileSystemItems(a, b) {
    const sort = this.getBookmarksItemSort();
    const aName = a instanceof TFile ? a.basename : a.name;
    const bName = b instanceof TFile ? b.basename : b.name;
    const aCreated = a instanceof TFile ? (a.stat && a.stat.ctime) || 0 : this.getTreeItemMtime(a);
    const bCreated = b instanceof TFile ? (b.stat && b.stat.ctime) || 0 : this.getTreeItemMtime(b);
    const aModified = this.getTreeItemMtime(a);
    const bModified = this.getTreeItemMtime(b);
    switch (sort) {
      case "name-desc": return bName.localeCompare(aName);
      case "modified-desc": return bModified - aModified || aName.localeCompare(bName);
      case "modified-asc": return aModified - bModified || aName.localeCompare(bName);
      case "created-desc": return bCreated - aCreated || aName.localeCompare(bName);
      case "created-asc": return aCreated - bCreated || aName.localeCompare(bName);
      case "name-asc":
      default: return aName.localeCompare(bName);
    }
  }

  renderBookmarkFileSystemItem(parent, af, depth, fromFolderContents = false) {
    if (af instanceof TFolder) {
      this.renderBookmarkFolderRow(parent, af, depth, true);
      return;
    }
    if (!(af instanceof TFile)) return;
    const row = parent.createDiv({ cls: `sdn-recent-item sdn-bookmark-item sdn-bookmark-fs-item sdn-bookmark-depth-${depth} is-note ${fromFolderContents ? "is-folder-child" : ""}` });
    row.style.setProperty("--sdn-depth", String(depth));
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    titleRow.createSpan({ cls: "sdn-bookmark-caret-spacer", attr: { "aria-hidden": "true" } });
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "file-text");
    titleRow.createDiv({ cls: "sdn-note-title", text: af.basename });
    if (this.plugin.settings.showBookmarksLocation !== false && af.parent && af.parent.path) row.createDiv({ cls: "sdn-location sdn-home-location", text: af.parent.path });
    row.onclick = () => this.plugin.openFile(af);
    this.attachContextMenu(row, (evt) => this.showFileMenu(evt, af));
  }

  renderBookmarkFolderRow(parent, folder, depth, fromFolderContents = false) {
    const collapsed = this.isBookmarkFolderCollapsed(folder.path);
    const row = parent.createDiv({ cls: `sdn-recent-item sdn-bookmark-item sdn-bookmark-folder-row sdn-bookmark-depth-${depth} is-folder ${fromFolderContents ? "is-folder-child" : ""}` });
    row.style.setProperty("--sdn-depth", String(depth));
    row.setAttr("aria-expanded", collapsed ? "false" : "true");
    const titleRow = row.createDiv({ cls: "sdn-bookmark-title-row" });
    const caret = titleRow.createSpan({ cls: "sdn-bookmark-inline-caret", attr: { "aria-label": collapsed ? "Expand folder" : "Collapse folder" } });
    setIcon(caret, collapsed ? "chevron-right" : "chevron-down");
    const itemIcon = titleRow.createSpan({ cls: "sdn-bookmark-item-icon", attr: { "aria-hidden": "true" } });
    setIcon(itemIcon, "folder");
    const name = titleRow.createDiv({ cls: "sdn-note-title sdn-bookmark-folder-link", text: folder.name });
    name.setAttr("title", "Reveal in Files");

    caret.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.toggleBookmarkFolder(folder.path);
    };
    name.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.revealFolderInFiles(folder, true);
    };
    row.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.toggleBookmarkFolder(folder.path);
    };
    this.attachContextMenu(row, (evt) => this.showFolderMenu(evt, folder));
    if (!collapsed) this.renderBookmarkFolderContents(parent, folder, depth + 1);
  }

  renderBookmarkItem(parent, item, depth = 0, groupPath = "") {
    if (!item) return;
    const children = getBookmarkChildren(item);
    const title = item.title || item.name || "Untitled";
    const key = groupPath ? `${groupPath}/${title}` : title;

    if (isBookmarkGroupItem(item)) {
      const collapsed = this.isBookmarkGroupCollapsed(key);
      const row = parent.createDiv({ cls: `sdn-bookmark-group sdn-tree-row sdn-bookmark-depth-${depth}` });
      row.style.setProperty("--sdn-depth", String(depth));
      row.setAttr("role", "button");
      row.setAttr("aria-expanded", collapsed ? "false" : "true");
      row.dataset.bookmarkGroup = key;
      if (depth === 0) this.attachBookmarkGroupDrag(row, key);

      const caret = row.createSpan({ cls: "sdn-tree-caret" });
      setIcon(caret, collapsed ? "chevron-right" : "chevron-down");

      const label = row.createSpan({ cls: "sdn-tree-name", text: title });
      if (this.plugin.settings.showBookmarksInfo !== false) row.createSpan({ cls: "sdn-folder-count sdn-bookmark-group-count", text: `(${countBookmarkLeafItems(children)})` });

      row.onclick = async (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        await this.toggleBookmarkGroup(key);
      };

      this.attachContextMenu(row, (evt) => this.showBookmarkGroupMenu(evt, item, key));

      if (!collapsed) {
        if (children.length) {
          for (const child of this.sortBookmarkChildren(children)) this.renderBookmarkItem(parent, child, depth + 1, key);
        } else {
          this.renderBookmarkGroupEmpty(parent, depth + 1);
        }
      }
      return;
    }

    const path = item.path;
    if (!path) return;
    const af = this.app.vault.getAbstractFileByPath(path);
    if (!af) return;

    if (af instanceof TFolder) {
      this.renderBookmarkFolderRow(parent, af, depth, false);
      return;
    }

    if (af instanceof TFile) {
      this.renderBookmarkFileSystemItem(parent, af, depth);
    }
  }

  attachBookmarkGroupDrag(row, key) {
    row.draggable = true;
    row.addClass("sdn-bookmark-group-draggable");
    row.addEventListener("dragstart", (evt) => {
      this.dragBookmarkGroupKey = key;
      row.addClass("sdn-dragging");
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("application/x-navigator-bookmark-group", key);
      }
    });
    row.addEventListener("dragend", () => {
      row.removeClass("sdn-dragging");
      this.dragBookmarkGroupKey = null;
      this.containerEl.querySelectorAll(".sdn-bookmark-group.sdn-drop-target").forEach(el => el.removeClass("sdn-drop-target"));
    });
    row.addEventListener("dragover", (evt) => {
      if (!this.dragBookmarkGroupKey || this.dragBookmarkGroupKey === key) return;
      evt.preventDefault();
      row.addClass("sdn-drop-target");
    });
    row.addEventListener("dragleave", () => row.removeClass("sdn-drop-target"));
    row.addEventListener("drop", async (evt) => {
      if (!this.dragBookmarkGroupKey || this.dragBookmarkGroupKey === key) return;
      evt.preventDefault();
      evt.stopPropagation();
      await this.plugin.moveBookmarkGroup(this.dragBookmarkGroupKey, key);
    });
  }

  isBookmarkGroupCollapsed(key) {
    const groups = Array.isArray(this.plugin.settings.collapsedBookmarkGroups) ? this.plugin.settings.collapsedBookmarkGroups : [];
    return groups.includes(key);
  }

  async toggleBookmarkGroup(key) {
    const groups = new Set(Array.isArray(this.plugin.settings.collapsedBookmarkGroups) ? this.plugin.settings.collapsedBookmarkGroups : []);
    if (groups.has(key)) groups.delete(key);
    else groups.add(key);
    this.plugin.settings.collapsedBookmarkGroups = Array.from(groups);
    await this.plugin.saveSettings();
    this.render();
  }

  async createBookmarkGroupFromHeader() {
    try {
      const name = await this.askText("New bookmark group", "Group name");
      if (!name) return;
      await addBookmarkGroup(this.app, name.trim());
      this.render();
      new Notice(`Created bookmark group: ${name.trim()}`);
    } catch (e) {
      console.error("Lighthouse bookmark group failed", e);
      new Notice(`Bookmark group failed: ${e.message || e}`);
    }
  }

  showBookmarkGroupMenu(evt, item, key) {
    const menu = new Menu();
    menu.addItem(i => i
      .setTitle(this.isBookmarkGroupCollapsed(key) ? "Expand group" : "Collapse group")
      .setIcon(this.isBookmarkGroupCollapsed(key) ? "chevron-down" : "chevron-right")
      .onClick(() => this.toggleBookmarkGroup(key)));
    this.showMenu(menu, evt);
  }

  async askText(title, placeholder, value = "") {
    return await new Promise(resolve => {
      const modal = new TextInputModal(this.app, title, placeholder, value, resolve);
      modal.open();
    });
  }

  getUntitledName(extension) {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    if (extension === "canvas") return `Canvas ${stamp}`;
    if (extension === "base") return `Base ${stamp}`;
    return `Untitled ${stamp}`;
  }

  async createNewFile(folderPath, name, extension, content) {
    const folder = normalizePath(folderPath || "");
    if (folder) await ensureFolder(this.app, folder);

    const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cleanName = name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(new RegExp(`\\.${escapedExtension}$`, "i"), "");

    let path = normalizePath(folder ? `${folder}/${cleanName}.${extension}` : `${cleanName}.${extension}`);
    let n = 2;

    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(folder ? `${folder}/${cleanName} ${n}.${extension}` : `${cleanName} ${n}.${extension}`);
      n++;
    }

    return await this.app.vault.create(path, content);
  }

  showBackgroundFilesMenu(evt) {
    const menu = new Menu();

    menu.addItem(i => i
      .setTitle("New note")
      .setIcon("file-plus")
      .onClick(async () => {
        new Notice("Lighthouse: New note");
        await this.plugin.createNewNote(this.plugin.settings.defaultNewNoteFolder);
        this.render();
      }));

    menu.addItem(i => i
      .setTitle("New folder")
      .setIcon("folder-plus")
      .onClick(async () => {
        try {
          new Notice("Lighthouse: New folder");
          const base = normalizePath(this.plugin.settings.defaultNewNoteFolder || "");
          const name = await this.askText("New folder", "Folder name");
          if (!name) return;
          const newPath = normalizePath(base ? `${base}/${name}` : name);
          await ensureFolder(this.app, newPath);
          if (base) this.expanded.add(base);
          this.render();
          new Notice(`Created folder: ${newPath}`);
        } catch (e) {
          console.error("Lighthouse new folder failed", e);
          new Notice(`New folder failed: ${e.message || e}`);
        }
      }));

    menu.addItem(i => i
      .setTitle("New canvas")
      .setIcon("layout-dashboard")
      .onClick(async () => {
        try {
          const base = normalizePath(this.plugin.settings.defaultNewNoteFolder || "");
          const name = this.getUntitledName("canvas");
          const file = await this.createNewFile(base, name, "canvas", JSON.stringify({ nodes: [], edges: [] }, null, 2));
          if (base) this.expanded.add(base);
          this.render();
          await this.plugin.openFile(file, true);
        } catch (e) {
          console.error("Lighthouse new canvas failed", e);
          new Notice(`New canvas failed: ${e.message || e}`);
        }
      }));

    menu.addItem(i => i
      .setTitle("New base")
      .setIcon("database")
      .onClick(async () => {
        try {
          const base = normalizePath(this.plugin.settings.defaultNewNoteFolder || "");
          const name = this.getUntitledName("base");
          const file = await this.createNewFile(base, name, "base", "");
          if (base) this.expanded.add(base);
          this.render();
          await this.plugin.openFile(file, true);
        } catch (e) {
          console.error("Lighthouse new base failed", e);
          new Notice(`New base failed: ${e.message || e}`);
        }
      }));

    menu.addSeparator();

    menu.addItem(i => i
      .setTitle("Add command")
      .setIcon("plus-circle")
      .onClick(() => {
        if (!this.runCommandLike(["command palette"])) {
          new Notice("Open the command palette to add/run a command.");
        }
      }));

    this.showMenu(menu, evt);
  }

  runCommandLike(names) {
    try {
      const commands = this.app.commands && this.app.commands.commands;
      if (!commands) return false;

      const wanted = names.map(n => n.toLowerCase());

      // First pass: exact-ish command names
      for (const id of Object.keys(commands)) {
        const cmd = commands[id];
        const name = (cmd.name || "").toLowerCase();
        if (wanted.some(w => name === w || name.endsWith(": " + w))) {
          this.app.commands.executeCommandById(id);
          return true;
        }
      }

      // Second pass: contains all words
      for (const id of Object.keys(commands)) {
        const cmd = commands[id];
        const name = (cmd.name || "").toLowerCase();
        if (wanted.some(w => w.split(/\s+/).every(part => name.includes(part)))) {
          this.app.commands.executeCommandById(id);
          return true;
        }
      }
    } catch (e) {
      console.warn("Lighthouse command lookup failed", e);
    }
    return false;
  }


  addFocusMembershipMenu(menu, af, evt) {
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    if (!af || !af.path || !focuses.length) return;
    menu.addItem(i => {
      i.setTitle("Add to Focus").setIcon("list-filter");
      this.addSubmenuItems(i, evt, submenu => {
        const globalAlready = this.plugin.isItemInFocus(af.path, "global");
        submenu.addItem(item => item
          .setTitle(`${globalAlready ? "✓ " : ""}Global`)
          .setIcon("asterisk")
          .onClick(async () => {
            await this.plugin.setFocusItemMembership(af.path, "global", !globalAlready);
            new Notice(globalAlready ? `Removed ${af.name} from Global` : `Added ${af.name} to Global`);
          }));
        submenu.addSeparator();
        for (const focus of focuses) {
          const already = this.plugin.isItemInFocus(af.path, focus.id);
          submenu.addItem(item => item
            .setTitle(`${already ? "✓ " : ""}${focus.name}`)
            .setIcon("crosshair")
            .onClick(async () => {
              await this.plugin.setFocusItemMembership(af.path, focus.id, !already);
              new Notice(already ? `Removed ${af.name} from ${focus.name}` : `Added ${af.name} to ${focus.name}`);
            }));
        }
      }, () => this.showFocusMembershipMenu(evt, af));
    });
  }

  showFocusMembershipMenu(evt, af) {
    const menu = new Menu();
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    const globalAlready = this.plugin.isItemInFocus(af.path, "global");
    menu.addItem(item => item
      .setTitle(`${globalAlready ? "✓ " : ""}Global`)
      .setIcon("asterisk")
      .onClick(async () => {
        await this.plugin.setFocusItemMembership(af.path, "global", !globalAlready);
        new Notice(globalAlready ? `Removed ${af.name} from Global` : `Added ${af.name} to Global`);
      }));
    if (focuses.length) menu.addSeparator();
    for (const focus of focuses) {
      const already = this.plugin.isItemInFocus(af.path, focus.id);
      menu.addItem(item => item
        .setTitle(`${already ? "✓ " : ""}${focus.name}`)
        .setIcon("crosshair")
        .onClick(async () => {
          await this.plugin.setFocusItemMembership(af.path, focus.id, !already);
          new Notice(already ? `Removed ${af.name} from ${focus.name}` : `Added ${af.name} to ${focus.name}`);
        }));
    }
    this.showMenu(menu, evt);
  }

  addFocusSectionAssignmentMenu(menu, af, evt) {
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    if (!af || !af.path || !focuses.length) return;
    menu.addItem(i => {
      i.setTitle("Assign to Focus section").setIcon("panel-top");
      this.addSubmenuItems(i, evt, submenu => {
        this.addFocusSectionSubmenuItems(submenu, af);
      }, () => this.showFocusSectionAssignmentMenu(evt, af));
    });
  }

  addFocusSectionSubmenuItems(menu, af) {
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    for (const focus of focuses) {
      menu.addItem(item => item.setTitle(focus.name).setIcon("crosshair").setDisabled && item.setDisabled(true));
      for (const [sectionId, label, icon] of [["sources", "Sources", "book-open"], ["work", "Work", "hammer"]]) {
        const already = this.plugin.isItemInFocusSection(af.path, focus.id, sectionId);
        menu.addItem(item => {
          item.setTitle(`${already ? "✓ " : ""}${label}`);
          item.setIcon(icon);
          item.onClick(async () => {
            await this.plugin.setFocusSectionMembership(af.path, focus.id, sectionId, !already);
            new Notice(already ? `Removed ${af.name} from ${focus.name} ${label}` : `Added ${af.name} to ${focus.name} ${label}`);
          });
        });
      }
      menu.addSeparator();
    }
  }

  showFocusSectionAssignmentMenu(evt, af) {
    const menu = new Menu();
    this.addFocusSectionSubmenuItems(menu, af);
    this.showMenu(menu, evt);
  }

  addFileMenuActions(menu, file) {
    menu.addItem(i => i
      .setTitle("Open")
      .setIcon("file")
      .onClick(() => this.plugin.openFile(file)));

    if (file instanceof TFile && file.extension === "md") {
      const isPinned = this.plugin.isPinnedFile(file);
      menu.addItem(i => i
        .setTitle(isPinned ? "Unpin from Recents" : "Pin to Recents")
        .setIcon(isPinned ? "pin-off" : "pin")
        .onClick(async () => {
          if (isPinned) await this.plugin.unpinFile(file);
          else await this.plugin.pinFile(file);
          this.render();
        }));
    }

    const isBookmarked = isBookmarkedPath(this.app, file.path);
    menu.addItem(i => i
      .setTitle(isBookmarked ? "Remove bookmark" : "Bookmark...")
      .setIcon(isBookmarked ? "bookmark-minus" : "bookmark-plus")
      .onClick(async () => {
        try {
          if (isBookmarked) {
            await removeBookmarkForPath(this.app, file.path);
            new Notice("Bookmark removed");
          } else {
            await addBookmarkForFile(this.app, file);
            new Notice("Bookmarked");
          }
          this.render();
        } catch (e) {
          console.error("Lighthouse bookmark action failed", e);
          new Notice(`Bookmark action failed: ${e.message || e}`);
        }
      }));

    this.addFocusMembershipMenu(menu, file, null);
    this.addFocusSectionAssignmentMenu(menu, file, null);

    menu.addItem(i => i
      .setTitle("Reveal in Lighthouse")
      .setIcon("folder-search")
      .onClick(async () => {
        this.mode = "files";
        this.revealedPath = file.path;
        this.expanded = getAncestorFolderSet(file.path);
        this.render();
        window.setTimeout(() => {
          const row = [...this.containerEl.querySelectorAll(".sdn-tree-row")].find(el => el.dataset && el.dataset.path === file.path);
          if (!row) return;
          row.scrollIntoView({ block: "center", inline: "nearest" });
          row.addClass("sdn-revealed-file");
          window.setTimeout(() => row.removeClass("sdn-revealed-file"), 1400);
        }, 0);
      }));

    menu.addItem(i => i
      .setTitle("Open in new tab")
      .setIcon("plus-square")
      .onClick(() => this.plugin.openFile(file, true)));

    menu.addSeparator();

    menu.addItem(i => i
      .setTitle("Duplicate")
      .setIcon("copy")
      .onClick(async () => {
        const ext = file.extension ? `.${file.extension}` : "";
        const parentPath = file.parent && file.parent.path ? file.parent.path : "";
        const base = file.basename;
        let newPath = normalizePath(parentPath ? `${parentPath}/${base} copy${ext}` : `${base} copy${ext}`);
        let n = 2;

        while (this.app.vault.getAbstractFileByPath(newPath)) {
          newPath = normalizePath(parentPath ? `${parentPath}/${base} copy ${n}${ext}` : `${base} copy ${n}${ext}`);
          n++;
        }

        const content = await this.app.vault.read(file);
        await this.app.vault.create(newPath, content);
        this.render();
      }));

    menu.addItem(i => i
      .setTitle("Copy path")
      .setIcon("copy")
      .onClick(async () => {
        await navigator.clipboard.writeText(file.path);
        new Notice("Copied path");
      }));

    menu.addSeparator();

    menu.addItem(i => i
      .setTitle("Rename...")
      .setIcon("pencil")
      .onClick(async () => {
        const newNameRaw = await this.askText("Rename file", "File name", file.name);
        if (!newNameRaw) return;

        const parentPath = file.parent && file.parent.path ? file.parent.path : "";
        const ext = file.extension ? `.${file.extension}` : "";
        const finalName = newNameRaw.includes(".") ? newNameRaw : `${newNameRaw}${ext}`;
        const newPath = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName);

        await this.app.fileManager.renameFile(file, newPath);
        this.render();
      }));

    menu.addItem(i => i
      .setTitle("Delete")
      .setIcon("trash")
      .onClick(async () => {
        if (confirm(`Delete ${file.name}?`)) {
          await this.app.vault.trash(file, true);
          this.render();
        }
      }));
  }

  showAddFolderToFocusMenu(evt, folder) {
    const menu = new Menu();
    const focuses = Array.isArray(this.plugin.settings.focuses) ? this.plugin.settings.focuses : [];
    for (const focus of focuses) {
      menu.addItem(item => {
        const already = this.plugin.isFolderInFocus(focus.id, folder.path);
        item.setTitle(`${already ? "✓ " : ""}${focus.name}`);
        item.setIcon("crosshair");
        if (already && typeof item.setDisabled === "function") item.setDisabled(true);
        if (!already) item.onClick(async () => {
          await this.plugin.addFolderToFocus(focus.id, folder.path);
          new Notice(`Added ${folder.name} to ${focus.name}`);
        });
      });
    }
    this.showMenu(menu, evt);
  }

  showFileMenu(evt, file) {
    const menu = new Menu();
    this.addFileMenuActions(menu, file);
    this.showMenu(menu, evt);
  }

  showFolderMenu(evt, folder) {
    const menu = new Menu();
    menu.addItem(i => i.setTitle("New note").setIcon("file-plus").onClick(() => this.plugin.createNewNote(folder.path)));
    menu.addItem(i => i.setTitle("New folder").setIcon("folder-plus").onClick(async () => {
      const name = await this.askText("New folder", "Folder name");
      if (!name) return;
      await ensureFolder(this.app, normalizePath(`${folder.path}/${name}`));
      this.expanded.add(folder.path);
      this.render();
    }));

    const parentPath = folder.parent && folder.parent.path ? folder.parent.path : "";

    menu.addSeparator();
    menu.addItem(i => i
      .setTitle("Rename folder...")
      .setIcon("pencil")
      .onClick(async () => {
        const newNameRaw = await this.askText("Rename folder", "Folder name", folder.name);
        if (!newNameRaw) return;

        const cleanName = newNameRaw
          .trim()
          .replace(/[\\/:*?"<>|]/g, "-");
        if (!cleanName || cleanName === folder.name) return;

        const targetPath = normalizePath(parentPath ? `${parentPath}/${cleanName}` : cleanName);
        if (targetPath === folder.path) return;

        if (this.app.vault.getAbstractFileByPath(targetPath)) {
          new Notice("A folder or file with that name already exists there.");
          return;
        }

        try {
          await this.app.fileManager.renameFile(folder, targetPath);
          this.expanded.delete(folder.path);
          expandAncestors(this.expanded, targetPath);
          this.expanded.add(targetPath);
          this.render();
        } catch (e) {
          console.error("Lighthouse rename folder failed", e);
          new Notice(`Rename folder failed: ${e.message || e}`);
        }
      }));

    if (parentPath) {
      menu.addSeparator();
      menu.addItem(i => i
        .setTitle("Move to root")
        .setIcon("folder-input")
        .onClick(async () => {
          const targetPath = normalizePath(folder.name);
          if (targetPath === folder.path) return;

          if (this.app.vault.getAbstractFileByPath(targetPath)) {
            new Notice("A folder or file with that name already exists at root.");
            return;
          }

          try {
            await this.app.fileManager.renameFile(folder, targetPath);
            this.expanded.delete(folder.path);
            expandAncestors(this.expanded, targetPath);
            this.expanded.add(targetPath);
            this.render();
          } catch (e) {
            console.error("Lighthouse move folder to root failed", e);
            new Notice(`Move to root failed: ${e.message || e}`);
          }
        }));
    }

    menu.addSeparator();
    const isWatched = this.plugin.isWatchedFolder(folder);
    menu.addItem(i => i
      .setTitle(isWatched ? "Unwatch folder" : "Watch folder")
      .setIcon(isWatched ? "eye-off" : "eye")
      .onClick(async () => {
        if (isWatched) await this.plugin.unwatchFolder(folder);
        else await this.plugin.watchFolder(folder);
        this.render();
      }));

    const isBookmarked = isBookmarkedPath(this.app, folder.path);
    menu.addItem(i => i
      .setTitle(isBookmarked ? "Remove bookmark" : "Bookmark folder")
      .setIcon(isBookmarked ? "bookmark-minus" : "bookmark-plus")
      .onClick(async () => {
        try {
          if (isBookmarked) {
            await removeBookmarkForPath(this.app, folder.path);
            new Notice("Bookmark removed");
          } else {
            await addBookmarkForFile(this.app, folder);
            new Notice("Folder bookmarked");
          }
          this.render();
        } catch (e) {
          console.error("Lighthouse bookmark folder action failed", e);
          new Notice(`Bookmark action failed: ${e.message || e}`);
        }
      }));

    this.addFocusMembershipMenu(menu, folder, evt);
    this.addFocusSectionAssignmentMenu(menu, folder, evt);

    menu.addSeparator();
    const countMode = this.plugin.settings.folderCountMode || "watched";
    menu.addItem(i => i
      .setTitle(countMode === "watched" ? "✓ Count watched folders" : "Count watched folders")
      .setIcon("list-ordered")
      .onClick(async () => {
        this.plugin.settings.folderCountMode = "watched";
        this.plugin.settings.showWatchCounts = true;
        await this.plugin.saveSettings();
      }));
    menu.addItem(i => i
      .setTitle(countMode === "all" ? "✓ Count all folders" : "Count all folders")
      .setIcon("list-tree")
      .onClick(async () => {
        this.plugin.settings.folderCountMode = "all";
        this.plugin.settings.showWatchCounts = false;
        await this.plugin.saveSettings();
      }));
    menu.addItem(i => i
      .setTitle(countMode === "off" ? "✓ Hide folder counts" : "Hide folder counts")
      .setIcon("eye-off")
      .onClick(async () => {
        this.plugin.settings.folderCountMode = "off";
        this.plugin.settings.showWatchCounts = false;
        await this.plugin.saveSettings();
      }));

    menu.addSeparator();
    menu.addItem(i => i
      .setTitle("Delete folder")
      .setIcon("trash")
      .onClick(async () => {
        const childCount = Array.isArray(folder.children) ? folder.children.length : 0;
        const message = childCount > 0
          ? `Delete folder "${folder.name}" and its ${childCount} item${childCount === 1 ? "" : "s"}?`
          : `Delete empty folder "${folder.name}"?`;
        if (!confirm(message)) return;
        try {
          await this.app.vault.trash(folder, true);
          this.expanded.delete(folder.path);
          this.render();
        } catch (e) {
          console.error("Lighthouse delete folder failed", e);
          new Notice(`Delete folder failed: ${e.message || e}`);
        }
      }));

    this.showMenu(menu, evt);
  }
}

// Floating note-only scroll buttons. Mobile keeps them transient while reading.
class ScrollControls {
  constructor(plugin) {
    this.plugin = plugin;
    this.visibleUntil = 0;
    this.hideTimer = null;
    this.repositionTimer = null;
    this.mobileVisible = false;
    this.mobileRevealTimer = null;
  }

  init() {
    this.el = document.body.createDiv({ cls: "sdn-scroll-controls" });

    this.topBtn = this.el.createEl("button", { cls: "sdn-scroll-button", attr: { "aria-label": "Scroll to top" } });
    setIcon(this.topBtn, "arrow-up");

    this.bottomBtn = this.el.createEl("button", { cls: "sdn-scroll-button", attr: { "aria-label": "Scroll to bottom" } });
    setIcon(this.bottomBtn, "arrow-down");

    this.topBtn.onclick = () => {
      this.animateClick(this.topBtn);
      this.jump("top");
      this.topBtn.blur();
    };
    this.bottomBtn.onclick = () => {
      this.animateClick(this.bottomBtn);
      this.jump("bottom");
      this.bottomBtn.blur();
    };

    const clearMobileTapState = () => {
      if (!document.body.classList.contains("is-mobile")) return;
      window.setTimeout(() => {
        if (this.topBtn) this.topBtn.blur();
        if (this.bottomBtn) this.bottomBtn.blur();
      }, 0);
    };
    this.plugin.registerDomEvent(this.topBtn, "pointerup", clearMobileTapState);
    this.plugin.registerDomEvent(this.topBtn, "pointercancel", clearMobileTapState);
    this.plugin.registerDomEvent(this.bottomBtn, "pointerup", clearMobileTapState);
    this.plugin.registerDomEvent(this.bottomBtn, "pointercancel", clearMobileTapState);

    this.updateSettings();

    this.onScroll = (evt) => {
      if (document.body.classList.contains("is-mobile")) {
        const view = this.getActiveMarkdownView();
        if (!view) return;
        const scroller = this.getScroller(view);
        const target = evt && evt.target;
        const fromActiveNote =
          !target ||
          target === scroller ||
          (view.contentEl && view.contentEl.contains(target));

        if (!fromActiveNote) return;
        this.revealMobileBriefly(1600);
      } else {
        this.mobileVisible = true;
        this.position();
      }
    };
    this.onResize = () => this.position();
    this.onPointerDown = (evt) => {
      if (!document.body.classList.contains("is-mobile")) return;
      const view = this.getActiveMarkdownView();
      if (!view || !view.contentEl || !view.contentEl.contains(evt.target)) return;
      const target = evt.target;
      if (target && target.closest && target.closest("input, textarea, .cm-content, .cm-line")) return;
      this.revealMobileBriefly(1600);
    };

    window.addEventListener("scroll", this.onScroll, true);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("pointerdown", this.onPointerDown, true);

    this.plugin.registerEvent(this.plugin.app.workspace.on("active-leaf-change", () => this.position()));
    this.plugin.registerEvent(this.plugin.app.workspace.on("layout-change", () => this.forceHideIfObscured()));
    this.plugin.registerDomEvent(document, "keydown", () => this.hideForTyping(), { capture: true });
    this.plugin.registerDomEvent(document, "input", () => this.hideForTyping(), { capture: true });

    if (!document.body.classList.contains("is-mobile")) {
      this.mobileVisible = true;
      this.position();
    }
  }

  destroy() {
    window.removeEventListener("scroll", this.onScroll, true);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("pointerdown", this.onPointerDown, true);
    if (this.el) this.el.remove();
  }

  updateSettings() {
    const size = this.plugin.settings.scrollButtonSize || 34;
    this.el.style.setProperty("--sdn-scroll-size", `${size}px`);
    this.position();
  }

  getActiveMarkdownView() {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (!leaf || !leaf.view || !(leaf.view instanceof MarkdownView)) return null;
    return leaf.view;
  }

  getScroller(view) {
    if (!view || !view.contentEl) return null;
    return view.contentEl.querySelector(".cm-scroller") ||
      view.contentEl.querySelector(".markdown-reading-view") ||
      view.contentEl.querySelector(".markdown-preview-view");
  }

  isAllowed() {
    if (!this.plugin.settings.showScrollButtons) return false;

    const view = this.getActiveMarkdownView();
    if (!view) return false;

    const scroller = this.getScroller(view);
    if (!scroller) return false;

    const leafContent = view.contentEl.closest(".workspace-leaf-content");
    if (!leafContent) return false;
    if (leafContent.getAttribute("data-type") !== "markdown") return false;

    const rect = view.contentEl.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;

    const noteTooSmall =
      rect.width < 260 ||
      rect.height < 220 ||
      rect.right < 160 ||
      rect.left > vw - 160 ||
      rect.bottom < 120 ||
      rect.top > vh - 120;

    if (noteTooSmall) return false;

    if (document.body.classList.contains("is-mobile")) {
      const drawerEls = Array.from(document.querySelectorAll(
        ".workspace-drawer, .mod-left-split, .mod-right-split"
      ));

      for (const el of drawerEls) {
        const r = el.getBoundingClientRect();
        const visible = r.width > 80 && r.height > 100 && r.right > 0 && r.left < vw;
        if (visible && r.width > vw * 0.22) return false;
      }

      const noteNotPrimary =
        rect.width < vw * 0.62 ||
        rect.left > vw * 0.18 ||
        rect.right < vw * 0.82;

      if (noteNotPrimary) return false;
      if (!this.mobileVisible) return false;
    }

    return true;
  }

  position() {
    if (!this.isAllowed()) {
      this.hide();
      return;
    }

    const view = this.getActiveMarkdownView();
    const rect = view.contentEl.getBoundingClientRect();
    const size = this.plugin.settings.scrollButtonSize || 34;
    const vw = window.innerWidth || document.documentElement.clientWidth || rect.right;

    this.el.removeClass("is-mobile-position");
    this.el.style.height = "auto";

    const left = Math.min(
      Math.max(rect.left + 8, rect.right - size - 20),
      vw - size - 10
    );
    const top = rect.top + (rect.height / 2) - ((size * 2 + 7) / 2);

    this.el.style.left = `${left}px`;
    this.el.style.top = `${Math.max(rect.top + 64, top)}px`;
    this.el.style.right = "auto";
    this.el.style.display = "flex";

    if (this.topBtn) this.topBtn.toggle(true);
    if (this.bottomBtn) this.bottomBtn.toggle(true);

    this.el.addClass("is-visible");
  }

  animateClick(button) {
    if (!button) return;
    button.removeClass("sdn-scroll-pulse");
    void button.offsetWidth;
    button.addClass("sdn-scroll-pulse");
    window.setTimeout(() => button.removeClass("sdn-scroll-pulse"), 300);
  }

  revealMobileBriefly(ms = 1600) {
    if (!document.body.classList.contains("is-mobile")) {
      this.position();
      return;
    }

    this.mobileVisible = true;
    this.position();

    clearTimeout(this.mobileRevealTimer);
    this.mobileRevealTimer = setTimeout(() => {
      this.mobileVisible = false;
      this.hide();
    }, ms);
  }

  hideForTyping() {
    if (document.body.classList.contains("is-mobile")) {
      this.mobileVisible = false;
      clearTimeout(this.mobileRevealTimer);
      this.hide();
      return;
    }

    this.hideBriefly();
  }

  showSoon(ms = 1200) {
    if (!this.isAllowed()) return;
    this.position();
    this.el.addClass("is-visible");
  }

  hide() {
    if (this.el) this.el.removeClass("is-visible");
  }

  hideBriefly() {
    if (!this.el) return;
    this.el.removeClass("is-visible");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.position(), 700);
  }

  jump(where) {
    const view = this.getActiveMarkdownView();
    const scroller = this.getScroller(view);
    if (!scroller) return;

    if (where === "top") {
      scroller.scrollTop = 0;
    } else if (where === "bottom") {
      scroller.scrollTop = scroller.scrollHeight;
    }

    clearTimeout(this.hideTimer);
    setTimeout(() => this.position(), 40);
    setTimeout(() => this.position(), 180);
  }
}




class HiddenVaultInspectorModal extends Modal {
  constructor(app) {
    super(app);
    this.currentPath = "";
    this.entries = [];
    this.loading = false;
    this.safePreviewBytes = 128 * 1024;
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("sdn-hidden-inspector-modal");
    this.render();
  }

  onClose() {
    this.contentEl.empty();
  }

  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-hidden-inspector-modal");

    const header = contentEl.createDiv({ cls: "sdn-hidden-inspector-header" });
    const title = header.createDiv({ cls: "sdn-hidden-inspector-title" });
    title.createEl("h2", { text: "Inspect hidden vault files" });
    title.createDiv({
      cls: "sdn-modal-description",
      text: "Read-only vault browser for hidden folders such as .obsidian/plugins."
    });

    const closeButton = header.createEl("button", { cls: "sdn-icon-button", attr: { "aria-label": "Close inspector" } });
    setIcon(closeButton, "x");
    closeButton.onclick = () => this.close();

    this.renderPathBar(contentEl);

    const list = contentEl.createDiv({ cls: "sdn-hidden-inspector-list" });
    list.createDiv({ cls: "sdn-home-empty", text: "Loading…" });

    try {
      const entries = await this.readEntries(this.currentPath);
      list.empty();
      if (!entries.length) {
        list.createDiv({ cls: "sdn-home-empty", text: "No files or folders" });
        return;
      }
      for (const entry of entries) this.renderEntry(list, entry);
    } catch (error) {
      list.empty();
      list.createDiv({ cls: "sdn-home-empty", text: `Could not read folder: ${error.message || error}` });
    }
  }

  renderPathBar(parent) {
    const bar = parent.createDiv({ cls: "sdn-hidden-inspector-pathbar" });
    const back = bar.createEl("button", { cls: "sdn-hidden-inspector-back", attr: { "aria-label": "Back" } });
    setIcon(back, "chevron-left");
    back.createSpan({ text: "Back" });
    back.disabled = !this.currentPath;
    back.onclick = () => {
      this.currentPath = getParentVaultPath(this.currentPath);
      this.render();
    };

    const path = bar.createDiv({ cls: "sdn-hidden-inspector-path", text: this.currentPath || "/" });
    path.title = this.currentPath || "/";

    const copy = bar.createEl("button", { cls: "sdn-hidden-inspector-copy", text: "Copy path" });
    copy.onclick = async () => {
      await copyTextToClipboard(this.currentPath || "/");
      new Notice("Copied path");
    };
  }

  async readEntries(path) {
    const adapter = this.app.vault.adapter;
    if (!adapter || typeof adapter.list !== "function") throw new Error("Vault adapter does not support folder listing.");
    const listed = await adapter.list(path || "");
    const folders = Array.isArray(listed && listed.folders) ? listed.folders : [];
    const files = Array.isArray(listed && listed.files) ? listed.files : [];
    const entries = [];

    for (const folderPath of folders) {
      entries.push(await this.createEntry(folderPath, "folder"));
    }
    for (const filePath of files) {
      entries.push(await this.createEntry(filePath, "file"));
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async createEntry(path, type) {
    const stat = await this.safeStat(path);
    return {
      path,
      type,
      name: getVaultPathName(path),
      size: type === "file" && stat && Number.isFinite(stat.size) ? stat.size : null,
      mtime: stat && Number.isFinite(stat.mtime) ? stat.mtime : null
    };
  }

  async safeStat(path) {
    try {
      const adapter = this.app.vault.adapter;
      if (!adapter || typeof adapter.stat !== "function") return null;
      return await adapter.stat(path);
    } catch (error) {
      return null;
    }
  }

  renderEntry(parent, entry) {
    const row = parent.createDiv({ cls: `sdn-hidden-inspector-row is-${entry.type}` });
    const main = row.createDiv({ cls: "sdn-hidden-inspector-main" });
    const icon = main.createSpan({ cls: "sdn-hidden-inspector-icon", attr: { "aria-hidden": "true" } });
    setIcon(icon, entry.type === "folder" ? "folder" : "file-text");

    const text = main.createDiv({ cls: "sdn-hidden-inspector-text" });
    text.createDiv({ cls: "sdn-hidden-inspector-name", text: entry.name || entry.path || "/" });
    const meta = [];
    if (entry.type === "file" && entry.size !== null) meta.push(formatBytes(entry.size));
    if (entry.mtime !== null) meta.push(formatModifiedTime(entry.mtime));
    text.createDiv({ cls: "sdn-hidden-inspector-meta", text: meta.join(" · ") || entry.path || "/" });

    const actions = row.createDiv({ cls: "sdn-hidden-inspector-actions" });
    const copy = actions.createEl("button", { cls: "sdn-hidden-inspector-action", attr: { "aria-label": `Copy ${entry.path}` } });
    setIcon(copy, "copy");
    copy.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await copyTextToClipboard(entry.path);
      new Notice("Copied path");
    };

    if (entry.type === "folder") {
      row.onclick = () => {
        this.currentPath = normalizePath(entry.path);
        this.render();
      };
      return;
    }

    const canPreview = this.canPreview(entry);
    const preview = actions.createEl("button", { cls: "sdn-hidden-inspector-action", attr: { "aria-label": `Preview ${entry.path}` } });
    setIcon(preview, "eye");
    preview.disabled = !canPreview;
    preview.onclick = async (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      await this.openPreview(entry);
    };
    row.onclick = async () => {
      if (canPreview) await this.openPreview(entry);
    };
  }

  canPreview(entry) {
    return entry.type === "file" && entry.size !== null && entry.size <= this.safePreviewBytes && isLikelyTextPath(entry.path);
  }

  async openPreview(entry) {
    if (!this.canPreview(entry)) return;
    try {
      const adapter = this.app.vault.adapter;
      if (!adapter || typeof adapter.read !== "function") throw new Error("Vault adapter does not support file reading.");
      const text = await adapter.read(entry.path);
      new HiddenVaultPreviewModal(this.app, entry, text).open();
    } catch (error) {
      new Notice(`Preview failed: ${error.message || error}`);
    }
  }
}

class HiddenVaultPreviewModal extends Modal {
  constructor(app, entry, text) {
    super(app);
    this.entry = entry;
    this.text = text || "";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-hidden-inspector-modal");
    contentEl.addClass("sdn-hidden-preview-modal");

    const header = contentEl.createDiv({ cls: "sdn-hidden-inspector-header" });
    const title = header.createDiv({ cls: "sdn-hidden-inspector-title" });
    title.createEl("h2", { text: this.entry.name || "Preview" });
    title.createDiv({ cls: "sdn-modal-description", text: this.entry.path });

    const closeButton = header.createEl("button", { cls: "sdn-icon-button", attr: { "aria-label": "Close preview" } });
    setIcon(closeButton, "x");
    closeButton.onclick = () => this.close();

    const actions = contentEl.createDiv({ cls: "sdn-hidden-preview-actions" });
    const copyPath = actions.createEl("button", { text: "Copy path" });
    copyPath.onclick = async () => {
      await copyTextToClipboard(this.entry.path);
      new Notice("Copied path");
    };

    const copyText = actions.createEl("button", { text: "Copy text" });
    copyText.onclick = async () => {
      await copyTextToClipboard(this.text);
      new Notice("Copied text");
    };

    const pre = contentEl.createEl("pre", { cls: "sdn-hidden-preview-text" });
    pre.createEl("code", { text: this.text });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class FilesCustomizeModal extends Modal {
  constructor(app, plugin, view) {
    super(app);
    this.plugin = plugin;
    this.view = view || null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.createEl("h2", { text: "Customize Files" });
    contentEl.createDiv({ cls: "sdn-modal-description", text: "Adjust file tree sorting, folder behavior, and watch folder status display." });

    contentEl.createEl("h3", { text: "Sorting" });
    new Setting(contentEl)
      .setName("File sort")
      .setDesc("Applies to files in the Files tree")
      .addDropdown(dropdown => dropdown
        .addOption("name-asc", "Name, A to Z")
        .addOption("name-desc", "Name, Z to A")
        .addOption("modified-desc", "Modified, newest first")
        .addOption("modified-asc", "Modified, oldest first")
        .setValue(this.plugin.settings.fileTreeSort || "name-asc")
        .onChange(async value => {
          this.plugin.settings.fileTreeSort = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(contentEl)
      .setName("Folder behavior")
      .setDesc("Choose whether folders stay first or mix with files")
      .addDropdown(dropdown => dropdown
        .addOption("folders-first", "Folders first")
        .addOption("mixed", "Mix folders and files")
        .setValue(this.plugin.settings.fileTreeFolderBehavior || "folders-first")
        .onChange(async value => {
          this.plugin.settings.fileTreeFolderBehavior = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    contentEl.createEl("h3", { text: "Watch folders" });
    new Setting(contentEl)
      .setName("Show watch indicator")
      .setDesc("Shows a filled dot for watched folders with notes")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showWatchIndicator !== false)
        .onChange(async value => {
          this.plugin.settings.showWatchIndicator = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(contentEl)
      .setName("Show empty watch status")
      .setDesc("Shows a hollow dot for watched folders with no visible notes")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showEmptyWatchFolderStatus !== false)
        .onChange(async value => {
          this.plugin.settings.showEmptyWatchFolderStatus = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(contentEl)
      .setName("Folder counts")
      .setDesc("Show recursive note counts beside watched folders or all folders")
      .addDropdown(dropdown => dropdown
        .addOption("off", "Off")
        .addOption("watched", "Watched folders only")
        .addOption("all", "All folders")
        .setValue(this.plugin.settings.folderCountMode || (this.plugin.settings.showWatchCounts === true ? "watched" : "off"))
        .onChange(async value => {
          this.plugin.settings.folderCountMode = value;
          this.plugin.settings.showWatchCounts = value === "watched";
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    new Setting(contentEl)
      .setName("Show zero counts")
      .setDesc("Shows (0) for empty watched folders when watched folder counts are enabled")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showZeroWatchCounts !== false)
        .onChange(async value => {
          this.plugin.settings.showZeroWatchCounts = value;
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));

    const buttons = contentEl.createDiv({ cls: "sdn-modal-buttons" });
    new Setting(buttons)
      .addButton(button => button
        .setButtonText("Done")
        .setCta()
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}


class FocusEditModal extends Modal {
  constructor(app, plugin, focus) {
    super(app);
    this.plugin = plugin;
    const cloneList = (value) => Array.isArray(value) ? [...value] : [];
    this.focus = focus ? {
      ...focus,
      visibleBookmarkGroups: cloneList(focus.visibleBookmarkGroups),
      visibleSections: cloneList(focus.visibleSections),
      visibleWatchFolders: cloneList(focus.visibleWatchFolders),
      visibleFolders: cloneList(focus.visibleFolders),
      items: cloneList(focus.items),
      sourceItems: cloneList(focus.sourceItems),
      workItems: cloneList(focus.workItems),
      unfiledItems: cloneList(focus.unfiledItems),
      sectionLabels: focus.sectionLabels && typeof focus.sectionLabels === "object" ? { ...focus.sectionLabels } : { sources: "Sources", work: "Work", unfiled: "Unfiled" },
      displayMode: "drill"
    } : {
      id: null,
      name: "",
      visibleBookmarkGroups: [],
      visibleSections: [],
      visibleWatchFolders: [],
      filesMode: "all",
      visibleFolders: [],
      items: [],
      sourceItems: [],
      workItems: [],
      unfiledItems: [],
      sectionLabels: { sources: "Sources", work: "Work", unfiled: "Unfiled" },
      displayMode: "drill"
    };
    this.originalSnapshot = this.getSnapshot();
    this.saveButton = null;
    this.confirmCloseModal = null;
    this.forceClosing = false;
  }

  getSnapshot() {
    const focus = this.focus || {};
    return JSON.stringify({
      id: focus.id || null,
      name: focus.name || "",
      visibleBookmarkGroups: Array.isArray(focus.visibleBookmarkGroups) ? [...focus.visibleBookmarkGroups] : [],
      visibleSections: Array.isArray(focus.visibleSections) ? [...focus.visibleSections] : [],
      visibleWatchFolders: Array.isArray(focus.visibleWatchFolders) ? [...focus.visibleWatchFolders] : [],
      filesMode: focus.filesMode === "filtered" ? "filtered" : "all",
      visibleFolders: Array.isArray(focus.visibleFolders) ? [...focus.visibleFolders] : [],
      items: Array.isArray(focus.items) ? [...focus.items] : [],
      sourceItems: Array.isArray(focus.sourceItems) ? [...focus.sourceItems] : [],
      workItems: Array.isArray(focus.workItems) ? [...focus.workItems] : [],
      unfiledItems: Array.isArray(focus.unfiledItems) ? [...focus.unfiledItems] : [],
      sectionLabels: focus.sectionLabels && typeof focus.sectionLabels === "object" ? { ...focus.sectionLabels } : { sources: "Sources", work: "Work", unfiled: "Unfiled" },
      displayMode: "drill"
    });
  }

  hasUnsavedChanges() {
    return this.getSnapshot() !== this.originalSnapshot;
  }

  hasValidName() {
    return !!(this.focus.name && this.focus.name.trim());
  }

  updateSaveState() {
    if (!this.saveButton) return;
    this.saveButton.setDisabled(!this.hasValidName());
  }

  markChanged() {
    this.updateSaveState();
  }

  async saveFocus() {
    if (!this.hasValidName()) return false;
    await this.plugin.upsertFocus(this.focus);
    this.originalSnapshot = this.getSnapshot();
    return true;
  }

  async saveAndClose() {
    const saved = await this.saveFocus();
    if (!saved) return;
    this.forceClosing = true;
    super.close();
  }

  discardAndClose() {
    this.forceClosing = true;
    super.close();
  }

  close() {
    if (this.forceClosing || !this.hasUnsavedChanges()) {
      super.close();
      return;
    }
    if (this.confirmCloseModal) return;
    this.confirmCloseModal = new FocusUnsavedChangesModal(this.app, this, () => {
      this.confirmCloseModal = null;
    });
    this.confirmCloseModal.open();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.createEl("h2", { text: this.focus.id ? "Edit Focus" : "New Focus" });
    contentEl.createDiv({ cls: "sdn-modal-description", text: "A Focus is a constrained working context. It only shows items intentionally assigned to Sources, Work, or Unfiled." });

    const nameSetting = new Setting(contentEl).setName("Name").setDesc("Example: Writing, Audio, Clients, Mobile");
    nameSetting.addText(text => {
      text
        .setValue(this.focus.name || "")
        .onChange(value => {
          this.focus.name = value;
          this.markChanged();
        });
      text.inputEl.placeholder = "Focus Name";
      window.setTimeout(() => text.inputEl.focus(), 25);
      text.inputEl.addEventListener("keydown", async (evt) => {
        if (evt.key !== "Enter") return;
        if (!this.hasValidName()) return;
        evt.preventDefault();
        await this.saveAndClose();
      });
    });

    contentEl.createEl("h3", { text: "Focus sections" });
    contentEl.createDiv({ cls: "sdn-modal-description", text: "Right-click section headers in Focus to rename them. Unfiled only appears when it contains items." });

    const sourceItems = Array.isArray(this.focus.sourceItems) ? this.focus.sourceItems : (Array.isArray(this.focus.items) ? this.focus.items : []);
    const workItems = Array.isArray(this.focus.workItems) ? this.focus.workItems : [];
    const unfiledItems = Array.isArray(this.focus.unfiledItems) ? this.focus.unfiledItems : [];
    const globalSourceItems = Array.isArray(this.plugin.settings.focusGlobalSourceItems) ? this.plugin.settings.focusGlobalSourceItems : [];
    const globalWorkItems = Array.isArray(this.plugin.settings.focusGlobalWorkItems) ? this.plugin.settings.focusGlobalWorkItems : [];
    const globalUnfiledItems = Array.isArray(this.plugin.settings.focusGlobalUnfiledItems) ? this.plugin.settings.focusGlobalUnfiledItems : [];
    this.renderFocusItemSummary(contentEl, this.plugin.getFocusSectionLabel(this.focus, "sources"), sourceItems, "sourceItems");
    this.renderFocusItemSummary(contentEl, this.plugin.getFocusSectionLabel(this.focus, "work"), workItems, "workItems");
    this.renderFocusItemSummary(contentEl, this.plugin.getFocusSectionLabel(this.focus, "unfiled"), unfiledItems, "unfiledItems");
    this.renderFocusItemSummary(contentEl, "Global Sources", globalSourceItems, "focusGlobalSourceItems");
    this.renderFocusItemSummary(contentEl, "Global Work", globalWorkItems, "focusGlobalWorkItems");
    this.renderFocusItemSummary(contentEl, "Global Unfiled", globalUnfiledItems, "focusGlobalUnfiledItems");

    const buttons = contentEl.createDiv({ cls: "sdn-modal-buttons sdn-modal-sticky-footer" });
    new Setting(buttons)
      .addButton(button => button
        .setButtonText("Cancel")
        .onClick(() => this.close()))
      .addButton(button => {
        this.saveButton = button;
        button
          .setButtonText("Save Focus")
          .setCta()
          .setDisabled(!this.hasValidName())
          .onClick(async () => {
            await this.saveAndClose();
          });
      });
  }

  toggleListValue(key, value, enabled) {
    const set = new Set(Array.isArray(this.focus[key]) ? this.focus[key] : []);
    if (enabled) set.add(value);
    else set.delete(value);
    this.focus[key] = Array.from(set);
    this.markChanged();
  }

  renderFocusItemSummary(parent, label, paths, key) {
    const isGlobal = key === "focusGlobalSourceItems" || key === "focusGlobalWorkItems" || key === "focusGlobalUnfiledItems";
    const clean = (paths || []).filter(Boolean);
    const summary = parent.createDiv({ cls: "sdn-focus-item-summary" });
    summary.createDiv({ cls: "sdn-focus-item-summary-label", text: `${label}: ${clean.length}` });
    if (!clean.length) {
      summary.createDiv({ cls: "sdn-home-empty", text: "None" });
      return;
    }
    for (const path of clean) {
      const row = summary.createDiv({ cls: "sdn-focus-item-summary-row" });
      row.createDiv({ cls: "sdn-focus-item-summary-path", text: path });
      const remove = row.createEl("button", { cls: "sdn-focus-item-remove", attr: { "aria-label": `Remove ${path}` } });
      setIcon(remove, "x");
      remove.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (isGlobal) {
          this.plugin.settings[key] = (this.plugin.settings[key] || []).filter(item => item !== path);
          this.plugin.settings.focusGlobalItems = (this.plugin.settings.focusGlobalSourceItems || []).filter(Boolean);
          this.plugin.requestSaveSettings();
        } else {
          this.focus[key] = (this.focus[key] || []).filter(item => item !== path);
          this.focus.items = [...(this.focus.sourceItems || [])];
          this.markChanged();
        }
        this.onOpen();
      };
    }
  }

  getBookmarkGroupNames() {
    return (getBookmarkRootItems(this.app) || [])
      .filter(item => isBookmarkGroupItem(item))
      .map(item => item.title || item.name || "Untitled")
      .filter(Boolean);
  }

  getTopLevelFolderPaths() {
    return getAllFolderPaths(this.app.vault.getRoot())
      .filter(path => path && !shouldHidePath(this.plugin, path))
      .sort((a, b) => a.localeCompare(b));
  }

  onClose() {
    if (this.confirmCloseModal) {
      this.confirmCloseModal.close();
      this.confirmCloseModal = null;
    }
    this.contentEl.empty();
  }
}

class FocusDeleteConfirmModal extends Modal {
  constructor(app, plugin, focus) {
    super(app);
    this.plugin = plugin;
    this.focus = focus;
    this.dontShowAgain = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.createEl("h2", { text: "Delete Focus?" });
    contentEl.createDiv({
      cls: "sdn-modal-description",
      text: `Delete "${this.focus.name}"? This only removes the Lighthouse Focus. It does not delete notes, folders, or bookmarks.`
    });

    new Setting(contentEl)
      .setName("Don't show this warning again")
      .addToggle(toggle => toggle
        .setValue(false)
        .onChange(value => { this.dontShowAgain = value; }));

    const buttons = contentEl.createDiv({ cls: "sdn-modal-buttons" });
    new Setting(buttons)
      .addButton(button => button
        .setButtonText("Delete Focus")
        .setWarning()
        .onClick(async () => {
          if (this.dontShowAgain) {
            this.plugin.settings.confirmFocusDelete = false;
            await this.plugin.saveSettings();
          }
          await this.plugin.deleteFocus(this.focus.id);
          this.close();
        }))
      .addButton(button => button
        .setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}

class FocusUnsavedChangesModal extends Modal {
  constructor(app, focusModal, onDone) {
    super(app);
    this.focusModal = focusModal;
    this.onDone = onDone;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.createEl("h2", { text: "Unsaved Focus changes" });
    contentEl.createDiv({
      cls: "sdn-modal-description",
      text: "You have not saved this Focus state. Do you want to save your changes before closing?"
    });

    const buttons = contentEl.createDiv({ cls: "sdn-modal-buttons" });
    new Setting(buttons)
      .addButton(button => button
        .setButtonText("Save")
        .setCta()
        .setDisabled(!this.focusModal.hasValidName())
        .onClick(async () => {
          const saved = await this.focusModal.saveFocus();
          if (!saved) return;
          this.close();
          this.focusModal.discardAndClose();
        }))
      .addButton(button => button
        .setButtonText("Don't Save")
        .onClick(() => {
          this.close();
          this.focusModal.discardAndClose();
        }))
      .addButton(button => button
        .setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
    if (this.onDone) this.onDone();
  }
}

class HomeCustomizeModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.createEl("h2", { text: "Customize Bookmarks" });
    contentEl.createDiv({ cls: "sdn-modal-description", text: "Choose what appears in the Bookmarks view and how much detail it shows." });

    contentEl.createEl("h3", { text: "Sections" });
    const sections = ["bookmark-groups", "pinned-notes", "open-tabs", "watch-folders"];
    for (const sectionId of sections) {
      const meta = this.getSectionMeta(sectionId);
      new Setting(contentEl)
        .setName(meta.label)
        .setDesc(meta.desc)
        .addToggle(toggle => toggle
          .setValue(this.plugin.isHomeSectionEnabled(sectionId))
          .onChange(async (value) => {
            await this.plugin.setHomeSectionEnabled(sectionId, value);
          }));
    }

    contentEl.createEl("h3", { text: "Sorting" });
    new Setting(contentEl)
      .setName("Item sort")
      .setDesc("Applies to notes and folders inside Bookmarks sections. Section order stays draggable.")
      .addDropdown(dropdown => dropdown
        .addOption("name-asc", "Name, A to Z")
        .addOption("name-desc", "Name, Z to A")
        .addOption("modified-desc", "Modified, newest first")
        .addOption("modified-asc", "Modified, oldest first")
        .addOption("created-desc", "Created, newest first")
        .addOption("created-asc", "Created, oldest first")
        .setValue(this.plugin.settings.bookmarksItemSort || "name-asc")
        .onChange(async (value) => {
          await this.plugin.setBookmarksItemSort(value);
        }));

    contentEl.createEl("h3", { text: "Display" });
    new Setting(contentEl)
      .setName("Show note and folder locations")
      .setDesc("Default: off. Shows the smaller path line under Bookmarks notes and folders")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showBookmarksLocation !== false)
        .onChange(async (value) => {
          this.plugin.settings.showBookmarksLocation = value;
          await this.plugin.saveSettings();
        }));

    new Setting(contentEl)
      .setName("Show counts and extra info")
      .setDesc("Shows counts and secondary info in Bookmarks sections")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showBookmarksInfo !== false)
        .onChange(async (value) => {
          this.plugin.settings.showBookmarksInfo = value;
          await this.plugin.saveSettings();
        }));

    new Setting(contentEl)
      .setName("Hide redundant bookmarks")
      .setDesc("Hides directly bookmarked notes or folders when they already appear inside a bookmarked folder")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.hideRedundantBookmarks !== false)
        .onChange(async (value) => {
          this.plugin.settings.hideRedundantBookmarks = value;
          await this.plugin.saveSettings();
        }));

    const buttons = contentEl.createDiv({ cls: "sdn-modal-buttons" });
    new Setting(buttons)
      .addButton(button => button
        .setButtonText("Done")
        .setCta()
        .onClick(() => this.close()));
  }

  getSectionMeta(sectionId) {
    const map = {
      "bookmark-groups": { label: "Bookmark Groups", desc: "Native Obsidian bookmarks and bookmark groups" },
      "pinned-notes": { label: "Pinned Notes", desc: "Notes pinned from Lighthouse Recents" },
      "open-tabs": { label: "Open Tabs", desc: "Currently open markdown notes" },
      "watch-folders": { label: "Watch Folders", desc: "Folders marked as watched in Lighthouse Files" }
    };
    return map[sectionId] || { label: sectionId, desc: "" };
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TextInputModal extends Modal {
  constructor(app, title, placeholder, value, onSubmit) {
    super(app);
    this.title = title;
    this.placeholder = placeholder;
    this.value = value || "";
    this.onSubmit = onSubmit;
    this.submitted = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("sdn-focus-edit-modal");
    contentEl.addClass("sdn-text-input-modal");

    contentEl.createEl("h2", { text: this.title });

    const input = contentEl.createEl("input", {
      type: "text",
      value: this.value,
      attr: { placeholder: this.placeholder }
    });

    const buttonRow = contentEl.createDiv({ cls: "sdn-modal-buttons" });
    const cancel = buttonRow.createEl("button", { text: "Cancel" });
    const submit = buttonRow.createEl("button", { text: "Create", cls: "mod-cta" });

    const finish = (result) => {
      this.submitted = true;
      this.onSubmit(result);
      this.close();
    };

    cancel.onclick = () => finish(null);
    submit.onclick = () => finish(input.value.trim() || null);

    input.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") finish(input.value.trim() || null);
      if (evt.key === "Escape") finish(null);
    });

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  onClose() {
    if (!this.submitted) this.onSubmit(null);
    this.contentEl.empty();
  }
}


class LighthouseSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Lighthouse" });

    containerEl.createEl("h3", { text: "Recents" });

    new Setting(containerEl)
      .setName("Recent font size")
      .setDesc("Default: 14 px.")
      .addSlider(s => s.setLimits(11, 24, 1).setValue(this.plugin.settings.recentFontSize || this.plugin.settings.navigatorFontSize).setDynamicTooltip().onChange(async v => {
        this.plugin.settings.recentFontSize = v;
        this.plugin.settings.navigatorFontSize = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Recent preview lines")
      .setDesc("Default: 1. Shows 0, 1, or 2 visible preview lines under each note.")
      .addDropdown(d => d
        .addOption("0", "0")
        .addOption("1", "1")
        .addOption("2", "2")
        .setValue(String(this.plugin.settings.previewLines))
        .onChange(async v => {
          this.plugin.settings.previewLines = Number(v);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Show location in Recent")
      .setDesc("Default: on. Shows the note folder path below the preview.")
      .addToggle(t => t.setValue(this.plugin.settings.showRecentLocation).onChange(async v => {
        this.plugin.settings.showRecentLocation = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Recent date display")
      .setDesc("Default: hidden. Controls created/modified dates in Recent only.")
      .addDropdown(d => d
        .addOption("hidden", "Hide dates")
        .addOption("modified", "Modified date")
        .addOption("created", "Created date")
        .addOption("both", "Modified and created dates")
        .setValue(this.plugin.settings.recentDateDisplay || "hidden")
        .onChange(async v => {
          this.plugin.settings.recentDateDisplay = v;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Recent date format")
      .setDesc("Default: relative. Relative dates switch to absolute after 7 days.")
      .addDropdown(d => d
        .addOption("relative", "Relative")
        .addOption("absolute", "Absolute")
        .setValue(this.plugin.settings.recentDateFormat || "relative")
        .onChange(async v => {
          this.plugin.settings.recentDateFormat = v;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Files" });

    new Setting(containerEl)
      .setName("File tree font size")
      .setDesc("Default: 13 px. Keep this smaller for denser folder browsing.")
      .addSlider(s => s.setLimits(11, 24, 1).setValue(this.plugin.settings.fileTreeFontSize || Math.max(11, this.plugin.settings.navigatorFontSize - 1)).setDynamicTooltip().onChange(async v => {
        this.plugin.settings.fileTreeFontSize = v;
        await this.plugin.saveSettings();
      }));

    containerEl.createEl("h3", { text: "Bookmarks" });

    new Setting(containerEl)
      .setName("Bookmarks font size")
      .setDesc("Default: 13 px. Applies only to the Bookmarks/Home view.")
      .addSlider(s => s.setLimits(11, 24, 1).setValue(this.plugin.settings.bookmarksFontSize || Math.max(11, this.plugin.settings.navigatorFontSize - 1)).setDynamicTooltip().onChange(async v => {
        this.plugin.settings.bookmarksFontSize = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Bookmarks item sort")
      .setDesc("Applies to notes and folders inside Bookmarks sections. Section order stays draggable.")
      .addDropdown(dropdown => dropdown
        .addOption("name-asc", "Name, A to Z")
        .addOption("name-desc", "Name, Z to A")
        .addOption("modified-desc", "Modified, newest first")
        .addOption("modified-asc", "Modified, oldest first")
        .addOption("created-desc", "Created, newest first")
        .addOption("created-asc", "Created, oldest first")
        .setValue(this.plugin.settings.bookmarksItemSort || "name-asc")
        .onChange(async value => {
          await this.plugin.setBookmarksItemSort(value);
        }));

    new Setting(containerEl)
      .setName("Show note and folder locations")
      .setDesc("Default: off. Shows the smaller path line under Bookmarks/Home notes and folders when on.")
      .addToggle(t => t.setValue(this.plugin.settings.showBookmarksLocation !== false).onChange(async v => {
        this.plugin.settings.showBookmarksLocation = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Show counts and extra info")
      .setDesc("Default: on. Controls counts and secondary info in Bookmarks/Home sections.")
      .addToggle(t => t.setValue(this.plugin.settings.showBookmarksInfo !== false).onChange(async v => {
        this.plugin.settings.showBookmarksInfo = v;
        await this.plugin.saveSettings();
      }));

    containerEl.createEl("h3", { text: "General" });

    new Setting(containerEl)
      .setName("Show scroll buttons")
      .setDesc("Default: on. Shows note-only scroll controls for top and bottom.")
      .addToggle(t => t.setValue(this.plugin.settings.showScrollButtons).onChange(async v => {
        this.plugin.settings.showScrollButtons = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Scroll button size")
      .setDesc("Default: 34 px. Only affects the floating note scroll buttons.")
      .addSlider(s => s.setLimits(26, 56, 1).setValue(this.plugin.settings.scrollButtonSize).setDynamicTooltip().onChange(async v => {
        this.plugin.settings.scrollButtonSize = v;
        await this.plugin.saveSettings();
      }));

    containerEl.createEl("h3", { text: "General note locations" });

    addFolderSuggestSetting(containerEl, this.plugin, "Default new note folder", "defaultNewNoteFolder");
    addFileSuggestSetting(containerEl, this.plugin, "Quick capture file", "quickCaptureFile");

    new Setting(containerEl)
      .setName("Open Quick Capture at bottom")
      .setDesc("Default: on. Opens the quick capture file and scrolls to the bottom for appending.")
      .addToggle(t => t.setValue(this.plugin.settings.openQuickCaptureAtBottom !== false).onChange(async v => {
        this.plugin.settings.openQuickCaptureAtBottom = v;
        await this.plugin.saveSettings();
      }));

    addFolderSuggestSetting(containerEl, this.plugin, "Daily notes folder", "dailyNotesFolder");

    new Setting(containerEl)
      .setName("Root display name")
      .setDesc("Used internally and in some labels. The visible root row is hidden in the file tree.")
      .addText(t => t.setValue(this.plugin.settings.rootDisplayName).onChange(async v => {
        this.plugin.settings.rootDisplayName = v || "Vault";
        await this.plugin.saveSettings();
      }));

    containerEl.createEl("h3", { text: "Navigation behavior" });

    new Setting(containerEl)
      .setName("Auto-open Lighthouse at startup")
      .setDesc("Default: on. Opens Lighthouse automatically when the vault loads.")
      .addToggle(t => t.setValue(this.plugin.settings.autoOpenNavigator).onChange(async v => {
        this.plugin.settings.autoOpenNavigator = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Auto-reveal current file in tree")
      .setDesc("Default: off. When enabled, active notes are automatically shown in the Files tree.")
      .addToggle(t => t.setValue(this.plugin.settings.autoRevealCurrentFile).onChange(async v => {
        this.plugin.settings.autoRevealCurrentFile = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Replace current note when opening from Lighthouse")
      .setDesc("Default: on. Reuses the current note tab when navigating from Lighthouse.")
      .addToggle(t => t.setValue(this.plugin.settings.replaceCurrentNote).onChange(async v => {
        this.plugin.settings.replaceCurrentNote = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Show side ribbon icon")
      .setDesc("Default: off. Mostly useful on desktop; mobile usually does not need this.")
      .addToggle(t => t.setValue(this.plugin.settings.showRibbonIcon).onChange(async v => {
        this.plugin.settings.showRibbonIcon = v;
        await this.plugin.saveSettings();
        new Notice("Restart Obsidian to fully apply ribbon icon changes.");
      }));

    containerEl.createEl("h3", { text: "Recents filtering" });

    new Setting(containerEl)
      .setName("Recent note limit")
      .setDesc("Default: 50. Maximum number of notes shown in Recent.")
      .addSlider(s => s.setLimits(10, 200, 10).setValue(this.plugin.settings.recentLimit).setDynamicTooltip().onChange(async v => {
        this.plugin.settings.recentLimit = v;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("Ignored paths or names")
      .setDesc("One per line. Hides matching notes/folders from Recent only. Examples: Templates, Attachments, 00.daily_note_template")
      .addTextArea(t => {
        t.inputEl.rows = 6;
        t.setValue(this.plugin.settings.ignoredPaths || "");
        t.onChange(async v => {
          this.plugin.settings.ignoredPaths = v;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: "Files watch folders" });

    new Setting(containerEl)
      .setName("Show watch indicator")
      .setDesc("Default: on. Shows a small accent-colored dot beside watched folders when they contain files.")
      .addToggle(t => t.setValue(this.plugin.settings.showWatchIndicator !== false).onChange(async v => {
        this.plugin.settings.showWatchIndicator = v;
        await this.plugin.saveSettings();
        this.plugin.refreshViews();
      }));

    new Setting(containerEl)
      .setName("Show empty watch status")
      .setDesc("Default: on. Shows a hollow dot when a watched folder has no visible notes.")
      .addToggle(t => t.setValue(this.plugin.settings.showEmptyWatchFolderStatus !== false).onChange(async v => {
        this.plugin.settings.showEmptyWatchFolderStatus = v;
        await this.plugin.saveSettings();
        this.plugin.refreshViews();
      }));

    new Setting(containerEl)
      .setName("Show zero counts")
      .setDesc("Default: on. Shows (0) for empty watched folders when watched folder counts are enabled.")
      .addToggle(t => t.setValue(this.plugin.settings.showZeroWatchCounts !== false).onChange(async v => {
        this.plugin.settings.showZeroWatchCounts = v;
        await this.plugin.saveSettings();
        this.plugin.refreshViews();
      }));

    new Setting(containerEl)
      .setName("Folder counts")
      .setDesc("Default: watched folders only. Shows recursive file counts beside watched folders or all folders.")
      .addDropdown(dropdown => dropdown
        .addOption("off", "Off")
        .addOption("watched", "Watched folders only")
        .addOption("all", "All folders")
        .setValue(this.plugin.settings.folderCountMode || (this.plugin.settings.showWatchCounts === true ? "watched" : "off"))
        .onChange(async value => {
          this.plugin.settings.folderCountMode = value;
          this.plugin.settings.showWatchCounts = value === "watched";
          await this.plugin.saveSettings();
          this.plugin.refreshViews();
        }));
  }
}

function addFolderSuggestSetting(containerEl, plugin, name, key) {
  const defaults = {
    defaultNewNoteFolder: "Default: 10 Inbox",
    dailyNotesFolder: "Default: 20 Daily Notes/YYYY/YYYY-MM. Supports YYYY, YYYY-MM, MM.",
    dailyNotesFolderPattern: "Default: 20 Daily Notes/YYYY/YYYY-MM. Supports YYYY, YYYY-MM, MM."
  };
  new Setting(containerEl)
    .setName(name)
    .setDesc(defaults[key] || "")
    .addSearch(search => {
      const input = search.inputEl;
      input.value = plugin.settings[key] || "";
      input.addEventListener("input", async () => {
        plugin.settings[key] = input.value;
        await plugin.saveSettings();
      });
    });
}

function addFileSuggestSetting(containerEl, plugin, name, key) {
  const defaults = {
    quickCaptureFile: "Default: Fragments.md"
  };
  new Setting(containerEl)
    .setName(name)
    .setDesc(defaults[key] || "")
    .addSearch(search => {
      const input = search.inputEl;
      input.value = plugin.settings[key] || "";
      input.addEventListener("input", async () => {
        plugin.settings[key] = input.value;
        await plugin.saveSettings();
      });
    });
}

async function ensureFolder(app, folderPath) {
  const folder = normalizePath(folderPath || "");
  if (!folder) return;
  const parts = folder.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

function shouldHide(file) {
  if (!file || !file.name) return false;
  if (file.name === ".obsidian") return true;
  if (file.name === ".trash") return true;
  if (file.name === "YYYY") return true;
  if (file.name === "MM") return true;
  return false;
}

function shouldHidePath(plugin, path) {
  if (!path) return false;
  const raw = plugin && plugin.settings && plugin.settings.ignoredPaths ? plugin.settings.ignoredPaths : "";
  const rules = raw
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(Boolean);

  const lowerPath = path.toLowerCase();
  const parts = lowerPath.split("/");

  for (const rule of rules) {
    const lowerRule = rule.toLowerCase();
    if (!lowerRule) continue;
    if (lowerPath === lowerRule) return true;
    if (lowerPath.startsWith(lowerRule + "/")) return true;
    if (parts.includes(lowerRule)) return true;
    if (lowerPath.includes(lowerRule)) return true;
  }
  return false;
}

function getAllFolderPaths(folder) {
  const paths = [folder.path || ""];
  for (const child of folder.children || []) {
    if (child instanceof TFolder && !shouldHide(child)) paths.push(...getAllFolderPaths(child));
  }
  return paths;
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function expandAncestors(set, path) {
  const parts = path.split("/");
  let cur = "";
  set.add("");
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part;
    set.add(cur);
  }
}

function getAncestorFolderSet(path) {
  const set = new Set([""]);
  const parts = path.split("/");
  parts.pop();
  let cur = "";
  for (const part of parts) {
    if (!part) continue;
    cur = cur ? `${cur}/${part}` : part;
    set.add(cur);
  }
  return set;
}

function getBookmarkChildren(item) {
  const children = item && (item.items || item.children);
  return Array.isArray(children) ? children : [];
}

function countBookmarkLeafItems(items) {
  let count = 0;
  for (const item of items || []) {
    const children = getBookmarkChildren(item);
    if (children.length && !item.path) count += countBookmarkLeafItems(children);
    else if (item && item.path) count++;
  }
  return count;
}

function stripFrontmatter(text) {
  if (!text || !text.startsWith("---")) return text || "";
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---" || lines[i].trim() === "...") {
      return lines.slice(i + 1).join("\n");
    }
  }
  return text;
}

function getVaultPathName(path) {
  const clean = normalizePath(path || "");
  if (!clean) return "/";
  const parts = clean.split("/").filter(Boolean);
  return parts[parts.length - 1] || clean;
}

function getParentVaultPath(path) {
  const clean = normalizePath(path || "");
  if (!clean || !clean.includes("/")) return "";
  return clean.split("/").slice(0, -1).join("/");
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function formatModifiedTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return "";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return "";
  }
}

function isLikelyTextPath(path) {
  const lower = String(path || "").toLowerCase();
  if (!lower || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".webp") || lower.endsWith(".heic")) return false;
  if (lower.endsWith(".pdf") || lower.endsWith(".zip") || lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".mp4") || lower.endsWith(".mov")) return false;
  return /\.(md|txt|json|css|js|ts|yml|yaml|toml|xml|html|csv|log|canvas|base)$/.test(lower) || !getVaultPathName(lower).includes(".");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text || "");
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text || "";
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function stripMarkdownPreviewText(text) {
  return (text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^[-*_]{3,}$/.test(l))
    .join(" ")
    .replace(/[#*_`>\[\]{}]/g, "")
    .replace(/!\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function isBookmarkGroupItem(item) {
  if (!item || item.path) return false;
  const type = String(item.type || item.kind || "").toLowerCase();
  if (type === "group" || type === "folder") return true;
  return Array.isArray(item.items) || Array.isArray(item.children);
}

async function addBookmarkGroup(app, name) {
  const clean = (name || "").trim();
  if (!clean) return;
  const instance = getBookmarksInstance(app);
  const items = getBookmarkRootItems(app);
  if (!instance || !items) throw new Error("Enable the Bookmarks core plugin first.");

  const existing = items.some(item => isBookmarkGroupItem(item) && (item.title || item.name) === clean);
  if (existing) throw new Error("A bookmark group with that name already exists.");

  if (typeof instance.createGroup === "function") {
    try { await instance.createGroup(clean); return; } catch (e) { console.warn("createGroup fallback", e); }
  }
  if (typeof instance.addGroup === "function") {
    try { await instance.addGroup(clean); return; } catch (e) { console.warn("addGroup fallback", e); }
  }

  const group = { type: "group", title: clean, items: [], ctime: Date.now() };
  if (typeof instance.addItem === "function") {
    try { await instance.addItem(group); return; } catch (e) { console.warn("addItem group fallback", e); }
  }

  items.push(group);
  await saveBookmarksInstance(instance);
  if (instance.bookmarkTree && Array.isArray(instance.bookmarkTree.items)) instance.bookmarkTree.items = items;
  if (Array.isArray(instance.items)) instance.items = items;
}

function getBookmarksInstance(app) {
  const bm = app.internalPlugins && app.internalPlugins.plugins && app.internalPlugins.plugins.bookmarks;
  return bm && bm.instance ? bm.instance : null;
}

function getBookmarkRootItems(app) {
  const instance = getBookmarksInstance(app);
  if (!instance) return null;
  if (Array.isArray(instance.items)) return instance.items;
  if (instance.bookmarkTree && Array.isArray(instance.bookmarkTree.items)) return instance.bookmarkTree.items;
  return null;
}

function isBookmarkedPath(app, path) {
  return getBookmarkItems(app).some(item => item && item.path === path);
}

async function saveBookmarksInstance(instance) {
  if (!instance) throw new Error("Bookmarks core plugin is not available.");
  if (typeof instance.saveData === "function") return await instance.saveData();
  if (typeof instance.requestSave === "function") return await instance.requestSave();
  if (typeof instance.save === "function") return await instance.save();
}

async function addBookmarkForFile(app, file) {
  const instance = getBookmarksInstance(app);
  const items = getBookmarkRootItems(app);
  if (!instance || !items) throw new Error("Enable the Bookmarks core plugin first.");
  if (isBookmarkedPath(app, file.path)) return;

  const isFolder = file instanceof TFolder;
  const item = {
    type: isFolder ? "folder" : "file",
    path: file.path,
    title: isFolder ? file.name : file.basename,
    ctime: Date.now()
  };

  // Prefer Obsidian's own methods when available. Fall back to the persisted
  // bookmark tree shape used by the core plugin so Lighthouse can still add a
  // simple file bookmark without reimplementing the native bookmark modal.
  if (typeof instance.addBookmark === "function") {
    try { await instance.addBookmark(item); return; } catch (e) { console.warn("addBookmark fallback", e); }
  }
  if (typeof instance.addItem === "function") {
    try { await instance.addItem(item); return; } catch (e) { console.warn("addItem fallback", e); }
  }

  items.push(item);
  await saveBookmarksInstance(instance);
}

function removeBookmarkItemByPath(items, path) {
  let removed = false;
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item && item.path === path) {
      items.splice(index, 1);
      removed = true;
      continue;
    }
    const children = item && (item.items || item.children);
    if (Array.isArray(children) && removeBookmarkItemByPath(children, path)) removed = true;
  }
  return removed;
}

async function removeBookmarkForPath(app, path) {
  const instance = getBookmarksInstance(app);
  const items = getBookmarkRootItems(app);
  if (!instance || !items) throw new Error("Enable the Bookmarks core plugin first.");
  if (!removeBookmarkItemByPath(items, path)) return;
  await saveBookmarksInstance(instance);
}

function getBookmarkItems(app) {
  try {
    const bm = app.internalPlugins && app.internalPlugins.plugins && app.internalPlugins.plugins.bookmarks;
    const instance = bm && bm.instance;
    if (!instance) return [];

    if (Array.isArray(instance.items)) return flattenBookmarks(instance.items);
    if (instance.bookmarkTree && Array.isArray(instance.bookmarkTree.items)) return flattenBookmarks(instance.bookmarkTree.items);
  } catch (e) {
    console.warn("Lighthouse bookmarks lookup failed", e);
  }
  return [];
}

function flattenBookmarks(items) {
  const out = [];
  for (const item of items || []) {
    if (item.path) out.push(item);
    if (item.items) out.push(...flattenBookmarks(item.items));
    if (item.children) out.push(...flattenBookmarks(item.children));
  }
  return out;
}

function formatDate(date, fmt) {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return fmt
    .replaceAll("YYYY", y)
    .replaceAll("MM", m)
    .replaceAll("DD", d)
    .replaceAll("HH", h)
    .replaceAll("mm", min);
}
