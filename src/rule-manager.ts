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

    const source = rule.caseSensitive ? valStr : valStr.toLowerCase();
    const target = rule.caseSensitive ? (rule.value || '').trim() : (rule.value || '').trim().toLowerCase();

    switch (rule.operator) {
      case 'equals':
        return source === target;
      case 'contains':
        return source.includes(target);
      case 'starts-with':
        return source.startsWith(target);
      case 'ends-with':
        return source.endsWith(target);
      case 'regex':
        try {
          const re = new RegExp(rule.value || '', rule.caseSensitive ? '' : 'i');
          return re.test(valStr);
        } catch {
          return false;
        }
      default:
        return source === target;
    }
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

      if (rule.property.trim().toLowerCase() === lowerKey) {
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

      const ruleKeyLower = rule.property.trim().toLowerCase();
      const matchingKey = Object.keys(frontmatter).find(k => k.trim().toLowerCase() === ruleKeyLower);
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
          const txt = (valueEl.textContent || '').trim();
          if (txt) liveVal = txt;
        }

        const effectiveValue = liveVal !== undefined ? liveVal : fmValue;

        // Case A: Multiselect pills (tags, aliases, list properties)
        const pills = valueEl.querySelectorAll<HTMLElement>('.multi-select-pill');
        if (pills && pills.length > 0) {
          const oldWrapper = valueEl.querySelector<HTMLElement>(':scope > .property-painter-value-pill');
          if (oldWrapper) {
            while (oldWrapper.firstChild) {
              valueEl.insertBefore(oldWrapper.firstChild, oldWrapper);
            }
            oldWrapper.remove();
          }
          this.renderPrefixIcon(valueEl, '');
          let hasAnyMatch = false;
          let matchedRule: PropertyColorRule | null = null;
          pills.forEach(pill => {
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
        const rule = this.findMatchingPropertyRule(settings.rules, key, effectiveValue, filePath);
        const targetElements = valueEl.querySelectorAll<HTMLElement>(
          '.metadata-input-longtext, input, textarea, [contenteditable], .metadata-property-input'
        );

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

          // Clean up any loose icon directly under valueEl
          const looseIcon = valueEl.querySelector(':scope > .property-painter-prefix-icon');
          if (looseIcon) looseIcon.remove();

          // Wrap scalar target in .property-painter-value-pill so the badge encloses BOTH the prefix icon and the text
          let pillWrapper = valueEl.querySelector<HTMLElement>(':scope > .property-painter-value-pill');
          if (!pillWrapper) {
            pillWrapper = document.createElement('div');
            pillWrapper.className = 'property-painter-pill property-painter-value-pill';
            if (targetElements.length > 0) {
              const mainTarget = targetElements[0];
              valueEl.insertBefore(pillWrapper, mainTarget);
              pillWrapper.appendChild(mainTarget);
            } else {
              const nodesToMove = Array.from(valueEl.childNodes).filter(node => {
                return !(node instanceof HTMLElement && node.classList.contains('property-painter-prefix-icon'));
              });
              valueEl.appendChild(pillWrapper);
              nodesToMove.forEach(node => pillWrapper!.appendChild(node));
            }
          }

          // Apply pill styles to the wrapper
          this.applyPillStyles(pillWrapper, rule, settings, effectiveStyleMode);
          this.renderPrefixIcon(pillWrapper, rule.prefixIcon);

          // Clear individual target element borders/backgrounds since wrapper now provides the pill
          targetElements.forEach(targetEl => {
            targetEl.classList.remove('property-painter-pill', 'property-painter-text-only');
            targetEl.style.removeProperty('--pp-pill-border');
            targetEl.style.removeProperty('--pp-pill-bg');
            targetEl.style.removeProperty('border');
            targetEl.style.removeProperty('border-color');
            targetEl.style.removeProperty('background-color');
            targetEl.style.removeProperty('box-shadow');
          });
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

          // Unwrap and remove pillWrapper if it exists
          const pillWrapper = valueEl.querySelector<HTMLElement>(':scope > .property-painter-value-pill');
          if (pillWrapper) {
            this.clearPillStyles(pillWrapper);
            while (pillWrapper.firstChild) {
              const child = pillWrapper.firstChild;
              if (child instanceof HTMLElement && child.classList.contains('property-painter-prefix-icon')) {
                child.remove();
              } else {
                valueEl.insertBefore(child, pillWrapper);
              }
            }
            pillWrapper.remove();
          }

          const looseIcon = valueEl.querySelector(':scope > .property-painter-prefix-icon');
          if (looseIcon) looseIcon.remove();

          targetElements.forEach(targetEl => {
            this.clearPillStyles(targetEl);
          });
          this.clearPillStyles(valueEl);
        }
      });
    });
  }

  /**
   * Renders or removes a prefix icon/symbol inside a container element
   */
  public renderPrefixIcon(container: HTMLElement, prefix?: string): void {
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
    el.style.setProperty('-webkit-text-fill-color', effectiveTextColor, 'important');
    el.style.setProperty('font-weight', isBold ? 'bold' : 'normal', 'important');
    el.style.setProperty('font-style', isItalic ? 'italic' : 'normal', 'important');
    el.style.setProperty('text-decoration', isStrike ? 'line-through' : 'none', 'important');

    const nestedPillContent = el.querySelector<HTMLElement>('.multi-select-pill-content');
    if (nestedPillContent) {
      nestedPillContent.style.setProperty('color', effectiveTextColor, 'important');
      nestedPillContent.style.setProperty('-webkit-text-fill-color', effectiveTextColor, 'important');
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
