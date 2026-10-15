import {
  App,
  ColorComponent,
  Modal,
  PluginSettingTab,
  Setting,
  TFolder,
  TextComponent,
  setIcon
} from 'obsidian';
import type PropertyPainterPlugin from './main';
import {
  DEFAULT_RULES,
  PropertyColorRule,
  RuleFolderScope,
  RuleOperator,
  RuleStyleMode,
  ThumbnailAspectRatio,
  ThumbnailClickAction,
  ThumbnailObjectFit,
  ThumbnailPosition
} from './types';
import { getAdaptiveTextColor, getAdaptiveBackgroundColor, isDarkTheme } from './color-utils';
import { FolderSuggest, TagSuggest, PropertyKeySuggest } from './suggesters';

export class PropertyPainterSettingTab extends PluginSettingTab {
  plugin: PropertyPainterPlugin;
  public activeTab: 'rules' | 'thumbnail' | 'global' | 'general' = 'rules';

  constructor(app: App, plugin: PropertyPainterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('property-painter-settings');

    containerEl.createEl('h2', { text: 'Property Painter Settings' });

    // Segmented Navigation Tabs
    const tabsContainer = containerEl.createDiv({ cls: 'property-painter-tabs' });

    const tabs: Array<{ id: 'rules' | 'thumbnail' | 'global' | 'general'; label: string; icon: string }> = [
      { id: 'rules', label: 'Color Rules', icon: 'palette' },
      { id: 'thumbnail', label: 'Cover Thumbnail', icon: 'image' },
      { id: 'global', label: 'Global Settings', icon: 'globe' },
      { id: 'general', label: 'General Settings', icon: 'sliders' }
    ];

    tabs.forEach(tab => {
      const tabBtn = tabsContainer.createEl('button', {
        cls: `property-painter-tab-btn ${this.activeTab === tab.id ? 'is-active' : ''}`,
        attr: { type: 'button' }
      });
      const iconSpan = tabBtn.createSpan({ cls: 'property-painter-tab-icon' });
      setIcon(iconSpan, tab.icon);
      tabBtn.createSpan({ text: tab.label });
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.display();
      });
    });

    const contentContainer = containerEl.createDiv({ cls: 'property-painter-tab-content' });

    switch (this.activeTab) {
      case 'rules':
        this.renderRulesTab(contentContainer);
        break;
      case 'thumbnail':
        this.renderThumbnailTab(contentContainer);
        break;
      case 'global':
        this.renderGlobalTab(contentContainer);
        break;
      case 'general':
        this.renderGeneralTab(contentContainer);
        break;
    }
  }

  private renderThumbnailTab(containerEl: HTMLElement): void {

    // ==========================================
    // 1. Thumbnail Beside Properties
    // ==========================================
    containerEl.createEl('h3', { text: 'Cover Thumbnail' });
    containerEl.createEl('p', {
      cls: 'setting-item-description',
      text: 'Renders an image thumbnail neatly beside the native note properties when an image link is present.'
    });

    new Setting(containerEl)
      .setName('Enable cover thumbnail')
      .setDesc('Display image thumbnail side-by-side with note properties')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.thumbnailEnabled).onChange(async val => {
          this.plugin.settings.thumbnailEnabled = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Thumbnail position')
      .setDesc('Place the thumbnail to the left or right of note properties')
      .addDropdown(dd => {
        dd.addOption('left', 'Left of properties (Default)');
        dd.addOption('right', 'Right of properties');
        dd.setValue(this.plugin.settings.thumbnailPosition);
        dd.onChange(async val => {
          this.plugin.settings.thumbnailPosition = val as ThumbnailPosition;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Maintain original image ratio (Link dimensions)')
      .setDesc('When enabled, the thumbnail preserves the image’s original aspect ratio smoothly as width/height increase')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.thumbnailMaintainAspectRatio).onChange(async val => {
          this.plugin.settings.thumbnailMaintainAspectRatio = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName('Cover property keys')
      .setDesc('Comma-separated list of frontmatter property names to check for images')
      .addText(text => {
        text.setPlaceholder('cover, image, thumbnail, poster, banner');
        text.setValue(this.plugin.settings.thumbnailPropertyKeys);
        text.onChange(async val => {
          this.plugin.settings.thumbnailPropertyKeys = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Auto-detect image links')
      .setDesc('If enabled, automatically checks any frontmatter property for image URLs/attachments if target keys are not found')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.thumbnailAutoDetect).onChange(async val => {
          this.plugin.settings.thumbnailAutoDetect = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Thumbnail width')
      .setDesc('Width of the thumbnail in pixels')
      .addSlider(slider => {
        slider
          .setLimits(60, 300, 5)
          .setValue(this.plugin.settings.thumbnailWidth)
          .setDynamicTooltip()
          .onChange(async val => {
            this.plugin.settings.thumbnailWidth = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          });
      });

    new Setting(containerEl)
      .setName('Thumbnail max height')
      .setDesc('Maximum height of the thumbnail in pixels')
      .addSlider(slider => {
        slider
          .setLimits(80, 450, 10)
          .setValue(this.plugin.settings.thumbnailMaxHeight)
          .setDynamicTooltip()
          .onChange(async val => {
            this.plugin.settings.thumbnailMaxHeight = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          });
      });

    if (!this.plugin.settings.thumbnailMaintainAspectRatio) {
      new Setting(containerEl)
        .setName('Fixed aspect ratio preset')
        .setDesc('Applied when dimensions are unlinked from the original ratio')
        .addDropdown(dd => {
          dd.addOption('cover', 'Book Cover (2:3)');
          dd.addOption('square', 'Square (1:1)');
          dd.addOption('wide', 'Widescreen (16:9)');
          dd.addOption('auto', 'Natural (Auto)');
          dd.setValue(this.plugin.settings.thumbnailAspectRatio);
          dd.onChange(async val => {
            this.plugin.settings.thumbnailAspectRatio = val as ThumbnailAspectRatio;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          });
        });
    }

    new Setting(containerEl)
      .setName('Object fit')
      .setDesc('How the image fits within the thumbnail frame')
      .addDropdown(dd => {
        dd.addOption('cover', 'Cover (Fill & Crop)');
        dd.addOption('contain', 'Contain (Show Full Image)');
        dd.setValue(this.plugin.settings.thumbnailObjectFit);
        dd.onChange(async val => {
          this.plugin.settings.thumbnailObjectFit = val as ThumbnailObjectFit;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Corner roundness')
      .setDesc('Border radius in pixels')
      .addSlider(slider => {
        slider
          .setLimits(0, 24, 1)
          .setValue(this.plugin.settings.thumbnailBorderRadius)
          .setDynamicTooltip()
          .onChange(async val => {
            this.plugin.settings.thumbnailBorderRadius = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          });
      });

    new Setting(containerEl)
      .setName('Click action')
      .setDesc('Action when clicking the cover thumbnail')
      .addDropdown(dd => {
        dd.addOption('modal', 'Open Fullscreen Preview Modal');
        dd.addOption('open-file', 'Open Local File (if in vault)');
        dd.addOption('none', 'None');
        dd.setValue(this.plugin.settings.thumbnailClickAction);
        dd.onChange(async val => {
          this.plugin.settings.thumbnailClickAction = val as ThumbnailClickAction;
          await this.plugin.saveSettings();
        });
      });
  }

  /**
   * Tab 1: Color Rules & Rule Overrides
   */
  private renderRulesTab(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Property Color Rules' });
    containerEl.createEl('p', {
      cls: 'setting-item-description',
      text: 'Define custom color rules for metadata property values (e.g., shelf: to-read, read, currently-reading). Rules can apply to properties and File Explorer items.'
    });

    new Setting(containerEl)
      .setName('Override global settings with rule preferences')
      .setDesc('When ON: Rules customize their own badge vs text style and File Explorer formatting. When OFF: Global defaults apply across all matching properties and notes.')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.overrideGlobalSettings ?? true).onChange(async val => {
          this.plugin.settings.overrideGlobalSettings = val;
          this.plugin.settings.overrideGlobalExplorerSettings = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Active Rules')
      .setDesc(`Total rules configured: ${this.plugin.settings.rules.length}`)
      .addButton(btn => {
        btn.setButtonText('+ Add Rule');
        btn.setCta();
        btn.onClick(() => {
          const newRule: PropertyColorRule = {
            id: 'rule-' + Date.now(),
            name: 'New Color Rule',
            enabled: true,
            property: 'shelf',
            operator: 'equals',
            value: '',
            folderScope: 'global',
            folderPath: '',
            exceptFolderPath: '',
            textColor: '#FCE7B2',
            backgroundColor: 'rgba(252, 231, 178, 0.15)',
            styleMode: 'badge',
            applyToProperties: true,
            applyToFileExplorer: true,
            showExplorerDot: true,
            explorerDotGlow: true,
            explorerBold: false,
            explorerItalic: false,
            explorerStrike: false,
            caseSensitive: false
          };
          new RuleEditorModal(this.app, this.plugin, newRule, true, () => {
            this.display();
          }).open();
        });
      })
      .addButton(btn => {
        btn.setButtonText('Reset to Defaults');
        btn.onClick(async () => {
          this.plugin.settings.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
          this.display();
        });
      });

    // Rules List Cards
    const rulesListContainer = containerEl.createDiv({ cls: 'property-painter-rules-list' });

    if (this.plugin.settings.rules.length === 0) {
      const emptyNotice = rulesListContainer.createDiv({ cls: 'property-painter-empty-notice' });
      emptyNotice.setText('No rules configured. Click "+ Add Rule" or "Reset to Defaults".');
    } else {
      this.plugin.settings.rules.forEach((rule: PropertyColorRule, index: number) => {
        const card = rulesListContainer.createDiv({ cls: 'property-painter-rule-card' });

        const cardLeft = card.createDiv({ cls: 'rule-card-left' });
        const toggleWrapper = cardLeft.createDiv({ cls: 'rule-toggle-wrapper' });
        const toggle = toggleWrapper.createEl('input', { type: 'checkbox' });
        toggle.checked = rule.enabled;
        toggle.addEventListener('change', async () => {
          rule.enabled = toggle.checked;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });

        const details = cardLeft.createDiv({ cls: 'rule-card-details' });
        const titleRow = details.createDiv({ cls: 'rule-title-row' });
        let defaultName = `${rule.property}: ${rule.value}`;
        if (rule.operator === 'empty') {
          defaultName = `${rule.property} is empty`;
        } else if (rule.operator === 'filled') {
          defaultName = `${rule.property} is filled`;
        }
        titleRow.createSpan({ cls: 'rule-name', text: rule.name || defaultName });

        const effColor = getAdaptiveTextColor(rule.textColor, this.plugin.settings.autoThemeColors);
        const effBg = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, this.plugin.settings.autoThemeColors);

        const badge = titleRow.createSpan({ cls: 'rule-preview-pill' });
        badge.empty();
        if (rule.prefixIcon && rule.prefixIcon.trim()) {
          const iconSpan = badge.createSpan({ cls: 'property-painter-prefix-icon' });
          let iconName = rule.prefixIcon.trim();
          if (iconName.toLowerCase().startsWith('lucide-')) {
            iconName = iconName.slice(7);
          }
          setIcon(iconSpan, iconName.toLowerCase());
          if (!iconSpan.querySelector('svg')) {
            setIcon(iconSpan, iconName);
          }
          if (!iconSpan.querySelector('svg')) {
            iconSpan.textContent = rule.prefixIcon.trim();
          }
        }
        let pillText = rule.value;
        if (rule.operator === 'empty') {
          pillText = pillText || '(empty)';
        } else if (rule.operator === 'filled') {
          pillText = pillText || '(filled)';
        } else {
          pillText = pillText || rule.property || 'Preview';
        }
        badge.createSpan({ text: pillText });
        badge.style.setProperty('--pp-pill-color', effColor, 'important');
        badge.style.setProperty('--pp-rule-color', effColor, 'important');
        badge.style.setProperty('color', effColor, 'important');
        badge.style.setProperty('-webkit-text-fill-color', effColor, 'important');
        badge.style.setProperty('font-weight', rule.propertyBold ? 'bold' : 'normal', 'important');
        badge.style.setProperty('font-style', rule.propertyItalic ? 'italic' : 'normal', 'important');
        badge.style.setProperty('text-decoration', rule.propertyStrike ? 'line-through' : 'none', 'important');

        if (rule.styleMode === 'text-only') {
          badge.classList.add('property-painter-text-only');
          badge.style.setProperty('--pp-pill-border', 'transparent', 'important');
          badge.style.setProperty('--pp-pill-bg', 'transparent', 'important');
          badge.style.setProperty('border', '1px solid transparent', 'important');
          badge.style.setProperty('background-color', 'transparent', 'important');
        } else {
          badge.classList.remove('property-painter-text-only');
          badge.style.setProperty('--pp-pill-border', effColor, 'important');
          badge.style.setProperty('--pp-pill-bg', effBg, 'important');
          badge.style.setProperty('border', `1px solid ${effColor}`, 'important');
          badge.style.setProperty('background-color', effBg, 'important');
        }

        const conditionRow = details.createDiv({ cls: 'rule-condition-row' });
        conditionRow.createSpan({ text: `When ` });
        conditionRow.createEl('code', { text: rule.property });
        if (rule.operator === 'empty') {
          conditionRow.createSpan({ text: ' is empty' });
        } else if (rule.operator === 'filled') {
          conditionRow.createSpan({ text: ' is filled' });
        } else {
          conditionRow.createSpan({ text: ` ${rule.operator} ` });
          conditionRow.createEl('code', { text: `"${rule.value}"` });
        }

        const targetsRow = details.createDiv({ cls: 'rule-targets-row' });
        const modeBadge = targetsRow.createSpan({
          cls: 'target-badge',
          text: rule.styleMode === 'text-only' ? 'Text Only' : 'Badge'
        });
        setIcon(modeBadge, rule.styleMode === 'text-only' ? 'type' : 'tag');

        if (rule.prefixIcon && rule.prefixIcon.trim()) {
          const prefixBadge = targetsRow.createSpan({
            cls: 'target-badge',
            text: `Prefix: ${rule.prefixIcon.trim()}`
          });
          setIcon(prefixBadge, 'sparkles');
        }

        if (rule.folderScope === 'folder' && rule.folderPath && rule.folderPath.trim()) {
          const fBadge = targetsRow.createSpan({ cls: 'target-badge', text: `Folder: ${rule.folderPath.trim()}` });
          setIcon(fBadge, 'folder');
        } else {
          const gBadge = targetsRow.createSpan({ cls: 'target-badge', text: 'Global' });
          setIcon(gBadge, 'globe');
        }

        if (rule.exceptFolderPath && rule.exceptFolderPath.trim()) {
          const exBadge = targetsRow.createSpan({ cls: 'target-badge', text: `Except: ${rule.exceptFolderPath.trim()}` });
          setIcon(exBadge, 'folder-x');
        }

        if (rule.applyToProperties) {
          const pStyles: string[] = [];
          if (rule.propertyBold) pStyles.push('Bold');
          if (rule.propertyItalic) pStyles.push('Italic');
          if (rule.propertyStrike) pStyles.push('Strike');
          const pDesc = pStyles.length > 0 ? `Properties (${pStyles.join(', ')})` : 'Properties';
          const tProp = targetsRow.createSpan({ cls: 'target-badge', text: pDesc });
          setIcon(tProp, 'file-text');
        }
        if (rule.applyToFileExplorer) {
          const styles: string[] = [];
          if (rule.explorerBold) styles.push('Bold');
          if (rule.explorerItalic) styles.push('Italic');
          if (rule.explorerStrike) styles.push('Strike');
          if (rule.showExplorerDot) styles.push('Dot' + (rule.explorerDotGlow ? ' Glow' : ''));
          const desc = styles.length > 0 ? `Explorer (${styles.join(', ')})` : 'Explorer';
          const tExp = targetsRow.createSpan({ cls: 'target-badge', text: desc });
          setIcon(tExp, 'folder-tree');
        }

        // Actions
        const cardRight = card.createDiv({ cls: 'rule-card-actions' });
        const editBtn = cardRight.createEl('button', {
          cls: 'rule-action-btn rule-edit-btn',
          attr: { type: 'button', 'aria-label': 'Edit rule' }
        });
        setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', () => {
          new RuleEditorModal(
            this.app,
            this.plugin,
            rule,
            false,
            () => {
              this.display();
            },
            index
          ).open();
        });

        const deleteBtn = cardRight.createEl('button', {
          cls: 'rule-action-btn rule-delete-btn',
          attr: { type: 'button', 'aria-label': 'Delete rule' }
        });
        setIcon(deleteBtn, 'trash-2');
        deleteBtn.addEventListener('click', async () => {
          this.plugin.settings.rules.splice(index, 1);
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
          this.display();
        });
      });
    }
  }

  /**
   * Tab 3: Global Default Settings
   */
  private renderGlobalTab(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Global Settings' });
    containerEl.createEl('p', {
      cls: 'setting-item-description',
      text: 'Default styling and formatting applied to matching properties and note titles when rule-specific override is turned OFF.'
    });

    // 1. Property Global Defaults
    containerEl.createEl('h4', { text: 'Property Global Defaults' });

    new Setting(containerEl)
      .setName('Default property style mode')
      .setDesc('Style mode for property values (Badge pill container vs clean Text Only). Applied when rule override is OFF.')
      .addDropdown(dd => {
        dd.addOption('badge', 'Badge (Rounded pill container)');
        dd.addOption('text-only', 'Text Only (No background pill)');
        dd.setValue(this.plugin.settings.globalStyleMode || 'badge');
        dd.onChange(async val => {
          this.plugin.settings.globalStyleMode = val as RuleStyleMode;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    // Global property text formatting group
    const propFormatSetting = new Setting(containerEl)
      .setName('Global property text formatting')
      .setDesc('Default bold, italic, or strikethrough applied to note property values when rule override is OFF');

    const propFormatGroup = propFormatSetting.controlEl.createDiv({ cls: 'rule-editor-format-group' });

    const gpBoldBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyBold ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Bold' }
    });
    setIcon(gpBoldBtn, 'bold');
    gpBoldBtn.addEventListener('click', async () => {
      this.plugin.settings.globalPropertyBold = !this.plugin.settings.globalPropertyBold;
      gpBoldBtn.toggleClass('is-active', this.plugin.settings.globalPropertyBold);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    const gpItalicBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyItalic ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Italic' }
    });
    setIcon(gpItalicBtn, 'italic');
    gpItalicBtn.addEventListener('click', async () => {
      this.plugin.settings.globalPropertyItalic = !this.plugin.settings.globalPropertyItalic;
      gpItalicBtn.toggleClass('is-active', this.plugin.settings.globalPropertyItalic);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    const gpStrikeBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyStrike ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Strikethrough' }
    });
    setIcon(gpStrikeBtn, 'strikethrough');
    gpStrikeBtn.addEventListener('click', async () => {
      this.plugin.settings.globalPropertyStrike = !this.plugin.settings.globalPropertyStrike;
      gpStrikeBtn.toggleClass('is-active', this.plugin.settings.globalPropertyStrike);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    // 2. File Explorer Global Defaults
    containerEl.createEl('h4', { text: 'File Explorer Global Defaults' });

    const expFormatSetting = new Setting(containerEl)
      .setName('Global File Explorer formatting')
      .setDesc('Default bold, italic, or strikethrough applied to filenames in File Explorer when rule override is OFF');

    const expFormatGroup = expFormatSetting.controlEl.createDiv({ cls: 'rule-editor-format-group' });

    const gBoldBtn = expFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerBold ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Bold' }
    });
    setIcon(gBoldBtn, 'bold');
    gBoldBtn.addEventListener('click', async () => {
      this.plugin.settings.globalExplorerBold = !this.plugin.settings.globalExplorerBold;
      gBoldBtn.toggleClass('is-active', this.plugin.settings.globalExplorerBold);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    const gItalicBtn = expFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerItalic ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Italic' }
    });
    setIcon(gItalicBtn, 'italic');
    gItalicBtn.addEventListener('click', async () => {
      this.plugin.settings.globalExplorerItalic = !this.plugin.settings.globalExplorerItalic;
      gItalicBtn.toggleClass('is-active', this.plugin.settings.globalExplorerItalic);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    const gStrikeBtn = expFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerStrike ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Strikethrough' }
    });
    setIcon(gStrikeBtn, 'strikethrough');
    gStrikeBtn.addEventListener('click', async () => {
      this.plugin.settings.globalExplorerStrike = !this.plugin.settings.globalExplorerStrike;
      gStrikeBtn.toggleClass('is-active', this.plugin.settings.globalExplorerStrike);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });

    new Setting(containerEl)
      .setName('Show indicator dot')
      .setDesc('Display colored dot next to note titles when rule override is OFF')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.globalShowExplorerDot).onChange(async val => {
          this.plugin.settings.globalShowExplorerDot = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Indicator dot glow effect')
      .setDesc('Add luminous glow effect to indicator dots when rule override is OFF')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.globalExplorerDotGlow).onChange(async val => {
          this.plugin.settings.globalExplorerDotGlow = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Indicator dot size')
      .setDesc('Size in pixels of the File Explorer indicator dot')
      .addSlider(slider => {
        slider
          .setLimits(4, 16, 1)
          .setValue(this.plugin.settings.explorerDotSize)
          .setDynamicTooltip()
          .onChange(async val => {
            this.plugin.settings.explorerDotSize = val;
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          });
      });
  }

  /**
   * Tab 4: General Settings & Tools
   */
  private renderGeneralTab(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'General Settings' });
    containerEl.createEl('p', {
      cls: 'setting-item-description',
      text: 'Master switches, automatic theme adaptations, and maintenance tools.'
    });

    new Setting(containerEl)
      .setName('Enable File Explorer styling')
      .setDesc('Master switch to color and style matching note titles in File Explorer')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.explorerEnabled).onChange(async val => {
          this.plugin.settings.explorerEnabled = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });

    new Setting(containerEl)
      .setName('Auto theme contrast')
      .setDesc('Automatically optimize colors and contrast between Obsidian Light and Dark themes')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.autoThemeColors).onChange(async val => {
          this.plugin.settings.autoThemeColors = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
          this.display();
        });
      });

    containerEl.createEl('h3', { text: 'Maintenance & Tools' });

    new Setting(containerEl)
      .setName('Repaint all')
      .setDesc('Forces a full refresh of all open note properties and File Explorer items')
      .addButton(btn => {
        btn.setButtonText('Repaint Now');
        btn.setCta();
        btn.onClick(() => {
          this.plugin.refreshAllViews();
        });
      });
  }
}

/**
 * Modal to add or edit an individual rule with instant direct reflection
 */
export class RuleEditorModal extends Modal {
  private plugin: PropertyPainterPlugin;
  private rule: PropertyColorRule;
  private isNew: boolean;
  private ruleIndex: number;
  private onSaveCallback: () => void;
  private updatePreview!: () => void;

  constructor(
    app: App,
    plugin: PropertyPainterPlugin,
    rule: PropertyColorRule,
    isNew: boolean,
    onSaveCallback: () => void,
    ruleIndex = -1
  ) {
    super(app);
    this.plugin = plugin;
    this.isNew = isNew;
    this.onSaveCallback = onSaveCallback;

    this.rule = {
      ...rule,
      folderScope: rule.folderScope || 'global',
      folderPath: rule.folderPath ?? '',
      exceptFolderPath: rule.exceptFolderPath ?? '',
      prefixIcon: rule.prefixIcon ?? '',
      styleMode: rule.styleMode || 'badge',
      propertyBold: rule.propertyBold ?? false,
      propertyItalic: rule.propertyItalic ?? false,
      propertyStrike: rule.propertyStrike ?? false,
      explorerBold: rule.explorerBold ?? false,
      explorerItalic: rule.explorerItalic ?? false,
      explorerStrike: rule.explorerStrike ?? false,
      explorerDotGlow: rule.explorerDotGlow ?? true,
      showExplorerDot: rule.showExplorerDot ?? true,
      applyToFileExplorer: rule.applyToFileExplorer ?? true,
      applyToProperties: rule.applyToProperties ?? true,
      caseSensitive: rule.caseSensitive ?? false
    };

    if (this.isNew) {
      this.rule.id = 'rule-' + Date.now();
      this.plugin.settings.rules.push(this.rule);
      this.ruleIndex = this.plugin.settings.rules.length - 1;
    } else {
      this.ruleIndex = ruleIndex;
    }
  }

  /**
   * Applies changes immediately to settings and refreshes all active views in real-time
   */
  private async applyDirectChange(): Promise<void> {
    if (this.ruleIndex >= 0 && this.ruleIndex < this.plugin.settings.rules.length) {
      this.plugin.settings.rules[this.ruleIndex] = { ...this.rule };
    }
    await this.plugin.saveSettings();
    this.plugin.refreshAllViews();
    if (this.updatePreview) {
      this.updatePreview();
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('property-painter-rule-editor');

    contentEl.createEl('h2', { text: this.isNew ? 'Create Color Rule' : 'Edit Color Rule' });

    // Live preview cards
    const previewWrapper = contentEl.createDiv({ cls: 'rule-editor-preview-wrapper' });

    // Property preview
    const propPreviewBox = previewWrapper.createDiv({ cls: 'rule-preview-box' });
    propPreviewBox.createSpan({ cls: 'rule-preview-label', text: 'Note Property: ' });
    const previewPill = propPreviewBox.createSpan({ cls: 'rule-preview-pill' });

    // Explorer preview
    const expPreviewBox = previewWrapper.createDiv({ cls: 'rule-preview-box' });
    expPreviewBox.createSpan({ cls: 'rule-preview-label', text: 'File Explorer: ' });
    const expPreviewDot = expPreviewBox.createSpan({ cls: 'property-painter-dot' });
    const expPreviewTitle = expPreviewBox.createSpan({ cls: 'rule-preview-title' });

    this.updatePreview = () => {
      const isBadge = (this.rule.styleMode || 'badge') === 'badge';
      const effTextColor = getAdaptiveTextColor(this.rule.textColor, this.plugin.settings.autoThemeColors);
      const effBgColor = getAdaptiveBackgroundColor(this.rule.backgroundColor, this.rule.textColor, this.plugin.settings.autoThemeColors);

      // Property pill
      previewPill.empty();
      if (this.rule.prefixIcon && this.rule.prefixIcon.trim()) {
        const iconSpan = previewPill.createSpan({ cls: 'property-painter-prefix-icon' });
        let iconName = this.rule.prefixIcon.trim();
        if (iconName.toLowerCase().startsWith('lucide-')) {
          iconName = iconName.slice(7);
        }
        setIcon(iconSpan, iconName.toLowerCase());
        if (!iconSpan.querySelector('svg')) {
          setIcon(iconSpan, iconName);
        }
        if (!iconSpan.querySelector('svg')) {
          iconSpan.textContent = this.rule.prefixIcon.trim();
        }
      }

      let pillDisplayText = this.rule.value;
      if (this.rule.operator === 'empty') {
        pillDisplayText = pillDisplayText || '(empty)';
      } else if (this.rule.operator === 'filled') {
        pillDisplayText = pillDisplayText || '(filled)';
      } else {
        pillDisplayText = pillDisplayText || this.rule.property || 'Preview';
      }

      previewPill.createSpan({ text: pillDisplayText });
      previewPill.style.setProperty('--pp-pill-color', effTextColor, 'important');
      previewPill.style.setProperty('--pp-rule-color', effTextColor, 'important');
      previewPill.style.setProperty('color', effTextColor, 'important');
      previewPill.style.setProperty('-webkit-text-fill-color', effTextColor, 'important');
      previewPill.style.fontWeight = this.rule.propertyBold ? 'bold' : 'normal';
      previewPill.style.fontStyle = this.rule.propertyItalic ? 'italic' : 'normal';
      previewPill.style.textDecoration = this.rule.propertyStrike ? 'line-through' : 'none';

      if (isBadge) {
        previewPill.classList.remove('property-painter-text-only');
        previewPill.style.setProperty('--pp-pill-border', effTextColor, 'important');
        previewPill.style.setProperty('--pp-pill-bg', effBgColor, 'important');
        previewPill.style.setProperty('border', `1px solid ${effTextColor}`, 'important');
        previewPill.style.setProperty('background-color', effBgColor, 'important');
      } else {
        previewPill.classList.add('property-painter-text-only');
        previewPill.style.setProperty('--pp-pill-border', 'transparent', 'important');
        previewPill.style.setProperty('--pp-pill-bg', 'transparent', 'important');
        previewPill.style.setProperty('border', '1px solid transparent', 'important');
        previewPill.style.setProperty('background-color', 'transparent', 'important');
      }

      // Explorer Title
      let sampleTitle = 'example-note.md';
      if (this.rule.operator === 'empty') {
        sampleTitle = `${this.rule.property || 'property'}-empty.md`;
      } else if (this.rule.operator === 'filled') {
        sampleTitle = `${this.rule.property || 'property'}-filled.md`;
      } else if (this.rule.value) {
        sampleTitle = `${this.rule.value}-note.md`;
      }
      expPreviewTitle.setText(sampleTitle);

      if (this.rule.applyToFileExplorer) {
        expPreviewTitle.style.color = effTextColor;
      } else {
        expPreviewTitle.style.color = 'var(--text-normal)';
      }
      expPreviewTitle.style.fontWeight = this.rule.explorerBold ? 'bold' : 'normal';
      expPreviewTitle.style.fontStyle = this.rule.explorerItalic ? 'italic' : 'normal';
      expPreviewTitle.style.textDecoration = this.rule.explorerStrike ? 'line-through' : 'none';

      // Explorer Dot
      if (this.rule.showExplorerDot) {
        expPreviewDot.style.display = 'inline-block';
        expPreviewDot.style.backgroundColor = effTextColor;
        expPreviewDot.style.width = `${this.plugin.settings.explorerDotSize}px`;
        expPreviewDot.style.height = `${this.plugin.settings.explorerDotSize}px`;

        if (this.rule.explorerDotGlow) {
          expPreviewDot.classList.add('has-glow');
          const isDark = isDarkTheme();
          if (isDark) {
            expPreviewDot.style.boxShadow = `0 0 5px ${effTextColor}, 0 0 10px ${effTextColor}`;
          } else {
            expPreviewDot.style.boxShadow = `0 0 0 1.5px var(--background-primary), 0 0 5px ${effTextColor}, 0 0 11px ${effTextColor}`;
          }
        } else {
          expPreviewDot.classList.remove('has-glow');
          expPreviewDot.style.boxShadow = 'none';
        }
      } else {
        expPreviewDot.style.display = 'none';
      }
    };

    this.updatePreview();

    // Section 1: Matching Condition
    contentEl.createEl('h4', { text: 'Matching Rule' });

    new Setting(contentEl)
      .setName('Rule Name')
      .setDesc('Descriptive label for this rule')
      .addText(text => {
        text.setValue(this.rule.name || '');
        text.onChange(async val => {
          this.rule.name = val;
          await this.applyDirectChange();
        });
      });

    new Setting(contentEl)
      .setName('Property Key')
      .setDesc('Frontmatter key to match (e.g., shelf, status, priority, tags)')
      .addText(text => {
        text.setPlaceholder('shelf');
        text.setValue(this.rule.property || '');
        new PropertyKeySuggest(this.app, text.inputEl, async val => {
          this.rule.property = val;
          await this.applyDirectChange();
        });
        text.onChange(async val => {
          this.rule.property = val;
          await this.applyDirectChange();
        });
      });

    let targetValueSetting: Setting;
    let caseSensitiveSetting: Setting;

    const updateOperatorVisibility = () => {
      const isValueless = this.rule.operator === 'empty' || this.rule.operator === 'filled';
      if (targetValueSetting) {
        targetValueSetting.settingEl.style.display = isValueless ? 'none' : '';
      }
      if (caseSensitiveSetting) {
        caseSensitiveSetting.settingEl.style.display = isValueless ? 'none' : '';
      }
    };

    new Setting(contentEl)
      .setName('Operator')
      .setDesc('How the property value should be compared')
      .addDropdown(dd => {
        dd.addOption('equals', 'Equals');
        dd.addOption('contains', 'Contains');
        dd.addOption('starts-with', 'Starts With');
        dd.addOption('ends-with', 'Ends With');
        dd.addOption('regex', 'Regular Expression');
        dd.addOption('empty', 'Empty (Property is empty)');
        dd.addOption('filled', 'Filled (Property has value)');
        dd.setValue(this.rule.operator || 'equals');
        dd.onChange(async val => {
          this.rule.operator = val as RuleOperator;
          updateOperatorVisibility();
          await this.applyDirectChange();
        });
      });

    targetValueSetting = new Setting(contentEl)
      .setName('Target Value')
      .setDesc('Value to match against (e.g., to-read, read, or tags from your vault)')
      .addText(text => {
        text.setPlaceholder('to-read');
        text.setValue(this.rule.value || '');
        new TagSuggest(
          this.app,
          text.inputEl,
          () => this.rule.property || '',
          async val => {
            this.rule.value = val;
            await this.applyDirectChange();
          }
        );
        text.onChange(async val => {
          this.rule.value = val;
          await this.applyDirectChange();
        });
      });

    caseSensitiveSetting = new Setting(contentEl)
      .setName('Case Sensitive')
      .setDesc('Match value with exact case sensitivity')
      .addToggle(toggle => {
        toggle.setValue(this.rule.caseSensitive).onChange(async val => {
          this.rule.caseSensitive = val;
          await this.applyDirectChange();
        });
      });

    updateOperatorVisibility();

    // Section 2: Folder Scope & Filter
    contentEl.createEl('h4', { text: 'Folder Scope & Filter' });

    let targetFolderSetting: Setting;

    const updateFolderScopeVisibility = () => {
      const isFolderSpecific = (this.rule.folderScope || 'global') === 'folder';
      if (targetFolderSetting) {
        targetFolderSetting.settingEl.style.display = isFolderSpecific ? '' : 'none';
      }
    };

    new Setting(contentEl)
      .setName('Apply to')
      .setDesc('Choose whether this rule applies across all vault notes or only within a specific folder')
      .addDropdown(dd => {
        dd.addOption('global', 'Global (All folders)');
        dd.addOption('folder', 'This folder (Specific folder)');
        dd.setValue(this.rule.folderScope || 'global');
        dd.onChange(async val => {
          this.rule.folderScope = val as RuleFolderScope;
          updateFolderScopeVisibility();
          await this.applyDirectChange();
        });
      });

    targetFolderSetting = new Setting(contentEl)
      .setName('Target folder')
      .setDesc('Only notes located inside this folder or its subfolders will be matched (e.g. Books or Work/Projects)')
      .addText(text => {
        text.setPlaceholder('e.g. Books or Work/Projects');
        text.setValue(this.rule.folderPath || '');
        new FolderSuggest(this.app, text.inputEl, false, async val => {
          this.rule.folderPath = val;
          await this.applyDirectChange();
        });
        text.onChange(async val => {
          this.rule.folderPath = val;
          await this.applyDirectChange();
        });
      });

    new Setting(contentEl)
      .setName('Except folder')
      .setDesc('Exclude notes located inside this folder or its subfolders (supports comma-separated list, e.g. Archive, Templates)')
      .addText(text => {
        text.setPlaceholder('e.g. Archive, Templates');
        text.setValue(this.rule.exceptFolderPath || '');
        new FolderSuggest(this.app, text.inputEl, true, async val => {
          this.rule.exceptFolderPath = val;
          await this.applyDirectChange();
        });
        text.onChange(async val => {
          this.rule.exceptFolderPath = val;
          await this.applyDirectChange();
        });
      });

    updateFolderScopeVisibility();

    // Section 3: Colors & Style
    contentEl.createEl('h4', { text: 'Color & Appearance' });

    new Setting(contentEl)
      .setName('Style Mode')
      .setDesc('Choose between a rounded pill badge (border + background tint) or text color only')
      .addDropdown(dd => {
        dd.addOption('badge', 'Badge Style (Pill with border & tint)');
        dd.addOption('text-only', 'Text Color Only (No badge or border)');
        dd.setValue(this.rule.styleMode || 'badge');
        dd.onChange(async val => {
          this.rule.styleMode = val as RuleStyleMode;
          await this.applyDirectChange();
        });
      });

    const prefixDesc = document.createDocumentFragment();
    prefixDesc.appendChild(document.createTextNode('Optional icon or text prefix for this property (e.g., bookmark, check, star, book-open, or emojis like 📖, ⭐). Browse all available icons at '));
    const lucideLink = document.createElement('a');
    lucideLink.textContent = 'lucide.dev/icons';
    lucideLink.href = 'https://lucide.dev/icons';
    lucideLink.target = '_blank';
    lucideLink.rel = 'noopener noreferrer';
    lucideLink.className = 'property-painter-external-link';
    prefixDesc.appendChild(lucideLink);
    prefixDesc.appendChild(document.createTextNode('.'));

    new Setting(contentEl)
      .setName('Prefix Icon or Symbol')
      .setDesc(prefixDesc)
      .addText(text => {
        text.setPlaceholder('e.g. bookmark, check, star, 📖');
        text.setValue(this.rule.prefixIcon || '');
        text.onChange(async val => {
          this.rule.prefixIcon = val;
          await this.applyDirectChange();
        });
      });

    let colorTextComp: TextComponent | null = null;
    let colorPickerComp: ColorComponent | null = null;
    let bgComp: TextComponent | null = null;

    new Setting(contentEl)
      .setName('Text Color')
      .setDesc('Hex or CSS color for text and indicator dot (e.g., #FCE7B2, #CFF3D8, #D9E8FF)')
      .addColorPicker(cp => {
        colorPickerComp = cp;
        const validHex = this.rule.textColor.startsWith('#') && this.rule.textColor.length === 7 ? this.rule.textColor : '#FCE7B2';
        cp.setValue(validHex);
        cp.onChange(async val => {
          this.rule.textColor = val;
          if (colorTextComp) colorTextComp.setValue(val);
          await this.applyDirectChange();
        });
      })
      .addText(text => {
        colorTextComp = text;
        text.setValue(this.rule.textColor || '#FCE7B2');
        text.onChange(async val => {
          this.rule.textColor = val;
          if (colorPickerComp && val.startsWith('#') && val.length === 7) {
            colorPickerComp.setValue(val);
          }
          await this.applyDirectChange();
        });
      });

    new Setting(contentEl)
      .setName('Background Color')
      .setDesc('Background tint when Badge style is enabled (e.g. rgba(252, 231, 178, 0.15))')
      .addText(text => {
        bgComp = text;
        text.setPlaceholder('rgba(252, 231, 178, 0.15)');
        text.setValue(this.rule.backgroundColor || '');
        text.onChange(async val => {
          this.rule.backgroundColor = val;
          await this.applyDirectChange();
        });
      });

    // Section 3: Target Scopes
    contentEl.createEl('h4', { text: 'Note Properties Scope' });

    new Setting(contentEl)
      .setName('Apply to Note Properties')
      .setDesc('Apply color inside note property views in both Live Preview and Reading View')
      .addToggle(toggle => {
        toggle.setValue(this.rule.applyToProperties).onChange(async val => {
          this.rule.applyToProperties = val;
          await this.applyDirectChange();
        });
      });

    // Property formatting buttons (Bold, Italic, Strikethrough)
    const propFormatSetting = new Setting(contentEl)
      .setName('Property text formatting')
      .setDesc('Format property value with bold, italic, or strikethrough in note properties');

    const propFormatGroup = propFormatSetting.controlEl.createDiv({ cls: 'rule-editor-format-group' });

    const pBoldBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.propertyBold ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Bold' }
    });
    setIcon(pBoldBtn, 'bold');
    pBoldBtn.addEventListener('click', async () => {
      this.rule.propertyBold = !this.rule.propertyBold;
      pBoldBtn.toggleClass('is-active', this.rule.propertyBold);
      await this.applyDirectChange();
    });

    const pItalicBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.propertyItalic ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Italic' }
    });
    setIcon(pItalicBtn, 'italic');
    pItalicBtn.addEventListener('click', async () => {
      this.rule.propertyItalic = !this.rule.propertyItalic;
      pItalicBtn.toggleClass('is-active', this.rule.propertyItalic);
      await this.applyDirectChange();
    });

    const pStrikeBtn = propFormatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.propertyStrike ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Strikethrough' }
    });
    setIcon(pStrikeBtn, 'strikethrough');
    pStrikeBtn.addEventListener('click', async () => {
      this.rule.propertyStrike = !this.rule.propertyStrike;
      pStrikeBtn.toggleClass('is-active', this.rule.propertyStrike);
      await this.applyDirectChange();
    });

    // Section 4: File Explorer Styling Settings
    contentEl.createEl('h4', { text: 'File Explorer Styling' });

    new Setting(contentEl)
      .setName('Apply Color to File Explorer')
      .setDesc('Color note filenames in the File Explorer tree')
      .addToggle(toggle => {
        toggle.setValue(this.rule.applyToFileExplorer).onChange(async val => {
          this.rule.applyToFileExplorer = val;
          await this.applyDirectChange();
        });
      });

    // Compact Formatting Icon Button Group for Bold, Italic, Strikethrough
    const formatSetting = new Setting(contentEl)
      .setName('File Explorer text formatting')
      .setDesc('Format filename with bold, italic, or strikethrough in File Explorer');

    const formatGroup = formatSetting.controlEl.createDiv({ cls: 'rule-editor-format-group' });

    // Bold icon button
    const boldBtn = formatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.explorerBold ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Bold' }
    });
    setIcon(boldBtn, 'bold');
    boldBtn.addEventListener('click', async () => {
      this.rule.explorerBold = !this.rule.explorerBold;
      boldBtn.toggleClass('is-active', this.rule.explorerBold);
      await this.applyDirectChange();
    });

    // Italic icon button
    const italicBtn = formatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.explorerItalic ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Italic' }
    });
    setIcon(italicBtn, 'italic');
    italicBtn.addEventListener('click', async () => {
      this.rule.explorerItalic = !this.rule.explorerItalic;
      italicBtn.toggleClass('is-active', this.rule.explorerItalic);
      await this.applyDirectChange();
    });

    // Strikethrough icon button
    const strikeBtn = formatGroup.createEl('button', {
      cls: `rule-editor-format-btn ${this.rule.explorerStrike ? 'is-active' : ''}`,
      attr: { type: 'button', 'aria-label': 'Strikethrough' }
    });
    setIcon(strikeBtn, 'strikethrough');
    strikeBtn.addEventListener('click', async () => {
      this.rule.explorerStrike = !this.rule.explorerStrike;
      strikeBtn.toggleClass('is-active', this.rule.explorerStrike);
      await this.applyDirectChange();
    });

    new Setting(contentEl)
      .setName('Show Indicator Dot')
      .setDesc('Display a colored dot next to the note title in File Explorer')
      .addToggle(toggle => {
        toggle.setValue(this.rule.showExplorerDot).onChange(async val => {
          this.rule.showExplorerDot = val;
          await this.applyDirectChange();
        });
      });

    new Setting(contentEl)
      .setName('Glow effect on indicator dot')
      .setDesc('Add a luminous glow effect to the indicator dot matching the rule color')
      .addToggle(toggle => {
        toggle.setValue(this.rule.explorerDotGlow).onChange(async val => {
          this.rule.explorerDotGlow = val;
          await this.applyDirectChange();
        });
      });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.onSaveCallback();
  }
}
