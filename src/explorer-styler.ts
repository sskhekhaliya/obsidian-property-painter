import { App, TFile, debounce } from 'obsidian';
import { PropertyPainterSettings } from './types';
import { RuleManager } from './rule-manager';
import { getAdaptiveTextColor, isDarkTheme } from './color-utils';

export class ExplorerStyler {
  private app: App;
  private ruleManager: RuleManager;
  private observer: MutationObserver | null = null;
  public debouncedUpdateAll: () => void;

  constructor(app: App, ruleManager: RuleManager) {
    this.app = app;
    this.ruleManager = ruleManager;

    this.debouncedUpdateAll = debounce(() => {
      this.updateAllExplorerItems();
    }, 100, true);
  }

  /**
   * Initializes the mutation observer on file explorer containers
   */
  public initObserver(): void {
    this.disconnectObserver();

    const explorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
    if (explorerLeaves.length === 0) return;

    this.observer = new MutationObserver(() => {
      this.debouncedUpdateAll();
    });

    explorerLeaves.forEach(leaf => {
      const container = leaf.view.containerEl.querySelector('.nav-files-container');
      if (container) {
        this.observer?.observe(container, {
          childList: true,
          subtree: true
        });
      }
    });

    this.updateAllExplorerItems();
  }

  public disconnectObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Updates styling for a specific file across all file explorer leaves
   */
  public updateFileItem(file: TFile, settings: PropertyPainterSettings): void {
    if (!file || file.extension !== 'md') return;

    const explorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
    if (explorerLeaves.length === 0) return;

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    const rule = settings.explorerEnabled
      ? this.ruleManager.findMatchingExplorerRule(settings.rules, frontmatter, file.path)
      : null;

    explorerLeaves.forEach(leaf => {
      const titleEls = leaf.view.containerEl.querySelectorAll<HTMLElement>(
        `.nav-file-title[data-path="${CSS.escape(file.path)}"]`
      );

      titleEls.forEach(titleEl => {
        this.applyStyleToTitleEl(titleEl, rule, settings);
      });
    });
  }

  /**
   * Updates all file items in file explorer
   */
  public updateAllExplorerItems(settings?: PropertyPainterSettings): void {
    const explorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
    if (explorerLeaves.length === 0) return;

    const currentSettings = settings || (this.app as any).plugins.plugins['obsidian-property-painter']?.settings;
    if (!currentSettings) return;

    explorerLeaves.forEach(leaf => {
      const titleEls = leaf.view.containerEl.querySelectorAll<HTMLElement>('.nav-file-title[data-path]');
      titleEls.forEach(titleEl => {
        const path = titleEl.getAttribute('data-path');
        if (!path) return;

        const abstractFile = this.app.vault.getAbstractFileByPath(path);
        if (abstractFile instanceof TFile && abstractFile.extension === 'md') {
          const cache = this.app.metadataCache.getFileCache(abstractFile);
          const frontmatter = cache?.frontmatter;
          const rule = currentSettings.explorerEnabled
            ? this.ruleManager.findMatchingExplorerRule(currentSettings.rules, frontmatter, abstractFile.path)
            : null;

          this.applyStyleToTitleEl(titleEl, rule, currentSettings);
        }
      });
    });
  }

  /**
   * Applies or clears styling on an individual .nav-file-title element
   */
  private applyStyleToTitleEl(
    titleEl: HTMLElement,
    rule: any | null,
    settings: PropertyPainterSettings
  ): void {
    const contentEl = titleEl.querySelector<HTMLElement>('.nav-file-title-content');
    let dotEl = titleEl.querySelector<HTMLElement>('.property-painter-dot');

    if (!rule || !settings.explorerEnabled || !rule.applyToFileExplorer) {
      if (contentEl) {
        contentEl.style.color = '';
        contentEl.style.fontWeight = '';
        contentEl.style.fontStyle = '';
        contentEl.style.textDecoration = '';
        contentEl.classList.remove(
          'property-painter-styled-title',
          'is-bold',
          'is-italic',
          'is-strike'
        );
      }
      if (dotEl) {
        dotEl.remove();
      }
      titleEl.removeAttribute('data-property-painter-rule');
      return;
    }

    const effectiveColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
    titleEl.setAttribute('data-property-painter-rule', rule.id);

    // Determine effective explorer styling based on overrideGlobalSettings toggle
    const usePerRule = settings.overrideGlobalSettings ?? settings.overrideGlobalExplorerSettings ?? true;
    const isBold = usePerRule ? rule.explorerBold : settings.globalExplorerBold;
    const isItalic = usePerRule ? rule.explorerItalic : settings.globalExplorerItalic;
    const isStrike = usePerRule ? rule.explorerStrike : settings.globalExplorerStrike;
    const shouldShowDot = usePerRule ? (rule.showExplorerDot ?? true) : settings.globalShowExplorerDot;
    const hasGlow = usePerRule ? (rule.explorerDotGlow ?? true) : settings.globalExplorerDotGlow;

    // 1. Text color and font formatting
    if (contentEl) {
      contentEl.style.color = effectiveColor;
      contentEl.classList.add('property-painter-styled-title');

      // Bold styling
      if (isBold) {
        contentEl.style.fontWeight = 'bold';
        contentEl.classList.add('is-bold');
      } else {
        contentEl.style.fontWeight = 'normal';
        contentEl.classList.remove('is-bold');
      }

      // Italic styling
      if (isItalic) {
        contentEl.style.fontStyle = 'italic';
        contentEl.classList.add('is-italic');
      } else {
        contentEl.style.fontStyle = 'normal';
        contentEl.classList.remove('is-italic');
      }

      // Strikethrough styling
      if (isStrike) {
        contentEl.style.textDecoration = 'line-through';
        contentEl.classList.add('is-strike');
      } else {
        contentEl.style.textDecoration = 'none';
        contentEl.classList.remove('is-strike');
      }
    }

    // 2. Indicator Dot
    if (shouldShowDot) {
      if (!dotEl) {
        dotEl = document.createElement('span');
        dotEl.className = 'property-painter-dot';
        if (contentEl) {
          titleEl.insertBefore(dotEl, contentEl);
        } else {
          titleEl.appendChild(dotEl);
        }
      }
      dotEl.style.backgroundColor = effectiveColor;
      dotEl.style.width = `${settings.explorerDotSize}px`;
      dotEl.style.height = `${settings.explorerDotSize}px`;
      dotEl.setAttribute('title', `${rule.property}: ${rule.value}`);

      if (hasGlow) {
        dotEl.classList.add('has-glow');
        const isDark = isDarkTheme();
        if (isDark) {
          dotEl.style.boxShadow = `0 0 5px ${effectiveColor}, 0 0 10px ${effectiveColor}`;
        } else {
          dotEl.style.boxShadow = `0 0 0 1.5px var(--background-primary), 0 0 5px ${effectiveColor}, 0 0 11px ${effectiveColor}`;
        }
      } else {
        dotEl.classList.remove('has-glow');
        dotEl.style.boxShadow = 'none';
      }
    } else if (dotEl) {
      dotEl.remove();
    }
  }

  /**
   * Cleans up all applied styles when plugin unloads
   */
  public clearAllExplorerStyles(): void {
    this.disconnectObserver();

    const explorerLeaves = this.app.workspace.getLeavesOfType('file-explorer');
    explorerLeaves.forEach(leaf => {
      const styledTitles = leaf.view.containerEl.querySelectorAll<HTMLElement>('.property-painter-styled-title');
      styledTitles.forEach(el => {
        el.style.color = '';
        el.style.fontWeight = '';
        el.style.fontStyle = '';
        el.style.textDecoration = '';
        el.classList.remove(
          'property-painter-styled-title',
          'is-bold',
          'is-italic',
          'is-strike'
        );
      });

      const dots = leaf.view.containerEl.querySelectorAll<HTMLElement>('.property-painter-dot');
      dots.forEach(dot => dot.remove());

      const taggedElements = leaf.view.containerEl.querySelectorAll<HTMLElement>('[data-property-painter-rule]');
      taggedElements.forEach(el => el.removeAttribute('data-property-painter-rule'));
    });
  }
}
