import { App, MarkdownView, setIcon } from 'obsidian';
import { PropertyColorRule, PropertyPainterSettings, RuleStyleMode } from './types';
import { getAdaptiveTextColor, getAdaptiveBackgroundColor } from './color-utils';

export class RuleManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Tests if a given value matches a rule condition
   */
  public matchesRule(rule: PropertyColorRule, targetValue: any): boolean {
    if (rule.operator === 'empty') {
      if (targetValue === null || targetValue === undefined) return true;
      if (Array.isArray(targetValue)) {
        return targetValue.length === 0 || targetValue.every(item => item === null || item === undefined || String(item).trim() === '');
      }
      if (typeof targetValue === 'string') {
        return targetValue.trim() === '';
      }
      return false;
    }

    if (rule.operator === 'filled') {
      if (targetValue === null || targetValue === undefined) return false;
      if (Array.isArray(targetValue)) {
        return targetValue.length > 0 && targetValue.some(item => item !== null && item !== undefined && String(item).trim() !== '');
      }
      if (typeof targetValue === 'string') {
        return targetValue.trim() !== '';
      }
      if (typeof targetValue === 'number' || typeof targetValue === 'boolean') {
        return true;
      }
      if (typeof targetValue === 'object') {
        return Object.keys(targetValue).length > 0;
      }
      return Boolean(targetValue);
    }

    if (targetValue === null || targetValue === undefined) return false;

    if (Array.isArray(targetValue)) {
      return targetValue.some(item => this.matchesRule(rule, item));
    }

    const valStr = String(targetValue).trim();
    if (!valStr) return false;

    if (rule.operator === 'regex') {
      try {
        const re = new RegExp(rule.value || '', rule.caseSensitive ? '' : 'i');
        return re.test(valStr);
      } catch {
        return false;
      }
    }

    const rawTargets = (rule.value || '')
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (rawTargets.length === 0) return false;

    const targets = rule.caseSensitive ? rawTargets : rawTargets.map(v => v.toLowerCase());
    const source = rule.caseSensitive ? valStr : valStr.toLowerCase();

    const matchesSingle = (src: string, tgt: string): boolean => {
      switch (rule.operator) {
        case 'equals': {
          if (src === tgt) return true;
          const cleanSrc = src.replace(/^#/, '');
          const cleanTgt = tgt.replace(/^#/, '');
          return cleanSrc === cleanTgt;
        }
        case 'contains': {
          if (src.includes(tgt)) return true;
          const cleanTgt = tgt.replace(/^#/, '');
          return cleanTgt ? src.includes(cleanTgt) : false;
        }
        case 'starts-with': {
          if (src.startsWith(tgt)) return true;
          const cleanTgt = tgt.replace(/^#/, '');
          return cleanTgt ? src.startsWith(cleanTgt) : false;
        }
        case 'ends-with': {
          if (src.endsWith(tgt)) return true;
          const cleanTgt = tgt.replace(/^#/, '');
          return cleanTgt ? src.endsWith(cleanTgt) : false;
        }
        default:
          return src === tgt;
      }
    };

    if (targets.some(tgt => matchesSingle(source, tgt))) {
      return true;
    }

    // If source has comma-separated values in note string, test each item
    if (source.includes(',')) {
      const sourceParts = source.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return sourceParts.some(part => targets.some(tgt => matchesSingle(part, tgt)));
    }

    return false;
  }

  /**
   * Tests if a file path satisfies a rule's folder scope (apply to folder & except folder)
   */
  public isFileMatchingFolderScope(rule: PropertyColorRule, filePath?: string): boolean {
    if (!filePath) return true;

    const normalizedPath = filePath.replace(/\\/g, '/').trim();
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    const fileDir = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
    const lowerFileDir = fileDir.toLowerCase();

    // 1. Check Except / Excluded folder(s)
    if (rule.exceptFolderPath && rule.exceptFolderPath.trim()) {
      const exceptList = rule.exceptFolderPath
        .split(',')
        .map(f => f.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);

      for (const exceptFolder of exceptList) {
        const lowerExcept = exceptFolder.toLowerCase();
        if (lowerFileDir === lowerExcept || lowerFileDir.startsWith(lowerExcept + '/')) {
          return false;
        }
      }
    }

    // 2. Check Apply To folder scope
    if (rule.folderScope === 'folder' && rule.folderPath && rule.folderPath.trim()) {
      const targetFolder = rule.folderPath.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      if (targetFolder) {
        const lowerTarget = targetFolder.toLowerCase();
        if (lowerFileDir !== lowerTarget && !lowerFileDir.startsWith(lowerTarget + '/')) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Finds the first matching rule for a property key & value in properties view
   */
  public findMatchingPropertyRule(
    rules: PropertyColorRule[],
    key: string,
    value: any,
    filePath?: string
  ): PropertyColorRule | null {
    const lowerKey = key.trim().toLowerCase();
    for (const rule of rules) {
      if (!rule.enabled || !rule.applyToProperties) continue;
      if (!this.isFileMatchingFolderScope(rule, filePath)) continue;

      const ruleKeys = (rule.property || '')
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      if (ruleKeys.includes(lowerKey)) {
        if (this.matchesRule(rule, value)) {
          return rule;
        }
      }
    }
    return null;
  }

  /**
   * Finds the first matching rule for file explorer based on a note's frontmatter
   */
  public findMatchingExplorerRule(
    rules: PropertyColorRule[],
    frontmatter: Record<string, any> | undefined,
    filePath?: string
  ): PropertyColorRule | null {
    if (!frontmatter) return null;

    for (const rule of rules) {
      if (!rule.enabled || !rule.applyToFileExplorer) continue;
      if (!this.isFileMatchingFolderScope(rule, filePath)) continue;

      const ruleKeys = (rule.property || '')
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      const matchingKey = Object.keys(frontmatter).find(k => ruleKeys.includes(k.trim().toLowerCase()));
      if (matchingKey !== undefined) {
        const val = frontmatter[matchingKey];
        if (this.matchesRule(rule, val)) {
          return rule;
        }
      }
    }
    return null;
  }

  /**
   * Styles properties in the active MarkdownView's metadata container (both Live Preview & Reading View)
   */
  public updateViewProperties(view: MarkdownView, settings: PropertyPainterSettings): void {
    if (!view || !view.file) return;

    // Collect all metadata containers in view across contentEl, containerEl, and metadataEditor
    const metadataContainers: HTMLElement[] = [];
    if (view.contentEl) {
      view.contentEl.querySelectorAll<HTMLElement>('.metadata-container').forEach(c => metadataContainers.push(c));
    }
    if (view.containerEl) {
      view.containerEl.querySelectorAll<HTMLElement>('.metadata-container').forEach(c => {
        if (!metadataContainers.includes(c)) metadataContainers.push(c);
      });
    }
    const editorContainer = (view as any).metadataEditor?.containerEl;
    if (editorContainer && !metadataContainers.includes(editorContainer)) {
      metadataContainers.push(editorContainer);
    }

    if (metadataContainers.length === 0) return;

    const cache = this.app.metadataCache.getFileCache(view.file);
    const frontmatter = cache?.frontmatter;
    const filePath = view.file.path;

    metadataContainers.forEach(container => {
      const propertyElements = container.querySelectorAll<HTMLElement>('.metadata-property');

      propertyElements.forEach(propEl => {
        let key = propEl.getAttribute('data-property-key');
        if (!key) {
          const keyInput = propEl.querySelector<HTMLInputElement>(
            '.metadata-property-key-input, input.metadata-property-key, .metadata-property-key'
          );
          key = keyInput ? (keyInput.value || keyInput.textContent || '').trim() : '';
        }

        if (!key) return;

        const valueEl = propEl.querySelector<HTMLElement>('.metadata-property-value');
        if (!valueEl) return;

        // Ensure clicking anywhere inside the property value box focuses the input element
        if (!valueEl.hasAttribute('data-pp-click-bound')) {
          valueEl.setAttribute('data-pp-click-bound', 'true');
          const focusInput = (e: MouseEvent | PointerEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.multi-select-pill') || target.closest('.property-painter-prefix-icon')) return;
            const input = valueEl.querySelector<HTMLElement>(
              '.metadata-input-longtext, input, textarea, [contenteditable]'
            );
            if (input && target !== input && !input.contains(target)) {
              e.preventDefault();
              input.focus();
              if (input.isContentEditable) {
                const range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
              } else if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
                input.setSelectionRange(input.value.length, input.value.length);
              }
            }
          };
          valueEl.addEventListener('pointerdown', focusInput);
          valueEl.addEventListener('click', focusInput);
        }

        // Frontmatter value from cache
        let fmValue = frontmatter ? frontmatter[key] : undefined;
        if (fmValue === undefined && frontmatter) {
          const matchKey = Object.keys(frontmatter).find(k => k.toLowerCase() === key!.toLowerCase());
          if (matchKey) fmValue = frontmatter[matchKey];
        }

        // Check real-time DOM value (critical for Live Preview while typing)
        const textInput = valueEl.querySelector<HTMLElement>(
          '.metadata-input-longtext, input, textarea, [contenteditable]'
        );
        let liveVal: string | undefined = undefined;
        if (textInput) {
          const inpVal = (textInput as HTMLInputElement).value;
          if (inpVal !== undefined && inpVal !== '') {
            liveVal = inpVal.trim();
          } else {
            const txt = (textInput.textContent || '').trim();
            if (txt) liveVal = txt;
          }
        } else {
          // Reading view or non-input container: extract text ignoring prefix icon
          const clone = valueEl.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.property-painter-prefix-icon').forEach(n => n.remove());
          const txt = (clone.textContent || '').trim();
          if (txt) liveVal = txt;
        }

        const effectiveValue = liveVal !== undefined ? liveVal : fmValue;

        const isEditing = propEl.contains(document.activeElement) || valueEl.contains(document.activeElement);

        // Clean up any deprecated pillWrapper if present from prior versions
        const oldWrapper = valueEl.querySelector<HTMLElement>(':scope > .property-painter-value-pill');
        if (oldWrapper) {
          while (oldWrapper.firstChild) {
            const child = oldWrapper.firstChild;
            if (child instanceof HTMLElement && child.classList.contains('property-painter-prefix-icon')) {
              child.remove();
            } else {
              valueEl.insertBefore(child, oldWrapper);
            }
          }
          oldWrapper.remove();
        }

        // Case A: Multiselect pills (tags, aliases, list properties)
        const pills = valueEl.querySelectorAll<HTMLElement>('.multi-select-pill');
        if (pills && pills.length > 0) {
          this.renderPrefixIcon(valueEl, '');
          let hasAnyMatch = false;
          let matchedRule: PropertyColorRule | null = null;
          pills.forEach(pill => {
            if (isEditing && pill.contains(document.activeElement)) {
              // User is currently editing this specific pill, leave it alone
              return;
            }
            const pillContent = pill.querySelector('.multi-select-pill-content');
            const pillText = (pillContent?.textContent || pill.textContent || '').trim();

            const rule = this.findMatchingPropertyRule(settings.rules, key!, pillText, filePath);
            if (rule) {
              hasAnyMatch = true;
              matchedRule = rule;
              this.applyPillStyles(pill, rule, settings);
              this.renderPrefixIcon(pill, rule.prefixIcon);
            } else {
              this.clearPillStyles(pill);
              this.renderPrefixIcon(pill, '');
            }
          });

          if (hasAnyMatch && matchedRule) {
            const effColor = getAdaptiveTextColor((matchedRule as PropertyColorRule).textColor, settings.autoThemeColors);
            propEl.setAttribute('data-property-painter-match', (matchedRule as PropertyColorRule).id);
            propEl.style.setProperty('--pp-rule-color', effColor, 'important');
            valueEl.style.setProperty('--metadata-input-text-color', effColor, 'important');
          } else {
            propEl.removeAttribute('data-property-painter-match');
            propEl.style.removeProperty('--pp-rule-color');
            valueEl.style.removeProperty('--metadata-input-text-color');
          }
          valueEl.style.backgroundColor = '';
          return;
        }

        // Case B: General / Scalar / Text property value
        const targetEl = valueEl.querySelector<HTMLElement>(
          '.metadata-input-longtext, input, textarea, [contenteditable], .metadata-property-input'
        );

        // Check if user is actively focused on and typing inside this specific input
        const activeEl = document.activeElement;
        const isActivelyTyping = targetEl && (targetEl === activeEl || targetEl.contains(activeEl));

        const rule = this.findMatchingPropertyRule(settings.rules, key, effectiveValue, filePath);

        // Always ensure valueEl itself does NOT have stretched background
        valueEl.style.backgroundColor = '';
        valueEl.classList.remove('property-painter-styled-value');

        // Ensure property label / key is strictly clean
        const keyEl = propEl.querySelector<HTMLElement>('.metadata-property-key');
        if (keyEl) {
          keyEl.style.removeProperty('color');
          keyEl.style.removeProperty('-webkit-text-fill-color');
        }

        if (rule) {
          const effectiveTextColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
          const effectiveBgColor = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, settings.autoThemeColors);
          const usePerRule = settings.overrideGlobalSettings ?? true;
          const effectiveStyleMode: RuleStyleMode = usePerRule
            ? rule.styleMode
            : (settings.globalStyleMode || 'badge');

          const isBold = usePerRule ? (rule.propertyBold ?? false) : settings.globalPropertyBold;
          const isItalic = usePerRule ? (rule.propertyItalic ?? false) : settings.globalPropertyItalic;
          const isStrike = usePerRule ? (rule.propertyStrike ?? false) : settings.globalPropertyStrike;

          propEl.setAttribute('data-property-painter-match', rule.id);
          propEl.style.setProperty('--pp-rule-color', effectiveTextColor, 'important');
          propEl.style.setProperty('--pp-rule-bg', effectiveStyleMode === 'text-only' ? 'transparent' : effectiveBgColor, 'important');
          propEl.style.setProperty('--pp-rule-border', effectiveStyleMode === 'text-only' ? 'transparent' : effectiveTextColor, 'important');

          valueEl.style.setProperty('--metadata-input-text-color', effectiveTextColor, 'important');
          valueEl.style.setProperty('--metadata-value-text-color', effectiveTextColor, 'important');
          valueEl.style.setProperty('--text-normal', effectiveTextColor, 'important');
          valueEl.style.setProperty('color', effectiveTextColor, 'important');
          valueEl.style.setProperty('-webkit-text-fill-color', effectiveTextColor, 'important');
          valueEl.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
          valueEl.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
          valueEl.style.setProperty('text-decoration', isStrike ? 'line-through' : 'none', 'important');

          let displayTarget = targetEl;
          if (!displayTarget) {
            // Reading View: targetEl is null. Wrap content in a pill span
            let readingPill = valueEl.querySelector<HTMLElement>(':scope > .property-painter-pill');
            if (!readingPill) {
              readingPill = document.createElement('span');
              readingPill.className = 'property-painter-pill';
              const nodesToMove: Node[] = [];
              valueEl.childNodes.forEach(child => {
                if (!(child instanceof HTMLElement && child.classList.contains('property-painter-prefix-icon'))) {
                  nodesToMove.push(child);
                }
              });
              nodesToMove.forEach(node => readingPill!.appendChild(node));
              valueEl.appendChild(readingPill);
            }
            displayTarget = readingPill;
          }

          if (displayTarget) {
            this.applyPillStyles(displayTarget, rule, settings, effectiveStyleMode);
          }

          // Only render/update prefix icon when not actively typing so we never disrupt cursor position
          if (!isActivelyTyping) {
            if (rule.prefixIcon && rule.prefixIcon.trim()) {
              this.renderPrefixIcon(valueEl, rule.prefixIcon, displayTarget);
            } else {
              this.renderPrefixIcon(valueEl, '');
            }
          }
        } else {
          propEl.removeAttribute('data-property-painter-match');
          propEl.style.removeProperty('--pp-rule-color');
          propEl.style.removeProperty('--pp-rule-bg');
          propEl.style.removeProperty('--pp-rule-border');

          valueEl.style.removeProperty('--metadata-input-text-color');
          valueEl.style.removeProperty('--metadata-value-text-color');
          valueEl.style.removeProperty('--text-normal');
          valueEl.style.removeProperty('color');
          valueEl.style.removeProperty('-webkit-text-fill-color');
          valueEl.style.removeProperty('font-weight');
          valueEl.style.removeProperty('font-style');
          valueEl.style.removeProperty('text-decoration');

          // If Reading View had a wrapped pill, unwrap it
          const readingPill = valueEl.querySelector<HTMLElement>(':scope > .property-painter-pill');
          if (readingPill && readingPill !== targetEl) {
            while (readingPill.firstChild) {
              valueEl.insertBefore(readingPill.firstChild, readingPill);
            }
            readingPill.remove();
          }

          if (targetEl) {
            this.clearPillStyles(targetEl);
          }
          this.renderPrefixIcon(valueEl, '');
          this.clearPillStyles(valueEl);
        }
      });
    });
  }

  /**
   * Renders or removes a prefix icon/symbol inside a container element
   */
  public renderPrefixIcon(container: HTMLElement, prefix?: string, beforeEl?: HTMLElement | null): void {
    const desiredPrefix = prefix ? prefix.trim() : '';
    const existingIcon = container.querySelector(':scope > .property-painter-prefix-icon') as HTMLElement | null;

    if (desiredPrefix) {
      if (!existingIcon || existingIcon.getAttribute('data-icon') !== desiredPrefix) {
        if (existingIcon) existingIcon.remove();
        const iconSpan = document.createElement('span');
        iconSpan.className = 'property-painter-prefix-icon';
        iconSpan.setAttribute('data-icon', desiredPrefix);
        iconSpan.setAttribute('contenteditable', 'false');

        let iconName = desiredPrefix;
        if (iconName.toLowerCase().startsWith('lucide-')) {
          iconName = iconName.slice(7);
        }
        setIcon(iconSpan, iconName.toLowerCase());
        if (!iconSpan.querySelector('svg')) {
          setIcon(iconSpan, iconName);
        }
        if (!iconSpan.querySelector('svg')) {
          iconSpan.textContent = desiredPrefix;
        }

        const pillContent = container.querySelector('.multi-select-pill-content');
        if (pillContent) {
          container.insertBefore(iconSpan, pillContent);
        } else if (beforeEl && beforeEl.parentElement === container) {
          container.insertBefore(iconSpan, beforeEl);
        } else {
          container.prepend(iconSpan);
        }
      }
    } else {
      if (existingIcon) {
        existingIcon.remove();
      }
    }
  }

  /**
   * Applies the exact rounded pill badge styling or text-only styling with !important
   */
  public applyPillStyles(
    el: HTMLElement,
    rule: PropertyColorRule,
    settings: PropertyPainterSettings,
    styleModeOverride?: RuleStyleMode
  ): void {
    const effectiveTextColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
    const effectiveBgColor = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, settings.autoThemeColors);

    const usePerRule = settings.overrideGlobalSettings ?? true;
    const effectiveStyleMode: RuleStyleMode = styleModeOverride
      ? styleModeOverride
      : (usePerRule ? rule.styleMode : (settings.globalStyleMode || 'badge'));

    const isBold = usePerRule ? (rule.propertyBold ?? false) : settings.globalPropertyBold;
    const isItalic = usePerRule ? (rule.propertyItalic ?? false) : settings.globalPropertyItalic;
    const isStrike = usePerRule ? (rule.propertyStrike ?? false) : settings.globalPropertyStrike;

    el.style.setProperty('--pp-pill-color', effectiveTextColor, 'important');
    el.style.setProperty('--pp-rule-color', effectiveTextColor, 'important');
    el.style.setProperty('--metadata-input-text-color', effectiveTextColor, 'important');
    el.style.setProperty('--metadata-value-text-color', effectiveTextColor, 'important');
    el.style.setProperty('color', effectiveTextColor, 'important');
    el.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
    el.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
    el.style.setProperty('text-decoration', isStrike ? 'line-through' : 'none', 'important');

    const nestedPillContent = el.querySelector<HTMLElement>('.multi-select-pill-content');
    if (nestedPillContent) {
      nestedPillContent.style.setProperty('color', effectiveTextColor, 'important');
      nestedPillContent.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
      nestedPillContent.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
      nestedPillContent.style.setProperty('text-decoration', isStrike ? 'line-through' : 'none', 'important');
    }

    if (effectiveStyleMode === 'text-only') {
      el.classList.add('property-painter-pill', 'property-painter-text-only');
      el.style.setProperty('--pp-pill-bg', 'transparent', 'important');
      el.style.setProperty('--pp-pill-border', 'transparent', 'important');
      el.style.setProperty('background-color', 'transparent', 'important');
      el.style.setProperty('border-color', 'transparent', 'important');
      el.style.setProperty('box-shadow', 'none', 'important');
    } else {
      el.classList.remove('property-painter-text-only');
      el.classList.add('property-painter-pill');
      el.style.setProperty('--pp-pill-bg', effectiveBgColor, 'important');
      el.style.setProperty('--pp-pill-border', effectiveTextColor, 'important');
      el.style.setProperty('background-color', effectiveBgColor, 'important');
      el.style.setProperty('border-color', effectiveTextColor, 'important');
    }

    if (el.classList.contains('multi-select-pill')) {
      this.renderPrefixIcon(el, rule.prefixIcon);
    }
  }

  /**
   * Cleans up applied pill styles
   */
  public clearPillStyles(el: HTMLElement): void {
    el.classList.remove('property-painter-pill', 'property-painter-text-only');
    el.style.removeProperty('--pp-pill-color');
    el.style.removeProperty('--pp-rule-color');
    el.style.removeProperty('--pp-pill-bg');
    el.style.removeProperty('--pp-pill-border');
    el.style.removeProperty('--metadata-input-text-color');
    el.style.removeProperty('--metadata-value-text-color');
    el.style.removeProperty('--text-normal');
    el.style.removeProperty('color');
    el.style.removeProperty('-webkit-text-fill-color');
    el.style.removeProperty('background-color');
    el.style.removeProperty('border');
    el.style.removeProperty('border-color');
    el.style.removeProperty('box-shadow');
    el.style.removeProperty('font-weight');
    el.style.removeProperty('font-style');
    el.style.removeProperty('text-decoration');

    this.renderPrefixIcon(el, '');

    const nestedPillContent = el.querySelector<HTMLElement>('.multi-select-pill-content');
    if (nestedPillContent) {
      nestedPillContent.style.removeProperty('color');
      nestedPillContent.style.removeProperty('-webkit-text-fill-color');
      nestedPillContent.style.removeProperty('font-weight');
      nestedPillContent.style.removeProperty('font-style');
      nestedPillContent.style.removeProperty('text-decoration');
    }
  }
}
