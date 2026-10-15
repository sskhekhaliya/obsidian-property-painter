export type RuleOperator = 'equals' | 'contains' | 'starts-with' | 'ends-with' | 'regex' | 'empty' | 'filled';
export type RuleStyleMode = 'badge' | 'text-only';
export type RuleFolderScope = 'global' | 'folder';

export interface PropertyColorRule {
  id: string;
  name: string;
  enabled: boolean;
  property: string;
  operator: RuleOperator;
  value: string;
  folderScope?: RuleFolderScope;
  folderPath?: string;
  exceptFolderPath?: string;
  textColor: string;
  backgroundColor: string;
  styleMode: RuleStyleMode;
  prefixIcon?: string;
  propertyBold?: boolean;
  propertyItalic?: boolean;
  propertyStrike?: boolean;
  applyToProperties: boolean;
  applyToFileExplorer: boolean;
  showExplorerDot: boolean;
  explorerDotGlow: boolean;
  explorerBold: boolean;
  explorerItalic: boolean;
  explorerStrike: boolean;
  caseSensitive: boolean;
}

export type ThumbnailPosition = 'right' | 'left';
export type ThumbnailAspectRatio = 'cover' | 'square' | 'wide' | 'auto';
export type ThumbnailObjectFit = 'cover' | 'contain';
export type ThumbnailClickAction = 'modal' | 'open-file' | 'none';
export type ExplorerStyleMode = 'color-and-dot' | 'color-only' | 'dot-only';

export interface PropertyPainterSettings {
  // Thumbnail settings
  thumbnailEnabled: boolean;
  thumbnailPosition: ThumbnailPosition;
  thumbnailPropertyKeys: string;
  thumbnailAutoDetect: boolean;
  thumbnailWidth: number;
  thumbnailMaxHeight: number;
  thumbnailMaintainAspectRatio: boolean;
  thumbnailAspectRatio: ThumbnailAspectRatio;
  thumbnailObjectFit: ThumbnailObjectFit;
  thumbnailBorderRadius: number;
  thumbnailClickAction: ThumbnailClickAction;

  // Property & Explorer Rules
  rules: PropertyColorRule[];

  // Theme & Appearance
  autoThemeColors: boolean;
  globalStyleMode: RuleStyleMode;
  overrideGlobalSettings: boolean;
  globalPropertyBold: boolean;
  globalPropertyItalic: boolean;
  globalPropertyStrike: boolean;

  // File Explorer settings
  explorerEnabled: boolean;
  overrideGlobalExplorerSettings?: boolean;
  globalExplorerBold: boolean;
  globalExplorerItalic: boolean;
  globalExplorerStrike: boolean;
  globalShowExplorerDot: boolean;
  globalExplorerDotGlow: boolean;
  explorerStyleMode: ExplorerStyleMode;
  explorerDotSize: number;
  explorerDotGlow: boolean;
}

export const DEFAULT_RULES: PropertyColorRule[] = [
  {
    id: 'default-shelf-to-read',
    name: 'Shelf: To Read',
    enabled: true,
    property: 'shelf',
    operator: 'equals',
    value: 'to-read',
    folderScope: 'global',
    folderPath: '',
    exceptFolderPath: '',
    textColor: '#FCE7B2',
    backgroundColor: 'rgba(252, 231, 178, 0.15)',
    styleMode: 'badge',
    prefixIcon: 'bookmark',
    propertyBold: false,
    propertyItalic: false,
    propertyStrike: false,
    applyToProperties: true,
    applyToFileExplorer: true,
    showExplorerDot: true,
    explorerDotGlow: true,
    explorerBold: false,
    explorerItalic: false,
    explorerStrike: false,
    caseSensitive: false
  },
  {
    id: 'default-shelf-read',
    name: 'Shelf: Read',
    enabled: true,
    property: 'shelf',
    operator: 'equals',
    value: 'read',
    folderScope: 'global',
    folderPath: '',
    exceptFolderPath: '',
    textColor: '#CFF3D8',
    backgroundColor: 'rgba(207, 243, 216, 0.15)',
    styleMode: 'badge',
    prefixIcon: 'check',
    propertyBold: false,
    propertyItalic: false,
    propertyStrike: false,
    applyToProperties: true,
    applyToFileExplorer: true,
    showExplorerDot: true,
    explorerDotGlow: true,
    explorerBold: false,
    explorerItalic: false,
    explorerStrike: false,
    caseSensitive: false
  },
  {
    id: 'default-shelf-currently-reading',
    name: 'Shelf: Currently Reading',
    enabled: true,
    property: 'shelf',
    operator: 'equals',
    value: 'currently-reading',
    folderScope: 'global',
    folderPath: '',
    exceptFolderPath: '',
    textColor: '#D9E8FF',
    backgroundColor: 'rgba(217, 232, 255, 0.15)',
    styleMode: 'badge',
    prefixIcon: 'book-open',
    propertyBold: false,
    propertyItalic: false,
    propertyStrike: false,
    applyToProperties: true,
    applyToFileExplorer: true,
    showExplorerDot: true,
    explorerDotGlow: true,
    explorerBold: false,
    explorerItalic: false,
    explorerStrike: false,
    caseSensitive: false
  }
];

export const DEFAULT_SETTINGS: PropertyPainterSettings = {
  thumbnailEnabled: true,
  thumbnailPosition: 'left', // Default is now Left
  thumbnailPropertyKeys: 'cover, image, thumbnail, poster, banner',
  thumbnailAutoDetect: true,
  thumbnailWidth: 120,
  thumbnailMaxHeight: 180,
  thumbnailMaintainAspectRatio: true,
  thumbnailAspectRatio: 'cover',
  thumbnailObjectFit: 'cover',
  thumbnailBorderRadius: 8,
  thumbnailClickAction: 'modal',

  rules: DEFAULT_RULES,

  autoThemeColors: true,
  globalStyleMode: 'badge',
  overrideGlobalSettings: true,
  globalPropertyBold: false,
  globalPropertyItalic: false,
  globalPropertyStrike: false,

  explorerEnabled: true,
  overrideGlobalExplorerSettings: true,
  globalExplorerBold: false,
  globalExplorerItalic: false,
  globalExplorerStrike: false,
  globalShowExplorerDot: true,
  globalExplorerDotGlow: true,
  explorerStyleMode: 'color-and-dot',
  explorerDotSize: 7,
  explorerDotGlow: true
};
