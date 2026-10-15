import { AbstractInputSuggest, App, TFolder, setIcon } from 'obsidian';

/**
 * Suggester for Obsidian folders across the vault.
 * Supports both single folder selection and multi-folder (comma-separated) selection.
 */
export class FolderSuggest extends AbstractInputSuggest<string> {
  inputEl: HTMLInputElement;
  private multiSelect: boolean;
  private onSelectCallback?: (value: string) => void;

  constructor(
    app: App,
    textInputEl: HTMLInputElement,
    multiSelect = false,
    onSelectCallback?: (value: string) => void
  ) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.multiSelect = multiSelect;
    this.onSelectCallback = onSelectCallback;
  }

  private getAllFolders(): string[] {
    const folders: string[] = [];
    const files = this.app.vault.getAllLoadedFiles();

    for (const file of files) {
      if (file instanceof TFolder && file.path !== '/') {
        folders.push(file.path);
      }
    }

    return folders.sort((a, b) => a.localeCompare(b));
  }

  protected getSuggestions(query: string): string[] {
    let activeQuery = query;
    if (this.multiSelect) {
      const parts = query.split(',');
      activeQuery = parts[parts.length - 1];
    }
    const cleanQuery = activeQuery.trim().toLowerCase();

    const allFolders = this.getAllFolders();
    if (!cleanQuery) {
      return allFolders.slice(0, 50);
    }

    return allFolders
      .filter(f => f.toLowerCase().includes(cleanQuery))
      .slice(0, 50);
  }

  renderSuggestion(folderPath: string, el: HTMLElement): void {
    el.addClass('property-painter-suggest-item');
    const iconSpan = el.createSpan({ cls: 'property-painter-suggest-icon' });
    setIcon(iconSpan, 'folder');
    el.createSpan({ cls: 'property-painter-suggest-text', text: folderPath });
  }

  selectSuggestion(folderPath: string): void {
    if (this.multiSelect) {
      const parts = this.inputEl.value.split(',');
      parts[parts.length - 1] = parts.length > 1 ? ` ${folderPath}` : folderPath;
      const result = parts.join(',').trim();
      this.setValue(result);
    } else {
      this.setValue(folderPath);
    }

    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(this.inputEl.value);
    }
    this.close();
  }
}

/**
 * Suggester for tags across the vault (from frontmatter tags and inline tags).
 */
export class TagSuggest extends AbstractInputSuggest<string> {
  inputEl: HTMLInputElement;
  private getPropertyKey?: () => string;
  private onSelectCallback?: (value: string) => void;

  constructor(
    app: App,
    textInputEl: HTMLInputElement,
    getPropertyKey?: () => string,
    onSelectCallback?: (value: string) => void
  ) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.getPropertyKey = getPropertyKey;
    this.onSelectCallback = onSelectCallback;
  }

  private getAllTags(): string[] {
    const tagsSet = new Set<string>();

    // 1. Try metadataCache.getTags() if available on Obsidian runtime
    const cacheAny = this.app.metadataCache as any;
    if (typeof cacheAny?.getTags === 'function') {
      const tagsObj = cacheAny.getTags();
      if (tagsObj && typeof tagsObj === 'object') {
        Object.keys(tagsObj).forEach(t => {
          const clean = t.replace(/^#/, '');
          if (clean) tagsSet.add(clean);
        });
      }
    }

    // 2. Scan cached metadata across all markdown files for 100% complete tag coverage
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;

      // Inline tags in body
      if (cache.tags) {
        for (const t of cache.tags) {
          const clean = t.tag.replace(/^#/, '');
          if (clean) tagsSet.add(clean);
        }
      }

      // Frontmatter tags
      const fmTags = cache.frontmatter?.tags ?? cache.frontmatter?.tag;
      if (fmTags) {
        if (Array.isArray(fmTags)) {
          for (const item of fmTags) {
            if (item) {
              const clean = String(item).trim().replace(/^#/, '');
              if (clean) tagsSet.add(clean);
            }
          }
        } else if (typeof fmTags === 'string') {
          fmTags.split(',').forEach(item => {
            const clean = item.trim().replace(/^#/, '');
            if (clean) tagsSet.add(clean);
          });
        }
      }
    }

    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  }

  protected getSuggestions(query: string): string[] {
    const propKey = (this.getPropertyKey ? this.getPropertyKey() : '').toLowerCase().trim();
    const isTagProperty = propKey.includes('tag');

    // Extract active token if comma-separated
    const parts = query.split(',');
    const activeToken = parts[parts.length - 1].trim();
    const cleanQuery = activeToken.replace(/^#/, '').toLowerCase();

    // If not a tag property, only suggest if user started typing with '#' or query matches tags
    if (!isTagProperty && !activeToken.startsWith('#') && !cleanQuery) {
      return [];
    }

    const allTags = this.getAllTags();
    if (!cleanQuery) {
      return allTags.slice(0, 50);
    }

    return allTags
      .filter(t => t.toLowerCase().includes(cleanQuery))
      .slice(0, 50);
  }

  renderSuggestion(tag: string, el: HTMLElement): void {
    el.addClass('property-painter-suggest-item');
    const iconSpan = el.createSpan({ cls: 'property-painter-suggest-icon' });
    setIcon(iconSpan, 'hash');
    el.createSpan({ cls: 'property-painter-suggest-text', text: tag });
  }

  selectSuggestion(tag: string): void {
    const parts = this.inputEl.value.split(',');
    const lastPart = parts[parts.length - 1].trim();
    const hadHash = lastPart.startsWith('#');
    const formatted = hadHash ? `#${tag}` : tag;

    if (parts.length > 1) {
      parts[parts.length - 1] = ` ${formatted}`;
      this.setValue(parts.join(',').trim());
    } else {
      this.setValue(formatted);
    }

    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(this.inputEl.value);
    }
    this.close();
  }
}

/**
 * Suggester for frontmatter property keys across the vault (e.g., tags, shelf, status).
 */
export class PropertyKeySuggest extends AbstractInputSuggest<string> {
  inputEl: HTMLInputElement;
  private onSelectCallback?: (value: string) => void;

  constructor(app: App, textInputEl: HTMLInputElement, onSelectCallback?: (value: string) => void) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.onSelectCallback = onSelectCallback;
  }

  private getAllPropertyKeys(): string[] {
    const keysSet = new Set<string>(['tags', 'shelf', 'status', 'category', 'priority', 'rating', 'type']);

    const cacheAny = this.app.metadataCache as any;
    if (typeof cacheAny?.getAllPropertyInfos === 'function') {
      const infos = cacheAny.getAllPropertyInfos();
      if (infos && typeof infos === 'object') {
        Object.keys(infos).forEach(k => keysSet.add(k));
      }
    }

    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter) {
        Object.keys(cache.frontmatter).forEach(k => {
          if (k !== 'position') keysSet.add(k);
        });
      }
    }

    return Array.from(keysSet).sort((a, b) => a.localeCompare(b));
  }

  protected getSuggestions(query: string): string[] {
    const cleanQuery = query.trim().toLowerCase();
    const allKeys = this.getAllPropertyKeys();

    if (!cleanQuery) {
      return allKeys.slice(0, 50);
    }

    return allKeys
      .filter(k => k.toLowerCase().includes(cleanQuery))
      .slice(0, 50);
  }

  renderSuggestion(key: string, el: HTMLElement): void {
    el.addClass('property-painter-suggest-item');
    const iconSpan = el.createSpan({ cls: 'property-painter-suggest-icon' });
    setIcon(iconSpan, 'tag');
    el.createSpan({ cls: 'property-painter-suggest-text', text: key });
  }

  selectSuggestion(key: string): void {
    this.setValue(key);
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(key);
    }
    this.close();
  }
}
