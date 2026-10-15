import { MarkdownView, Plugin, TFile, debounce } from 'obsidian';
import { PropertyPainterSettings, DEFAULT_SETTINGS } from './types';
import { ThumbnailManager } from './thumbnail-manager';
import { RuleManager } from './rule-manager';
import { ExplorerStyler } from './explorer-styler';
import { ImagePreviewModal } from './image-modal';
import { PropertyPainterSettingTab } from './settings';

export default class PropertyPainterPlugin extends Plugin {
  settings: PropertyPainterSettings = DEFAULT_SETTINGS;
  thumbnailManager!: ThumbnailManager;
  ruleManager!: RuleManager;
  explorerStyler!: ExplorerStyler;
  private viewObserver: MutationObserver | null = null;
  public debouncedRefreshActive: () => void;

  constructor(app: any, manifest: any) {
    super(app, manifest);
    this.debouncedRefreshActive = debounce(() => {
      this.refreshActiveMarkdownView();
    }, 40, true);
  }

  async onload(): Promise<void> {
    await this.loadSettings();

    this.thumbnailManager = new ThumbnailManager(this.app);
    this.ruleManager = new RuleManager(this.app);
    this.explorerStyler = new ExplorerStyler(this.app, this.ruleManager);

    // Register Settings Tab
    this.addSettingTab(new PropertyPainterSettingTab(this.app, this));

    // Register Commands
    this.addCommand({
      id: 'repaint-all',
      name: 'Repaint properties and File Explorer',
      callback: () => {
        this.refreshAllViews();
      }
    });

    this.addCommand({
      id: 'toggle-cover-thumbnail',
      name: 'Toggle cover thumbnail beside properties',
      callback: async () => {
        this.settings.thumbnailEnabled = !this.settings.thumbnailEnabled;
        await this.saveSettings();
        this.refreshAllViews();
      }
    });

    // Register Workspace & Cache Events
    const triggerRefreshWithRetries = () => {
      this.debouncedRefreshActive();
      setTimeout(() => this.refreshActiveMarkdownView(), 60);
      setTimeout(() => this.refreshActiveMarkdownView(), 250);
    };

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        triggerRefreshWithRetries();
        this.explorerStyler.debouncedUpdateAll();
      })
    );

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        triggerRefreshWithRetries();
        this.attachLivePreviewListeners();
      })
    );

    this.registerEvent(
      this.app.workspace.on('file-open', () => {
        triggerRefreshWithRetries();
        this.attachLivePreviewListeners();
      })
    );

    this.registerEvent(
      this.app.workspace.on('editor-change', () => {
        this.debouncedRefreshActive();
      })
    );

    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        this.refreshAllViews();
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', (file: TFile) => {
        this.debouncedRefreshActive();
        this.explorerStyler.updateFileItem(file, this.settings);
      })
    );

    this.registerEvent(
      this.app.vault.on('rename', () => {
        this.explorerStyler.debouncedUpdateAll();
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', () => {
        this.explorerStyler.debouncedUpdateAll();
      })
    );

    // Setup after Obsidian workspace layout is ready
    this.app.workspace.onLayoutReady(() => {
      this.explorerStyler.initObserver();
      this.attachLivePreviewListeners();
      this.refreshAllViews();
      setTimeout(() => this.refreshAllViews(), 100);
      setTimeout(() => this.refreshAllViews(), 350);
    });
  }

  onunload(): void {
    if (this.viewObserver) {
      this.viewObserver.disconnect();
      this.viewObserver = null;
    }

    this.explorerStyler.clearAllExplorerStyles();

    // Clean up thumbnails from any currently open MarkdownViews
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    leaves.forEach(leaf => {
      if (leaf.view instanceof MarkdownView) {
        const metaContainers = leaf.view.contentEl.querySelectorAll<HTMLElement>('.metadata-container');
        metaContainers.forEach(container => {
          container.classList.remove(
            'property-painter-has-thumbnail',
            'property-painter-pos-left',
            'property-painter-pos-right'
          );
          const thumb = container.querySelector('.property-painter-thumbnail-container');
          if (thumb) thumb.remove();
        });
      }
    });
  }

  async loadSettings(): Promise<void> {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
    if (!this.settings.rules || this.settings.rules.length === 0) {
      this.settings.rules = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.rules));
    } else {
      // Ensure existing saved rules have all styling properties populated
      this.settings.rules.forEach(rule => {
        if (rule.prefixIcon === undefined) rule.prefixIcon = '';
        if (rule.propertyBold === undefined) rule.propertyBold = false;
        if (rule.propertyItalic === undefined) rule.propertyItalic = false;
        if (rule.propertyStrike === undefined) rule.propertyStrike = false;
        if (rule.explorerBold === undefined) rule.explorerBold = false;
        if (rule.explorerItalic === undefined) rule.explorerItalic = false;
        if (rule.explorerStrike === undefined) rule.explorerStrike = false;
        if (rule.explorerDotGlow === undefined) rule.explorerDotGlow = true;
        if (rule.folderScope === undefined) rule.folderScope = 'global';
        if (rule.folderPath === undefined) rule.folderPath = '';
        if (rule.exceptFolderPath === undefined) rule.exceptFolderPath = '';
        if (rule.showExplorerDot === undefined) rule.showExplorerDot = true;
        if (rule.applyToFileExplorer === undefined) rule.applyToFileExplorer = true;
      });
    }

    if (this.settings.overrideGlobalSettings === undefined) {
      this.settings.overrideGlobalSettings = this.settings.overrideGlobalExplorerSettings ?? true;
    }
    if (this.settings.globalStyleMode === undefined) this.settings.globalStyleMode = 'badge';
    if (this.settings.globalPropertyBold === undefined) this.settings.globalPropertyBold = false;
    if (this.settings.globalPropertyItalic === undefined) this.settings.globalPropertyItalic = false;
    if (this.settings.globalPropertyStrike === undefined) this.settings.globalPropertyStrike = false;
    if (this.settings.globalExplorerBold === undefined) this.settings.globalExplorerBold = false;
    if (this.settings.globalExplorerItalic === undefined) this.settings.globalExplorerItalic = false;
    if (this.settings.globalExplorerStrike === undefined) this.settings.globalExplorerStrike = false;
    if (this.settings.globalShowExplorerDot === undefined) this.settings.globalShowExplorerDot = true;
    if (this.settings.globalExplorerDotGlow === undefined) this.settings.globalExplorerDotGlow = true;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Patches Obsidian's MetadataEditor to guarantee live preview and widget re-renders are captured
   */
  public patchMetadataEditor(view: MarkdownView): void {
    const metaEditor = (view as any).metadataEditor;
    if (!metaEditor || metaEditor._pp_patched) return;
    metaEditor._pp_patched = true;

    const origSync = metaEditor.synchronize;
    if (typeof origSync === 'function') {
      const self = this;
      metaEditor.synchronize = function(...args: any[]) {
        const res = origSync.apply(this, args);
        setTimeout(() => {
          self.updateMarkdownView(view);
        }, 10);
        setTimeout(() => {
          self.updateMarkdownView(view);
        }, 100);
        return res;
      };
    }
  }

  /**
   * Watches DOM changes inside active view to guarantee Live Preview and CodeMirror widgets are styled
   */
  public attachLivePreviewListeners(): void {
    if (this.viewObserver) {
      this.viewObserver.disconnect();
      this.viewObserver = null;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    this.patchMetadataEditor(activeView);

    this.viewObserver = new MutationObserver((mutations) => {
      // Ignore mutations originating strictly within our own thumbnail container
      const isOnlyThumbnailMutation = mutations.every(m => {
        const target = m.target as HTMLElement;
        return target && (
          target.classList?.contains('property-painter-thumbnail-container') ||
          target.closest?.('.property-painter-thumbnail-container') !== null
        );
      });
      if (!isOnlyThumbnailMutation) {
        this.debouncedRefreshActive();
      }
    });

    this.viewObserver.observe(activeView.contentEl, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Real-time listener for typing or interacting inside property inputs in Live Preview
    const handleEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.metadata-container')) {
        this.debouncedRefreshActive();
      }
    };

    activeView.contentEl.addEventListener('input', handleEvent);
    activeView.contentEl.addEventListener('keyup', handleEvent);
    activeView.contentEl.addEventListener('change', handleEvent);
    activeView.contentEl.addEventListener('focusout', handleEvent);
  }

  /**
   * Refreshes the currently active Markdown view
   */
  public refreshActiveMarkdownView(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      this.updateMarkdownView(activeView);
    }
  }

  /**
   * Refreshes all open markdown views and the file explorer
   */
  public refreshAllViews(): void {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    leaves.forEach(leaf => {
      if (leaf.view instanceof MarkdownView) {
        this.updateMarkdownView(leaf.view);
      }
    });

    this.explorerStyler.updateAllExplorerItems(this.settings);
  }

  /**
   * Updates thumbnail and property colors for a specific Markdown view
   */
  public updateMarkdownView(view: MarkdownView): void {
    if (!view || !view.file) return;

    this.patchMetadataEditor(view);

    // 1. Update thumbnail
    this.thumbnailManager.updateViewThumbnail(
      view,
      this.settings,
      (url: string, rawRef: string, file: TFile | null) => {
        this.handleImageClick(url, rawRef, file);
      }
    );

    // 2. Update property colors
    this.ruleManager.updateViewProperties(view, this.settings);
  }

  /**
   * Action triggered when clicking thumbnail
   */
  private handleImageClick(url: string, rawRef: string, file: TFile | null): void {
    if (this.settings.thumbnailClickAction === 'open-file' && file) {
      this.app.workspace.openLinkText(file.path, '', true);
    } else if (this.settings.thumbnailClickAction === 'modal') {
      new ImagePreviewModal(this.app, url, rawRef, file).open();
    }
  }
}
