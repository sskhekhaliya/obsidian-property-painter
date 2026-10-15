"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PropertyPainterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/types.ts
var DEFAULT_RULES = [
  {
    id: "default-shelf-to-read",
    name: "Shelf: To Read",
    enabled: true,
    property: "shelf",
    operator: "equals",
    value: "to-read",
    folderScope: "global",
    folderPath: "",
    exceptFolderPath: "",
    textColor: "#FCE7B2",
    backgroundColor: "rgba(252, 231, 178, 0.15)",
    styleMode: "badge",
    prefixIcon: "bookmark",
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
    id: "default-shelf-read",
    name: "Shelf: Read",
    enabled: true,
    property: "shelf",
    operator: "equals",
    value: "read",
    folderScope: "global",
    folderPath: "",
    exceptFolderPath: "",
    textColor: "#CFF3D8",
    backgroundColor: "rgba(207, 243, 216, 0.15)",
    styleMode: "badge",
    prefixIcon: "check",
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
    id: "default-shelf-currently-reading",
    name: "Shelf: Currently Reading",
    enabled: true,
    property: "shelf",
    operator: "equals",
    value: "currently-reading",
    folderScope: "global",
    folderPath: "",
    exceptFolderPath: "",
    textColor: "#D9E8FF",
    backgroundColor: "rgba(217, 232, 255, 0.15)",
    styleMode: "badge",
    prefixIcon: "book-open",
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
var DEFAULT_SETTINGS = {
  thumbnailEnabled: true,
  thumbnailPosition: "left",
  // Default is now Left
  thumbnailPropertyKeys: "cover, image, thumbnail, poster, banner",
  thumbnailAutoDetect: true,
  thumbnailWidth: 120,
  thumbnailMaxHeight: 180,
  thumbnailMaintainAspectRatio: true,
  thumbnailAspectRatio: "cover",
  thumbnailObjectFit: "cover",
  thumbnailBorderRadius: 8,
  thumbnailClickAction: "modal",
  rules: DEFAULT_RULES,
  autoThemeColors: true,
  globalStyleMode: "badge",
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
  explorerStyleMode: "color-and-dot",
  explorerDotSize: 7,
  explorerDotGlow: true
};

// src/thumbnail-manager.ts
var import_obsidian = require("obsidian");
var IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".bmp"];
var ThumbnailManager = class {
  constructor(app) {
    this.failedUrls = /* @__PURE__ */ new Set();
    this.app = app;
  }
  clearFailedCache() {
    this.failedUrls.clear();
  }
  /**
   * Extracts an image reference string from frontmatter value
   */
  extractImageReference(value) {
    if (value === null || value === void 0) return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.extractImageReference(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof value !== "string") return null;
    const str = value.trim();
    if (!str) return null;
    if (/^https?:\/\//i.test(str) || /^data:image\//i.test(str)) {
      return str;
    }
    const mdMatch = str.match(/^!?\[.*?\]\((https?:\/\/[^\s\)]+|[^\s\)]+)\)$/);
    if (mdMatch && mdMatch[1]) {
      const url = mdMatch[1].trim();
      if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url) || IMAGE_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext))) {
        return url;
      }
    }
    const wikiMatch = str.match(/^!?\[\[(.*?)(?:\|.*)?\]\]$/);
    if (wikiMatch && wikiMatch[1]) {
      const target = wikiMatch[1].trim();
      const isEmbed = str.startsWith("!");
      const hasImgExt = IMAGE_EXTENSIONS.some((ext) => target.toLowerCase().endsWith(ext));
      if (isEmbed || hasImgExt) {
        return target;
      }
      return null;
    }
    const cleanLower = str.toLowerCase();
    if (IMAGE_EXTENSIONS.some((ext) => cleanLower.endsWith(ext))) {
      return str;
    }
    return null;
  }
  /**
   * Finds the image reference in a note's frontmatter
   */
  findImageInFrontmatter(frontmatter, settings) {
    if (!frontmatter) return null;
    const keys = settings.thumbnailPropertyKeys.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    for (const key of keys) {
      if (key in frontmatter) {
        const ref = this.extractImageReference(frontmatter[key]);
        if (ref) return ref;
      }
      const lowerKey = key.toLowerCase();
      const matchedEntry = Object.keys(frontmatter).find((k) => k.toLowerCase() === lowerKey);
      if (matchedEntry) {
        const ref = this.extractImageReference(frontmatter[matchedEntry]);
        if (ref) return ref;
      }
    }
    if (settings.thumbnailAutoDetect) {
      for (const [k, val] of Object.entries(frontmatter)) {
        if (keys.some((ck) => ck.toLowerCase() === k.toLowerCase())) continue;
        const ref = this.extractImageReference(val);
        if (ref) return ref;
      }
    }
    return null;
  }
  /**
   * Resolves vault file or external URL to a usable resource URL
   */
  resolveImageUrl(reference, sourcePath) {
    if (/^https?:\/\//i.test(reference) || /^data:image\//i.test(reference)) {
      return { url: reference, file: null, isValid: true };
    }
    let cleanPath = reference.replace(/^!?\[\[/, "").replace(/\]\]$/, "");
    const pipeIndex = cleanPath.indexOf("|");
    if (pipeIndex !== -1) {
      cleanPath = cleanPath.substring(0, pipeIndex);
    }
    cleanPath = cleanPath.trim();
    let file = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);
    if (!file) {
      const abstractFile = this.app.vault.getAbstractFileByPath(cleanPath);
      if (abstractFile instanceof import_obsidian.TFile) {
        file = abstractFile;
      }
    }
    if (!file) {
      const allFiles = this.app.vault.getFiles();
      const filenameOnly = cleanPath.split("/").pop()?.toLowerCase();
      if (filenameOnly) {
        file = allFiles.find((f) => f.name.toLowerCase() === filenameOnly) || null;
      }
    }
    if (file instanceof import_obsidian.TFile) {
      const ext = "." + file.extension.toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        return { url: "", file: null, isValid: false };
      }
      return {
        url: this.app.vault.getResourcePath(file),
        file,
        isValid: true
      };
    }
    return { url: "", file: null, isValid: false };
  }
  /**
   * Updates or mounts the thumbnail in the active view
   */
  updateViewThumbnail(view, settings, onImageClick) {
    if (!view || !view.file) return;
    const containerEl = view.contentEl;
    const metadataContainers = Array.from(
      containerEl.querySelectorAll(".metadata-container")
    );
    const editorContainer = view.metadataEditor?.containerEl;
    if (editorContainer && !metadataContainers.includes(editorContainer)) {
      metadataContainers.push(editorContainer);
    }
    if (metadataContainers.length === 0) return;
    const activeFile = view.file;
    const cache = this.app.metadataCache.getFileCache(activeFile);
    const frontmatter = cache?.frontmatter;
    const imageRef = settings.thumbnailEnabled ? this.findImageInFrontmatter(frontmatter, settings) : null;
    metadataContainers.forEach((metaContainer) => {
      let thumbWrapper = metaContainer.querySelector(".property-painter-thumbnail-container");
      const removeThumbnail = () => {
        metaContainer.classList.remove(
          "property-painter-has-thumbnail",
          "property-painter-pos-left",
          "property-painter-pos-right"
        );
        if (thumbWrapper && thumbWrapper.parentElement) {
          thumbWrapper.remove();
        }
      };
      if (!imageRef || this.failedUrls.has(imageRef)) {
        removeThumbnail();
        return;
      }
      const { url: resolvedUrl, file: localFile, isValid } = this.resolveImageUrl(imageRef, activeFile.path);
      if (!isValid || !resolvedUrl || this.failedUrls.has(resolvedUrl)) {
        removeThumbnail();
        return;
      }
      const currentUrl = thumbWrapper?.getAttribute("data-image-url");
      if (thumbWrapper && currentUrl === resolvedUrl && thumbWrapper.querySelector("img.is-loaded")) {
        this.applyThumbnailStyles(thumbWrapper, settings);
        metaContainer.classList.add("property-painter-has-thumbnail");
        metaContainer.classList.remove("property-painter-pos-left", "property-painter-pos-right");
        metaContainer.classList.add(`property-painter-pos-${settings.thumbnailPosition}`);
        return;
      }
      const img = new Image();
      img.className = "property-painter-thumb-img";
      img.alt = "Property cover thumbnail";
      img.onload = () => {
        if (view.file?.path !== activeFile.path) return;
        if (!thumbWrapper) {
          thumbWrapper = document.createElement("div");
          thumbWrapper.className = "property-painter-thumbnail-container";
        }
        thumbWrapper.setAttribute("data-image-url", resolvedUrl);
        thumbWrapper.empty();
        const thumbCard = thumbWrapper.createDiv({ cls: "property-painter-thumb-card" });
        this.applyThumbnailStyles(thumbWrapper, settings);
        img.classList.add("is-loaded");
        thumbCard.appendChild(img);
        const zoomBtn = thumbCard.createDiv({ cls: "property-painter-zoom-btn" });
        (0, import_obsidian.setIcon)(zoomBtn, "maximize-2");
        zoomBtn.setAttribute("aria-label", "View full cover image");
        thumbCard.addEventListener("click", (evt) => {
          evt.stopPropagation();
          onImageClick(resolvedUrl, imageRef, localFile);
        });
        if (!metaContainer.contains(thumbWrapper)) {
          metaContainer.appendChild(thumbWrapper);
        }
        metaContainer.classList.add("property-painter-has-thumbnail");
        metaContainer.classList.remove("property-painter-pos-left", "property-painter-pos-right");
        metaContainer.classList.add(`property-painter-pos-${settings.thumbnailPosition}`);
      };
      img.onerror = () => {
        this.failedUrls.add(resolvedUrl);
        if (imageRef) this.failedUrls.add(imageRef);
        removeThumbnail();
      };
      img.src = resolvedUrl;
    });
  }
  /**
   * Applies CSS styles and dimensions to thumbnail container based on settings
   */
  applyThumbnailStyles(wrapper, settings) {
    const card = wrapper.querySelector(".property-painter-thumb-card");
    if (!card) return;
    wrapper.style.setProperty("--pp-thumb-width", `${settings.thumbnailWidth}px`);
    wrapper.style.setProperty("--pp-thumb-max-height", `${settings.thumbnailMaxHeight}px`);
    wrapper.style.setProperty("--pp-thumb-radius", `${settings.thumbnailBorderRadius}px`);
    wrapper.style.setProperty("--pp-thumb-fit", settings.thumbnailObjectFit);
    card.classList.remove("aspect-cover", "aspect-square", "aspect-wide", "aspect-auto", "aspect-linked");
    if (settings.thumbnailMaintainAspectRatio) {
      card.classList.add("aspect-linked");
    } else {
      card.classList.add(`aspect-${settings.thumbnailAspectRatio}`);
    }
  }
};

// src/rule-manager.ts
var import_obsidian2 = require("obsidian");

// src/color-utils.ts
function isDarkTheme() {
  if (typeof document === "undefined") return true;
  return document.body.classList.contains("theme-dark") || !document.body.classList.contains("theme-light");
}
function parseColor(colorStr) {
  if (!colorStr) return null;
  const str = colorStr.trim();
  if (str.startsWith("#")) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== void 0 ? parseFloat(rgbMatch[4]) : 1
    };
  }
  return null;
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToHex(h, s, l) {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (n) => {
    const val = Math.round((n + m) * 255).toString(16);
    return val.length === 1 ? "0" + val : val;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function getAdaptiveTextColor(color, autoAdjust) {
  if (!autoAdjust) return color;
  const parsed = parseColor(color);
  if (!parsed) return color;
  const isDark = isDarkTheme();
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
  if (isDark) {
    if (hsl.l < 55) {
      return hslToHex(hsl.h, Math.min(hsl.s, 90), 75);
    }
    return color;
  } else {
    if (hsl.l > 45) {
      const targetL = Math.max(26, Math.min(38, hsl.l - 45));
      const targetS = Math.min(100, Math.max(65, hsl.s));
      return hslToHex(hsl.h, targetS, targetL);
    }
    return color;
  }
}
function getAdaptiveBackgroundColor(bgColor, baseTextColor, autoAdjust) {
  if (!autoAdjust && bgColor) return bgColor;
  const isDark = isDarkTheme();
  const textParsed = parseColor(baseTextColor);
  if (bgColor) {
    const bgParsed = parseColor(bgColor);
    if (bgParsed) {
      if (!isDark && bgParsed.a < 0.25) {
        return `rgba(${bgParsed.r}, ${bgParsed.g}, ${bgParsed.b}, 0.22)`;
      }
      return bgColor;
    }
  }
  if (textParsed) {
    const alpha = isDark ? 0.16 : 0.18;
    return `rgba(${textParsed.r}, ${textParsed.g}, ${textParsed.b}, ${alpha})`;
  }
  return bgColor || "transparent";
}

// src/rule-manager.ts
var RuleManager = class {
  constructor(app) {
    this.app = app;
  }
  /**
   * Tests if a given value matches a rule condition
   */
  matchesRule(rule, targetValue) {
    if (rule.operator === "empty") {
      if (targetValue === null || targetValue === void 0) return true;
      if (Array.isArray(targetValue)) {
        return targetValue.length === 0 || targetValue.every((item) => item === null || item === void 0 || String(item).trim() === "");
      }
      if (typeof targetValue === "string") {
        return targetValue.trim() === "";
      }
      return false;
    }
    if (rule.operator === "filled") {
      if (targetValue === null || targetValue === void 0) return false;
      if (Array.isArray(targetValue)) {
        return targetValue.length > 0 && targetValue.some((item) => item !== null && item !== void 0 && String(item).trim() !== "");
      }
      if (typeof targetValue === "string") {
        return targetValue.trim() !== "";
      }
      if (typeof targetValue === "number" || typeof targetValue === "boolean") {
        return true;
      }
      if (typeof targetValue === "object") {
        return Object.keys(targetValue).length > 0;
      }
      return Boolean(targetValue);
    }
    if (targetValue === null || targetValue === void 0) return false;
    if (Array.isArray(targetValue)) {
      return targetValue.some((item) => this.matchesRule(rule, item));
    }
    const valStr = String(targetValue).trim();
    if (!valStr) return false;
    const source = rule.caseSensitive ? valStr : valStr.toLowerCase();
    const target = rule.caseSensitive ? (rule.value || "").trim() : (rule.value || "").trim().toLowerCase();
    switch (rule.operator) {
      case "equals":
        return source === target;
      case "contains":
        return source.includes(target);
      case "starts-with":
        return source.startsWith(target);
      case "ends-with":
        return source.endsWith(target);
      case "regex":
        try {
          const re = new RegExp(rule.value || "", rule.caseSensitive ? "" : "i");
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
  isFileMatchingFolderScope(rule, filePath) {
    if (!filePath) return true;
    const normalizedPath = filePath.replace(/\\/g, "/").trim();
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    const fileDir = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : "";
    const lowerFileDir = fileDir.toLowerCase();
    if (rule.exceptFolderPath && rule.exceptFolderPath.trim()) {
      const exceptList = rule.exceptFolderPath.split(",").map((f) => f.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")).filter(Boolean);
      for (const exceptFolder of exceptList) {
        const lowerExcept = exceptFolder.toLowerCase();
        if (lowerFileDir === lowerExcept || lowerFileDir.startsWith(lowerExcept + "/")) {
          return false;
        }
      }
    }
    if (rule.folderScope === "folder" && rule.folderPath && rule.folderPath.trim()) {
      const targetFolder = rule.folderPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      if (targetFolder) {
        const lowerTarget = targetFolder.toLowerCase();
        if (lowerFileDir !== lowerTarget && !lowerFileDir.startsWith(lowerTarget + "/")) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Finds the first matching rule for a property key & value in properties view
   */
  findMatchingPropertyRule(rules, key, value, filePath) {
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
  findMatchingExplorerRule(rules, frontmatter, filePath) {
    if (!frontmatter) return null;
    for (const rule of rules) {
      if (!rule.enabled || !rule.applyToFileExplorer) continue;
      if (!this.isFileMatchingFolderScope(rule, filePath)) continue;
      const ruleKeyLower = rule.property.trim().toLowerCase();
      const matchingKey = Object.keys(frontmatter).find((k) => k.trim().toLowerCase() === ruleKeyLower);
      if (matchingKey !== void 0) {
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
  updateViewProperties(view, settings) {
    if (!view || !view.file) return;
    const metadataContainers = [];
    if (view.contentEl) {
      view.contentEl.querySelectorAll(".metadata-container").forEach((c) => metadataContainers.push(c));
    }
    if (view.containerEl) {
      view.containerEl.querySelectorAll(".metadata-container").forEach((c) => {
        if (!metadataContainers.includes(c)) metadataContainers.push(c);
      });
    }
    const editorContainer = view.metadataEditor?.containerEl;
    if (editorContainer && !metadataContainers.includes(editorContainer)) {
      metadataContainers.push(editorContainer);
    }
    if (metadataContainers.length === 0) return;
    const cache = this.app.metadataCache.getFileCache(view.file);
    const frontmatter = cache?.frontmatter;
    const filePath = view.file.path;
    metadataContainers.forEach((container) => {
      const propertyElements = container.querySelectorAll(".metadata-property");
      propertyElements.forEach((propEl) => {
        let key = propEl.getAttribute("data-property-key");
        if (!key) {
          const keyInput = propEl.querySelector(
            ".metadata-property-key-input, input.metadata-property-key, .metadata-property-key"
          );
          key = keyInput ? (keyInput.value || keyInput.textContent || "").trim() : "";
        }
        if (!key) return;
        const valueEl = propEl.querySelector(".metadata-property-value");
        if (!valueEl) return;
        let fmValue = frontmatter ? frontmatter[key] : void 0;
        if (fmValue === void 0 && frontmatter) {
          const matchKey = Object.keys(frontmatter).find((k) => k.toLowerCase() === key.toLowerCase());
          if (matchKey) fmValue = frontmatter[matchKey];
        }
        const textInput = valueEl.querySelector(
          ".metadata-input-longtext, input, textarea, [contenteditable]"
        );
        let liveVal = void 0;
        if (textInput) {
          const inpVal = textInput.value;
          if (inpVal !== void 0 && inpVal !== "") {
            liveVal = inpVal.trim();
          } else {
            const txt = (textInput.textContent || "").trim();
            if (txt) liveVal = txt;
          }
        } else {
          const txt = (valueEl.textContent || "").trim();
          if (txt) liveVal = txt;
        }
        const effectiveValue = liveVal !== void 0 ? liveVal : fmValue;
        const pills = valueEl.querySelectorAll(".multi-select-pill");
        if (pills && pills.length > 0) {
          const oldWrapper = valueEl.querySelector(":scope > .property-painter-value-pill");
          if (oldWrapper) {
            while (oldWrapper.firstChild) {
              valueEl.insertBefore(oldWrapper.firstChild, oldWrapper);
            }
            oldWrapper.remove();
          }
          this.renderPrefixIcon(valueEl, "");
          let hasAnyMatch = false;
          let matchedRule = null;
          pills.forEach((pill) => {
            const pillContent = pill.querySelector(".multi-select-pill-content");
            const pillText = (pillContent?.textContent || pill.textContent || "").trim();
            const rule2 = this.findMatchingPropertyRule(settings.rules, key, pillText, filePath);
            if (rule2) {
              hasAnyMatch = true;
              matchedRule = rule2;
              this.applyPillStyles(pill, rule2, settings);
              this.renderPrefixIcon(pill, rule2.prefixIcon);
            } else {
              this.clearPillStyles(pill);
              this.renderPrefixIcon(pill, "");
            }
          });
          if (hasAnyMatch && matchedRule) {
            const effColor = getAdaptiveTextColor(matchedRule.textColor, settings.autoThemeColors);
            propEl.setAttribute("data-property-painter-match", matchedRule.id);
            propEl.style.setProperty("--pp-rule-color", effColor, "important");
            valueEl.style.setProperty("--metadata-input-text-color", effColor, "important");
          } else {
            propEl.removeAttribute("data-property-painter-match");
            propEl.style.removeProperty("--pp-rule-color");
            valueEl.style.removeProperty("--metadata-input-text-color");
          }
          valueEl.style.backgroundColor = "";
          return;
        }
        const rule = this.findMatchingPropertyRule(settings.rules, key, effectiveValue, filePath);
        const targetElements = valueEl.querySelectorAll(
          ".metadata-input-longtext, input, textarea, [contenteditable], .metadata-property-input"
        );
        valueEl.style.backgroundColor = "";
        valueEl.classList.remove("property-painter-styled-value");
        const keyEl = propEl.querySelector(".metadata-property-key");
        if (keyEl) {
          keyEl.style.removeProperty("color");
          keyEl.style.removeProperty("-webkit-text-fill-color");
        }
        if (rule) {
          const effectiveTextColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
          const effectiveBgColor = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, settings.autoThemeColors);
          const usePerRule = settings.overrideGlobalSettings ?? true;
          const effectiveStyleMode = usePerRule ? rule.styleMode : settings.globalStyleMode || "badge";
          const isBold = usePerRule ? rule.propertyBold ?? false : settings.globalPropertyBold;
          const isItalic = usePerRule ? rule.propertyItalic ?? false : settings.globalPropertyItalic;
          const isStrike = usePerRule ? rule.propertyStrike ?? false : settings.globalPropertyStrike;
          propEl.setAttribute("data-property-painter-match", rule.id);
          propEl.style.setProperty("--pp-rule-color", effectiveTextColor, "important");
          propEl.style.setProperty("--pp-rule-bg", effectiveStyleMode === "text-only" ? "transparent" : effectiveBgColor, "important");
          propEl.style.setProperty("--pp-rule-border", effectiveStyleMode === "text-only" ? "transparent" : effectiveTextColor, "important");
          valueEl.style.setProperty("--metadata-input-text-color", effectiveTextColor, "important");
          valueEl.style.setProperty("--metadata-value-text-color", effectiveTextColor, "important");
          valueEl.style.setProperty("--text-normal", effectiveTextColor, "important");
          valueEl.style.setProperty("color", effectiveTextColor, "important");
          valueEl.style.setProperty("-webkit-text-fill-color", effectiveTextColor, "important");
          valueEl.style.setProperty("font-weight", isBold ? "bold" : "normal", "important");
          valueEl.style.setProperty("font-style", isItalic ? "italic" : "normal", "important");
          valueEl.style.setProperty("text-decoration", isStrike ? "line-through" : "none", "important");
          const looseIcon = valueEl.querySelector(":scope > .property-painter-prefix-icon");
          if (looseIcon) looseIcon.remove();
          let pillWrapper = valueEl.querySelector(":scope > .property-painter-value-pill");
          if (!pillWrapper) {
            pillWrapper = document.createElement("div");
            pillWrapper.className = "property-painter-pill property-painter-value-pill";
            if (targetElements.length > 0) {
              const mainTarget = targetElements[0];
              valueEl.insertBefore(pillWrapper, mainTarget);
              pillWrapper.appendChild(mainTarget);
            } else {
              const nodesToMove = Array.from(valueEl.childNodes).filter((node) => {
                return !(node instanceof HTMLElement && node.classList.contains("property-painter-prefix-icon"));
              });
              valueEl.appendChild(pillWrapper);
              nodesToMove.forEach((node) => pillWrapper.appendChild(node));
            }
          }
          this.applyPillStyles(pillWrapper, rule, settings, effectiveStyleMode);
          this.renderPrefixIcon(pillWrapper, rule.prefixIcon);
          targetElements.forEach((targetEl) => {
            targetEl.classList.remove("property-painter-pill", "property-painter-text-only");
            targetEl.style.removeProperty("--pp-pill-border");
            targetEl.style.removeProperty("--pp-pill-bg");
            targetEl.style.removeProperty("border");
            targetEl.style.removeProperty("border-color");
            targetEl.style.removeProperty("background-color");
            targetEl.style.removeProperty("box-shadow");
          });
        } else {
          propEl.removeAttribute("data-property-painter-match");
          propEl.style.removeProperty("--pp-rule-color");
          propEl.style.removeProperty("--pp-rule-bg");
          propEl.style.removeProperty("--pp-rule-border");
          valueEl.style.removeProperty("--metadata-input-text-color");
          valueEl.style.removeProperty("--metadata-value-text-color");
          valueEl.style.removeProperty("--text-normal");
          valueEl.style.removeProperty("color");
          valueEl.style.removeProperty("-webkit-text-fill-color");
          valueEl.style.removeProperty("font-weight");
          valueEl.style.removeProperty("font-style");
          valueEl.style.removeProperty("text-decoration");
          const pillWrapper = valueEl.querySelector(":scope > .property-painter-value-pill");
          if (pillWrapper) {
            this.clearPillStyles(pillWrapper);
            while (pillWrapper.firstChild) {
              const child = pillWrapper.firstChild;
              if (child instanceof HTMLElement && child.classList.contains("property-painter-prefix-icon")) {
                child.remove();
              } else {
                valueEl.insertBefore(child, pillWrapper);
              }
            }
            pillWrapper.remove();
          }
          const looseIcon = valueEl.querySelector(":scope > .property-painter-prefix-icon");
          if (looseIcon) looseIcon.remove();
          targetElements.forEach((targetEl) => {
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
  renderPrefixIcon(container, prefix) {
    const desiredPrefix = prefix ? prefix.trim() : "";
    const existingIcon = container.querySelector(":scope > .property-painter-prefix-icon");
    if (desiredPrefix) {
      if (!existingIcon || existingIcon.getAttribute("data-icon") !== desiredPrefix) {
        if (existingIcon) existingIcon.remove();
        const iconSpan = document.createElement("span");
        iconSpan.className = "property-painter-prefix-icon";
        iconSpan.setAttribute("data-icon", desiredPrefix);
        iconSpan.setAttribute("contenteditable", "false");
        let iconName = desiredPrefix;
        if (iconName.toLowerCase().startsWith("lucide-")) {
          iconName = iconName.slice(7);
        }
        (0, import_obsidian2.setIcon)(iconSpan, iconName.toLowerCase());
        if (!iconSpan.querySelector("svg")) {
          (0, import_obsidian2.setIcon)(iconSpan, iconName);
        }
        if (!iconSpan.querySelector("svg")) {
          iconSpan.textContent = desiredPrefix;
        }
        const pillContent = container.querySelector(".multi-select-pill-content");
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
  applyPillStyles(el, rule, settings, styleModeOverride) {
    const effectiveTextColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
    const effectiveBgColor = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, settings.autoThemeColors);
    const usePerRule = settings.overrideGlobalSettings ?? true;
    const effectiveStyleMode = styleModeOverride ? styleModeOverride : usePerRule ? rule.styleMode : settings.globalStyleMode || "badge";
    const isBold = usePerRule ? rule.propertyBold ?? false : settings.globalPropertyBold;
    const isItalic = usePerRule ? rule.propertyItalic ?? false : settings.globalPropertyItalic;
    const isStrike = usePerRule ? rule.propertyStrike ?? false : settings.globalPropertyStrike;
    el.style.setProperty("--pp-pill-color", effectiveTextColor, "important");
    el.style.setProperty("--pp-rule-color", effectiveTextColor, "important");
    el.style.setProperty("--metadata-input-text-color", effectiveTextColor, "important");
    el.style.setProperty("--metadata-value-text-color", effectiveTextColor, "important");
    el.style.setProperty("color", effectiveTextColor, "important");
    el.style.setProperty("-webkit-text-fill-color", effectiveTextColor, "important");
    el.style.setProperty("font-weight", isBold ? "bold" : "normal", "important");
    el.style.setProperty("font-style", isItalic ? "italic" : "normal", "important");
    el.style.setProperty("text-decoration", isStrike ? "line-through" : "none", "important");
    const nestedPillContent = el.querySelector(".multi-select-pill-content");
    if (nestedPillContent) {
      nestedPillContent.style.setProperty("color", effectiveTextColor, "important");
      nestedPillContent.style.setProperty("-webkit-text-fill-color", effectiveTextColor, "important");
      nestedPillContent.style.setProperty("font-weight", isBold ? "bold" : "normal", "important");
      nestedPillContent.style.setProperty("font-style", isItalic ? "italic" : "normal", "important");
      nestedPillContent.style.setProperty("text-decoration", isStrike ? "line-through" : "none", "important");
    }
    if (effectiveStyleMode === "text-only") {
      el.classList.add("property-painter-pill", "property-painter-text-only");
      el.style.setProperty("--pp-pill-bg", "transparent", "important");
      el.style.setProperty("--pp-pill-border", "transparent", "important");
      el.style.setProperty("background-color", "transparent", "important");
      el.style.setProperty("border-color", "transparent", "important");
      el.style.setProperty("box-shadow", "none", "important");
    } else {
      el.classList.remove("property-painter-text-only");
      el.classList.add("property-painter-pill");
      el.style.setProperty("--pp-pill-bg", effectiveBgColor, "important");
      el.style.setProperty("--pp-pill-border", effectiveTextColor, "important");
      el.style.setProperty("background-color", effectiveBgColor, "important");
      el.style.setProperty("border-color", effectiveTextColor, "important");
    }
    if (el.classList.contains("multi-select-pill")) {
      this.renderPrefixIcon(el, rule.prefixIcon);
    }
  }
  /**
   * Cleans up applied pill styles
   */
  clearPillStyles(el) {
    el.classList.remove("property-painter-pill", "property-painter-text-only");
    el.style.removeProperty("--pp-pill-color");
    el.style.removeProperty("--pp-rule-color");
    el.style.removeProperty("--pp-pill-bg");
    el.style.removeProperty("--pp-pill-border");
    el.style.removeProperty("--metadata-input-text-color");
    el.style.removeProperty("--metadata-value-text-color");
    el.style.removeProperty("--text-normal");
    el.style.removeProperty("color");
    el.style.removeProperty("-webkit-text-fill-color");
    el.style.removeProperty("background-color");
    el.style.removeProperty("border-color");
    el.style.removeProperty("box-shadow");
    el.style.removeProperty("font-weight");
    el.style.removeProperty("font-style");
    el.style.removeProperty("text-decoration");
    this.renderPrefixIcon(el, "");
    const nestedPillContent = el.querySelector(".multi-select-pill-content");
    if (nestedPillContent) {
      nestedPillContent.style.removeProperty("color");
      nestedPillContent.style.removeProperty("-webkit-text-fill-color");
      nestedPillContent.style.removeProperty("font-weight");
      nestedPillContent.style.removeProperty("font-style");
      nestedPillContent.style.removeProperty("text-decoration");
    }
  }
};

// src/explorer-styler.ts
var import_obsidian3 = require("obsidian");
var ExplorerStyler = class {
  constructor(app, ruleManager) {
    this.observer = null;
    this.app = app;
    this.ruleManager = ruleManager;
    this.debouncedUpdateAll = (0, import_obsidian3.debounce)(() => {
      this.updateAllExplorerItems();
    }, 100, true);
  }
  /**
   * Initializes the mutation observer on file explorer containers
   */
  initObserver() {
    this.disconnectObserver();
    const explorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
    if (explorerLeaves.length === 0) return;
    this.observer = new MutationObserver(() => {
      this.debouncedUpdateAll();
    });
    explorerLeaves.forEach((leaf) => {
      const container = leaf.view.containerEl.querySelector(".nav-files-container");
      if (container) {
        this.observer?.observe(container, {
          childList: true,
          subtree: true
        });
      }
    });
    this.updateAllExplorerItems();
  }
  disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  /**
   * Updates styling for a specific file across all file explorer leaves
   */
  updateFileItem(file, settings) {
    if (!file || file.extension !== "md") return;
    const explorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
    if (explorerLeaves.length === 0) return;
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    const rule = settings.explorerEnabled ? this.ruleManager.findMatchingExplorerRule(settings.rules, frontmatter, file.path) : null;
    explorerLeaves.forEach((leaf) => {
      const titleEls = leaf.view.containerEl.querySelectorAll(
        `.nav-file-title[data-path="${CSS.escape(file.path)}"]`
      );
      titleEls.forEach((titleEl) => {
        this.applyStyleToTitleEl(titleEl, rule, settings);
      });
    });
  }
  /**
   * Updates all file items in file explorer
   */
  updateAllExplorerItems(settings) {
    const explorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
    if (explorerLeaves.length === 0) return;
    const currentSettings = settings || this.app.plugins.plugins["obsidian-property-painter"]?.settings;
    if (!currentSettings) return;
    explorerLeaves.forEach((leaf) => {
      const titleEls = leaf.view.containerEl.querySelectorAll(".nav-file-title[data-path]");
      titleEls.forEach((titleEl) => {
        const path = titleEl.getAttribute("data-path");
        if (!path) return;
        const abstractFile = this.app.vault.getAbstractFileByPath(path);
        if (abstractFile instanceof import_obsidian3.TFile && abstractFile.extension === "md") {
          const cache = this.app.metadataCache.getFileCache(abstractFile);
          const frontmatter = cache?.frontmatter;
          const rule = currentSettings.explorerEnabled ? this.ruleManager.findMatchingExplorerRule(currentSettings.rules, frontmatter, abstractFile.path) : null;
          this.applyStyleToTitleEl(titleEl, rule, currentSettings);
        }
      });
    });
  }
  /**
   * Applies or clears styling on an individual .nav-file-title element
   */
  applyStyleToTitleEl(titleEl, rule, settings) {
    const contentEl = titleEl.querySelector(".nav-file-title-content");
    let dotEl = titleEl.querySelector(".property-painter-dot");
    if (!rule || !settings.explorerEnabled || !rule.applyToFileExplorer) {
      if (contentEl) {
        contentEl.style.color = "";
        contentEl.style.fontWeight = "";
        contentEl.style.fontStyle = "";
        contentEl.style.textDecoration = "";
        contentEl.classList.remove(
          "property-painter-styled-title",
          "is-bold",
          "is-italic",
          "is-strike"
        );
      }
      if (dotEl) {
        dotEl.remove();
      }
      titleEl.removeAttribute("data-property-painter-rule");
      return;
    }
    const effectiveColor = getAdaptiveTextColor(rule.textColor, settings.autoThemeColors);
    titleEl.setAttribute("data-property-painter-rule", rule.id);
    const usePerRule = settings.overrideGlobalSettings ?? settings.overrideGlobalExplorerSettings ?? true;
    const isBold = usePerRule ? rule.explorerBold : settings.globalExplorerBold;
    const isItalic = usePerRule ? rule.explorerItalic : settings.globalExplorerItalic;
    const isStrike = usePerRule ? rule.explorerStrike : settings.globalExplorerStrike;
    const shouldShowDot = usePerRule ? rule.showExplorerDot ?? true : settings.globalShowExplorerDot;
    const hasGlow = usePerRule ? rule.explorerDotGlow ?? true : settings.globalExplorerDotGlow;
    if (contentEl) {
      contentEl.style.color = effectiveColor;
      contentEl.classList.add("property-painter-styled-title");
      if (isBold) {
        contentEl.style.fontWeight = "bold";
        contentEl.classList.add("is-bold");
      } else {
        contentEl.style.fontWeight = "normal";
        contentEl.classList.remove("is-bold");
      }
      if (isItalic) {
        contentEl.style.fontStyle = "italic";
        contentEl.classList.add("is-italic");
      } else {
        contentEl.style.fontStyle = "normal";
        contentEl.classList.remove("is-italic");
      }
      if (isStrike) {
        contentEl.style.textDecoration = "line-through";
        contentEl.classList.add("is-strike");
      } else {
        contentEl.style.textDecoration = "none";
        contentEl.classList.remove("is-strike");
      }
    }
    if (shouldShowDot) {
      if (!dotEl) {
        dotEl = document.createElement("span");
        dotEl.className = "property-painter-dot";
        if (contentEl) {
          titleEl.insertBefore(dotEl, contentEl);
        } else {
          titleEl.appendChild(dotEl);
        }
      }
      dotEl.style.backgroundColor = effectiveColor;
      dotEl.style.width = `${settings.explorerDotSize}px`;
      dotEl.style.height = `${settings.explorerDotSize}px`;
      dotEl.setAttribute("title", `${rule.property}: ${rule.value}`);
      if (hasGlow) {
        dotEl.classList.add("has-glow");
        const isDark = isDarkTheme();
        if (isDark) {
          dotEl.style.boxShadow = `0 0 5px ${effectiveColor}, 0 0 10px ${effectiveColor}`;
        } else {
          dotEl.style.boxShadow = `0 0 0 1.5px var(--background-primary), 0 0 5px ${effectiveColor}, 0 0 11px ${effectiveColor}`;
        }
      } else {
        dotEl.classList.remove("has-glow");
        dotEl.style.boxShadow = "none";
      }
    } else if (dotEl) {
      dotEl.remove();
    }
  }
  /**
   * Cleans up all applied styles when plugin unloads
   */
  clearAllExplorerStyles() {
    this.disconnectObserver();
    const explorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
    explorerLeaves.forEach((leaf) => {
      const styledTitles = leaf.view.containerEl.querySelectorAll(".property-painter-styled-title");
      styledTitles.forEach((el) => {
        el.style.color = "";
        el.style.fontWeight = "";
        el.style.fontStyle = "";
        el.style.textDecoration = "";
        el.classList.remove(
          "property-painter-styled-title",
          "is-bold",
          "is-italic",
          "is-strike"
        );
      });
      const dots = leaf.view.containerEl.querySelectorAll(".property-painter-dot");
      dots.forEach((dot) => dot.remove());
      const taggedElements = leaf.view.containerEl.querySelectorAll("[data-property-painter-rule]");
      taggedElements.forEach((el) => el.removeAttribute("data-property-painter-rule"));
    });
  }
};

// src/image-modal.ts
var import_obsidian4 = require("obsidian");
var ImagePreviewModal = class extends import_obsidian4.Modal {
  constructor(app, imageUrl, rawRef, file) {
    super(app);
    this.imageUrl = imageUrl;
    this.rawRef = rawRef;
    this.file = file;
  }
  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("property-painter-modal");
    contentEl.empty();
    const container = contentEl.createDiv({ cls: "property-painter-modal-container" });
    const header = container.createDiv({ cls: "property-painter-modal-header" });
    const title = header.createEl("h3", { text: this.file ? this.file.name : "Cover Preview" });
    title.className = "property-painter-modal-title";
    const info = header.createSpan({ text: this.rawRef });
    info.className = "property-painter-modal-subtitle";
    const imgWrapper = container.createDiv({ cls: "property-painter-modal-img-wrapper" });
    const img = imgWrapper.createEl("img");
    img.className = "property-painter-modal-img";
    img.src = this.imageUrl;
    img.alt = "Full cover preview";
    const footer = container.createDiv({ cls: "property-painter-modal-footer" });
    const dimSpan = footer.createSpan({ cls: "property-painter-modal-dims", text: "Loading image..." });
    img.onload = () => {
      dimSpan.setText(`${img.naturalWidth} \xD7 ${img.naturalHeight} px`);
    };
    const btnGroup = footer.createDiv({ cls: "property-painter-modal-actions" });
    if (this.file) {
      const openBtn = btnGroup.createEl("button", { cls: "mod-cta", text: "Open in Obsidian" });
      (0, import_obsidian4.setIcon)(openBtn, "external-link");
      openBtn.addEventListener("click", () => {
        if (this.file) {
          this.app.workspace.openLinkText(this.file.path, "", true);
          this.close();
        }
      });
    }
    const copyBtn = btnGroup.createEl("button", { text: "Copy Link" });
    (0, import_obsidian4.setIcon)(copyBtn, "copy");
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(this.rawRef);
      copyBtn.setText("Copied!");
      setTimeout(() => copyBtn.setText("Copy Link"), 2e3);
    });
    const closeBtn = btnGroup.createEl("button", { text: "Close" });
    closeBtn.addEventListener("click", () => this.close());
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");

// src/suggesters.ts
var import_obsidian5 = require("obsidian");
var FolderSuggest = class extends import_obsidian5.AbstractInputSuggest {
  constructor(app, textInputEl, multiSelect = false, onSelectCallback) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.multiSelect = multiSelect;
    this.onSelectCallback = onSelectCallback;
  }
  getAllFolders() {
    const folders = [];
    const files = this.app.vault.getAllLoadedFiles();
    for (const file of files) {
      if (file instanceof import_obsidian5.TFolder && file.path !== "/") {
        folders.push(file.path);
      }
    }
    return folders.sort((a, b) => a.localeCompare(b));
  }
  getSuggestions(query) {
    let activeQuery = query;
    if (this.multiSelect) {
      const parts = query.split(",");
      activeQuery = parts[parts.length - 1];
    }
    const cleanQuery = activeQuery.trim().toLowerCase();
    const allFolders = this.getAllFolders();
    if (!cleanQuery) {
      return allFolders.slice(0, 50);
    }
    return allFolders.filter((f) => f.toLowerCase().includes(cleanQuery)).slice(0, 50);
  }
  renderSuggestion(folderPath, el) {
    el.addClass("property-painter-suggest-item");
    const iconSpan = el.createSpan({ cls: "property-painter-suggest-icon" });
    (0, import_obsidian5.setIcon)(iconSpan, "folder");
    el.createSpan({ cls: "property-painter-suggest-text", text: folderPath });
  }
  selectSuggestion(folderPath) {
    if (this.multiSelect) {
      const parts = this.inputEl.value.split(",");
      parts[parts.length - 1] = parts.length > 1 ? ` ${folderPath}` : folderPath;
      const result = parts.join(",").trim();
      this.setValue(result);
    } else {
      this.setValue(folderPath);
    }
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(this.inputEl.value);
    }
    this.close();
  }
};
var TagSuggest = class extends import_obsidian5.AbstractInputSuggest {
  constructor(app, textInputEl, getPropertyKey, onSelectCallback) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.getPropertyKey = getPropertyKey;
    this.onSelectCallback = onSelectCallback;
  }
  getAllTags() {
    const tagsSet = /* @__PURE__ */ new Set();
    const cacheAny = this.app.metadataCache;
    if (typeof cacheAny?.getTags === "function") {
      const tagsObj = cacheAny.getTags();
      if (tagsObj && typeof tagsObj === "object") {
        Object.keys(tagsObj).forEach((t) => {
          const clean = t.replace(/^#/, "");
          if (clean) tagsSet.add(clean);
        });
      }
    }
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      if (cache.tags) {
        for (const t of cache.tags) {
          const clean = t.tag.replace(/^#/, "");
          if (clean) tagsSet.add(clean);
        }
      }
      const fmTags = cache.frontmatter?.tags ?? cache.frontmatter?.tag;
      if (fmTags) {
        if (Array.isArray(fmTags)) {
          for (const item of fmTags) {
            if (item) {
              const clean = String(item).trim().replace(/^#/, "");
              if (clean) tagsSet.add(clean);
            }
          }
        } else if (typeof fmTags === "string") {
          fmTags.split(",").forEach((item) => {
            const clean = item.trim().replace(/^#/, "");
            if (clean) tagsSet.add(clean);
          });
        }
      }
    }
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  }
  getSuggestions(query) {
    const propKey = (this.getPropertyKey ? this.getPropertyKey() : "").toLowerCase().trim();
    const isTagProperty = propKey.includes("tag");
    const parts = query.split(",");
    const activeToken = parts[parts.length - 1].trim();
    const cleanQuery = activeToken.replace(/^#/, "").toLowerCase();
    if (!isTagProperty && !activeToken.startsWith("#") && !cleanQuery) {
      return [];
    }
    const allTags = this.getAllTags();
    if (!cleanQuery) {
      return allTags.slice(0, 50);
    }
    return allTags.filter((t) => t.toLowerCase().includes(cleanQuery)).slice(0, 50);
  }
  renderSuggestion(tag, el) {
    el.addClass("property-painter-suggest-item");
    const iconSpan = el.createSpan({ cls: "property-painter-suggest-icon" });
    (0, import_obsidian5.setIcon)(iconSpan, "hash");
    el.createSpan({ cls: "property-painter-suggest-text", text: tag });
  }
  selectSuggestion(tag) {
    const parts = this.inputEl.value.split(",");
    const lastPart = parts[parts.length - 1].trim();
    const hadHash = lastPart.startsWith("#");
    const formatted = hadHash ? `#${tag}` : tag;
    if (parts.length > 1) {
      parts[parts.length - 1] = ` ${formatted}`;
      this.setValue(parts.join(",").trim());
    } else {
      this.setValue(formatted);
    }
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(this.inputEl.value);
    }
    this.close();
  }
};
var PropertyKeySuggest = class extends import_obsidian5.AbstractInputSuggest {
  constructor(app, textInputEl, onSelectCallback) {
    super(app, textInputEl);
    this.inputEl = textInputEl;
    this.onSelectCallback = onSelectCallback;
  }
  getAllPropertyKeys() {
    const keysSet = /* @__PURE__ */ new Set(["tags", "shelf", "status", "category", "priority", "rating", "type"]);
    const cacheAny = this.app.metadataCache;
    if (typeof cacheAny?.getAllPropertyInfos === "function") {
      const infos = cacheAny.getAllPropertyInfos();
      if (infos && typeof infos === "object") {
        Object.keys(infos).forEach((k) => keysSet.add(k));
      }
    }
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter) {
        Object.keys(cache.frontmatter).forEach((k) => {
          if (k !== "position") keysSet.add(k);
        });
      }
    }
    return Array.from(keysSet).sort((a, b) => a.localeCompare(b));
  }
  getSuggestions(query) {
    const cleanQuery = query.trim().toLowerCase();
    const allKeys = this.getAllPropertyKeys();
    if (!cleanQuery) {
      return allKeys.slice(0, 50);
    }
    return allKeys.filter((k) => k.toLowerCase().includes(cleanQuery)).slice(0, 50);
  }
  renderSuggestion(key, el) {
    el.addClass("property-painter-suggest-item");
    const iconSpan = el.createSpan({ cls: "property-painter-suggest-icon" });
    (0, import_obsidian5.setIcon)(iconSpan, "tag");
    el.createSpan({ cls: "property-painter-suggest-text", text: key });
  }
  selectSuggestion(key) {
    this.setValue(key);
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    if (this.onSelectCallback) {
      this.onSelectCallback(key);
    }
    this.close();
  }
};

// src/settings.ts
var PropertyPainterSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.activeTab = "rules";
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("property-painter-settings");
    containerEl.createEl("h2", { text: "Property Painter Settings" });
    const tabsContainer = containerEl.createDiv({ cls: "property-painter-tabs" });
    const tabs = [
      { id: "rules", label: "Color Rules", icon: "palette" },
      { id: "thumbnail", label: "Cover Thumbnail", icon: "image" },
      { id: "global", label: "Global Settings", icon: "globe" },
      { id: "general", label: "General Settings", icon: "sliders" }
    ];
    tabs.forEach((tab) => {
      const tabBtn = tabsContainer.createEl("button", {
        cls: `property-painter-tab-btn ${this.activeTab === tab.id ? "is-active" : ""}`,
        attr: { type: "button" }
      });
      const iconSpan = tabBtn.createSpan({ cls: "property-painter-tab-icon" });
      (0, import_obsidian6.setIcon)(iconSpan, tab.icon);
      tabBtn.createSpan({ text: tab.label });
      tabBtn.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.display();
      });
    });
    const contentContainer = containerEl.createDiv({ cls: "property-painter-tab-content" });
    switch (this.activeTab) {
      case "rules":
        this.renderRulesTab(contentContainer);
        break;
      case "thumbnail":
        this.renderThumbnailTab(contentContainer);
        break;
      case "global":
        this.renderGlobalTab(contentContainer);
        break;
      case "general":
        this.renderGeneralTab(contentContainer);
        break;
    }
  }
  renderThumbnailTab(containerEl) {
    containerEl.createEl("h3", { text: "Cover Thumbnail" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Renders an image thumbnail neatly beside the native note properties when an image link is present."
    });
    new import_obsidian6.Setting(containerEl).setName("Enable cover thumbnail").setDesc("Display image thumbnail side-by-side with note properties").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.thumbnailEnabled).onChange(async (val) => {
        this.plugin.settings.thumbnailEnabled = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Thumbnail position").setDesc("Place the thumbnail to the left or right of note properties").addDropdown((dd) => {
      dd.addOption("left", "Left of properties (Default)");
      dd.addOption("right", "Right of properties");
      dd.setValue(this.plugin.settings.thumbnailPosition);
      dd.onChange(async (val) => {
        this.plugin.settings.thumbnailPosition = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Maintain original image ratio (Link dimensions)").setDesc("When enabled, the thumbnail preserves the image\u2019s original aspect ratio smoothly as width/height increase").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.thumbnailMaintainAspectRatio).onChange(async (val) => {
        this.plugin.settings.thumbnailMaintainAspectRatio = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
        this.display();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Cover property keys").setDesc("Comma-separated list of frontmatter property names to check for images").addText((text) => {
      text.setPlaceholder("cover, image, thumbnail, poster, banner");
      text.setValue(this.plugin.settings.thumbnailPropertyKeys);
      text.onChange(async (val) => {
        this.plugin.settings.thumbnailPropertyKeys = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Auto-detect image links").setDesc("If enabled, automatically checks any frontmatter property for image URLs/attachments if target keys are not found").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.thumbnailAutoDetect).onChange(async (val) => {
        this.plugin.settings.thumbnailAutoDetect = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Thumbnail width").setDesc("Width of the thumbnail in pixels").addSlider((slider) => {
      slider.setLimits(60, 300, 5).setValue(this.plugin.settings.thumbnailWidth).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.thumbnailWidth = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Thumbnail max height").setDesc("Maximum height of the thumbnail in pixels").addSlider((slider) => {
      slider.setLimits(80, 450, 10).setValue(this.plugin.settings.thumbnailMaxHeight).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.thumbnailMaxHeight = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    if (!this.plugin.settings.thumbnailMaintainAspectRatio) {
      new import_obsidian6.Setting(containerEl).setName("Fixed aspect ratio preset").setDesc("Applied when dimensions are unlinked from the original ratio").addDropdown((dd) => {
        dd.addOption("cover", "Book Cover (2:3)");
        dd.addOption("square", "Square (1:1)");
        dd.addOption("wide", "Widescreen (16:9)");
        dd.addOption("auto", "Natural (Auto)");
        dd.setValue(this.plugin.settings.thumbnailAspectRatio);
        dd.onChange(async (val) => {
          this.plugin.settings.thumbnailAspectRatio = val;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
      });
    }
    new import_obsidian6.Setting(containerEl).setName("Object fit").setDesc("How the image fits within the thumbnail frame").addDropdown((dd) => {
      dd.addOption("cover", "Cover (Fill & Crop)");
      dd.addOption("contain", "Contain (Show Full Image)");
      dd.setValue(this.plugin.settings.thumbnailObjectFit);
      dd.onChange(async (val) => {
        this.plugin.settings.thumbnailObjectFit = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Corner roundness").setDesc("Border radius in pixels").addSlider((slider) => {
      slider.setLimits(0, 24, 1).setValue(this.plugin.settings.thumbnailBorderRadius).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.thumbnailBorderRadius = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Click action").setDesc("Action when clicking the cover thumbnail").addDropdown((dd) => {
      dd.addOption("modal", "Open Fullscreen Preview Modal");
      dd.addOption("open-file", "Open Local File (if in vault)");
      dd.addOption("none", "None");
      dd.setValue(this.plugin.settings.thumbnailClickAction);
      dd.onChange(async (val) => {
        this.plugin.settings.thumbnailClickAction = val;
        await this.plugin.saveSettings();
      });
    });
  }
  /**
   * Tab 1: Color Rules & Rule Overrides
   */
  renderRulesTab(containerEl) {
    containerEl.createEl("h3", { text: "Property Color Rules" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Define custom color rules for metadata property values (e.g., shelf: to-read, read, currently-reading). Rules can apply to properties and File Explorer items."
    });
    new import_obsidian6.Setting(containerEl).setName("Override global settings with rule preferences").setDesc("When ON: Rules customize their own badge vs text style and File Explorer formatting. When OFF: Global defaults apply across all matching properties and notes.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.overrideGlobalSettings ?? true).onChange(async (val) => {
        this.plugin.settings.overrideGlobalSettings = val;
        this.plugin.settings.overrideGlobalExplorerSettings = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Active Rules").setDesc(`Total rules configured: ${this.plugin.settings.rules.length}`).addButton((btn) => {
      btn.setButtonText("+ Add Rule");
      btn.setCta();
      btn.onClick(() => {
        const newRule = {
          id: "rule-" + Date.now(),
          name: "New Color Rule",
          enabled: true,
          property: "shelf",
          operator: "equals",
          value: "",
          folderScope: "global",
          folderPath: "",
          exceptFolderPath: "",
          textColor: "#FCE7B2",
          backgroundColor: "rgba(252, 231, 178, 0.15)",
          styleMode: "badge",
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
    }).addButton((btn) => {
      btn.setButtonText("Reset to Defaults");
      btn.onClick(async () => {
        this.plugin.settings.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
        this.display();
      });
    });
    const rulesListContainer = containerEl.createDiv({ cls: "property-painter-rules-list" });
    if (this.plugin.settings.rules.length === 0) {
      const emptyNotice = rulesListContainer.createDiv({ cls: "property-painter-empty-notice" });
      emptyNotice.setText('No rules configured. Click "+ Add Rule" or "Reset to Defaults".');
    } else {
      this.plugin.settings.rules.forEach((rule, index) => {
        const card = rulesListContainer.createDiv({ cls: "property-painter-rule-card" });
        const cardLeft = card.createDiv({ cls: "rule-card-left" });
        const toggleWrapper = cardLeft.createDiv({ cls: "rule-toggle-wrapper" });
        const toggle = toggleWrapper.createEl("input", { type: "checkbox" });
        toggle.checked = rule.enabled;
        toggle.addEventListener("change", async () => {
          rule.enabled = toggle.checked;
          await this.plugin.saveSettings();
          this.plugin.refreshAllViews();
        });
        const details = cardLeft.createDiv({ cls: "rule-card-details" });
        const titleRow = details.createDiv({ cls: "rule-title-row" });
        let defaultName = `${rule.property}: ${rule.value}`;
        if (rule.operator === "empty") {
          defaultName = `${rule.property} is empty`;
        } else if (rule.operator === "filled") {
          defaultName = `${rule.property} is filled`;
        }
        titleRow.createSpan({ cls: "rule-name", text: rule.name || defaultName });
        const effColor = getAdaptiveTextColor(rule.textColor, this.plugin.settings.autoThemeColors);
        const effBg = getAdaptiveBackgroundColor(rule.backgroundColor, rule.textColor, this.plugin.settings.autoThemeColors);
        const badge = titleRow.createSpan({ cls: "rule-preview-pill" });
        badge.empty();
        if (rule.prefixIcon && rule.prefixIcon.trim()) {
          const iconSpan = badge.createSpan({ cls: "property-painter-prefix-icon" });
          let iconName = rule.prefixIcon.trim();
          if (iconName.toLowerCase().startsWith("lucide-")) {
            iconName = iconName.slice(7);
          }
          (0, import_obsidian6.setIcon)(iconSpan, iconName.toLowerCase());
          if (!iconSpan.querySelector("svg")) {
            (0, import_obsidian6.setIcon)(iconSpan, iconName);
          }
          if (!iconSpan.querySelector("svg")) {
            iconSpan.textContent = rule.prefixIcon.trim();
          }
        }
        let pillText = rule.value;
        if (rule.operator === "empty") {
          pillText = pillText || "(empty)";
        } else if (rule.operator === "filled") {
          pillText = pillText || "(filled)";
        } else {
          pillText = pillText || rule.property || "Preview";
        }
        badge.createSpan({ text: pillText });
        badge.style.setProperty("--pp-pill-color", effColor, "important");
        badge.style.setProperty("--pp-rule-color", effColor, "important");
        badge.style.setProperty("color", effColor, "important");
        badge.style.setProperty("-webkit-text-fill-color", effColor, "important");
        badge.style.setProperty("font-weight", rule.propertyBold ? "bold" : "normal", "important");
        badge.style.setProperty("font-style", rule.propertyItalic ? "italic" : "normal", "important");
        badge.style.setProperty("text-decoration", rule.propertyStrike ? "line-through" : "none", "important");
        if (rule.styleMode === "text-only") {
          badge.classList.add("property-painter-text-only");
          badge.style.setProperty("--pp-pill-border", "transparent", "important");
          badge.style.setProperty("--pp-pill-bg", "transparent", "important");
          badge.style.setProperty("border", "1px solid transparent", "important");
          badge.style.setProperty("background-color", "transparent", "important");
        } else {
          badge.classList.remove("property-painter-text-only");
          badge.style.setProperty("--pp-pill-border", effColor, "important");
          badge.style.setProperty("--pp-pill-bg", effBg, "important");
          badge.style.setProperty("border", `1px solid ${effColor}`, "important");
          badge.style.setProperty("background-color", effBg, "important");
        }
        const conditionRow = details.createDiv({ cls: "rule-condition-row" });
        conditionRow.createSpan({ text: `When ` });
        conditionRow.createEl("code", { text: rule.property });
        if (rule.operator === "empty") {
          conditionRow.createSpan({ text: " is empty" });
        } else if (rule.operator === "filled") {
          conditionRow.createSpan({ text: " is filled" });
        } else {
          conditionRow.createSpan({ text: ` ${rule.operator} ` });
          conditionRow.createEl("code", { text: `"${rule.value}"` });
        }
        const targetsRow = details.createDiv({ cls: "rule-targets-row" });
        const modeBadge = targetsRow.createSpan({
          cls: "target-badge",
          text: rule.styleMode === "text-only" ? "Text Only" : "Badge"
        });
        (0, import_obsidian6.setIcon)(modeBadge, rule.styleMode === "text-only" ? "type" : "tag");
        if (rule.prefixIcon && rule.prefixIcon.trim()) {
          const prefixBadge = targetsRow.createSpan({
            cls: "target-badge",
            text: `Prefix: ${rule.prefixIcon.trim()}`
          });
          (0, import_obsidian6.setIcon)(prefixBadge, "sparkles");
        }
        if (rule.folderScope === "folder" && rule.folderPath && rule.folderPath.trim()) {
          const fBadge = targetsRow.createSpan({ cls: "target-badge", text: `Folder: ${rule.folderPath.trim()}` });
          (0, import_obsidian6.setIcon)(fBadge, "folder");
        } else {
          const gBadge = targetsRow.createSpan({ cls: "target-badge", text: "Global" });
          (0, import_obsidian6.setIcon)(gBadge, "globe");
        }
        if (rule.exceptFolderPath && rule.exceptFolderPath.trim()) {
          const exBadge = targetsRow.createSpan({ cls: "target-badge", text: `Except: ${rule.exceptFolderPath.trim()}` });
          (0, import_obsidian6.setIcon)(exBadge, "folder-x");
        }
        if (rule.applyToProperties) {
          const pStyles = [];
          if (rule.propertyBold) pStyles.push("Bold");
          if (rule.propertyItalic) pStyles.push("Italic");
          if (rule.propertyStrike) pStyles.push("Strike");
          const pDesc = pStyles.length > 0 ? `Properties (${pStyles.join(", ")})` : "Properties";
          const tProp = targetsRow.createSpan({ cls: "target-badge", text: pDesc });
          (0, import_obsidian6.setIcon)(tProp, "file-text");
        }
        if (rule.applyToFileExplorer) {
          const styles = [];
          if (rule.explorerBold) styles.push("Bold");
          if (rule.explorerItalic) styles.push("Italic");
          if (rule.explorerStrike) styles.push("Strike");
          if (rule.showExplorerDot) styles.push("Dot" + (rule.explorerDotGlow ? " Glow" : ""));
          const desc = styles.length > 0 ? `Explorer (${styles.join(", ")})` : "Explorer";
          const tExp = targetsRow.createSpan({ cls: "target-badge", text: desc });
          (0, import_obsidian6.setIcon)(tExp, "folder-tree");
        }
        const cardRight = card.createDiv({ cls: "rule-card-actions" });
        const editBtn = cardRight.createEl("button", {
          cls: "rule-action-btn rule-edit-btn",
          attr: { type: "button", "aria-label": "Edit rule" }
        });
        (0, import_obsidian6.setIcon)(editBtn, "pencil");
        editBtn.addEventListener("click", () => {
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
        const deleteBtn = cardRight.createEl("button", {
          cls: "rule-action-btn rule-delete-btn",
          attr: { type: "button", "aria-label": "Delete rule" }
        });
        (0, import_obsidian6.setIcon)(deleteBtn, "trash-2");
        deleteBtn.addEventListener("click", async () => {
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
  renderGlobalTab(containerEl) {
    containerEl.createEl("h3", { text: "Global Settings" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Default styling and formatting applied to matching properties and note titles when rule-specific override is turned OFF."
    });
    containerEl.createEl("h4", { text: "Property Global Defaults" });
    new import_obsidian6.Setting(containerEl).setName("Default property style mode").setDesc("Style mode for property values (Badge pill container vs clean Text Only). Applied when rule override is OFF.").addDropdown((dd) => {
      dd.addOption("badge", "Badge (Rounded pill container)");
      dd.addOption("text-only", "Text Only (No background pill)");
      dd.setValue(this.plugin.settings.globalStyleMode || "badge");
      dd.onChange(async (val) => {
        this.plugin.settings.globalStyleMode = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    const propFormatSetting = new import_obsidian6.Setting(containerEl).setName("Global property text formatting").setDesc("Default bold, italic, or strikethrough applied to note property values when rule override is OFF");
    const propFormatGroup = propFormatSetting.controlEl.createDiv({ cls: "rule-editor-format-group" });
    const gpBoldBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyBold ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Bold" }
    });
    (0, import_obsidian6.setIcon)(gpBoldBtn, "bold");
    gpBoldBtn.addEventListener("click", async () => {
      this.plugin.settings.globalPropertyBold = !this.plugin.settings.globalPropertyBold;
      gpBoldBtn.toggleClass("is-active", this.plugin.settings.globalPropertyBold);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    const gpItalicBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyItalic ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Italic" }
    });
    (0, import_obsidian6.setIcon)(gpItalicBtn, "italic");
    gpItalicBtn.addEventListener("click", async () => {
      this.plugin.settings.globalPropertyItalic = !this.plugin.settings.globalPropertyItalic;
      gpItalicBtn.toggleClass("is-active", this.plugin.settings.globalPropertyItalic);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    const gpStrikeBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalPropertyStrike ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Strikethrough" }
    });
    (0, import_obsidian6.setIcon)(gpStrikeBtn, "strikethrough");
    gpStrikeBtn.addEventListener("click", async () => {
      this.plugin.settings.globalPropertyStrike = !this.plugin.settings.globalPropertyStrike;
      gpStrikeBtn.toggleClass("is-active", this.plugin.settings.globalPropertyStrike);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    containerEl.createEl("h4", { text: "File Explorer Global Defaults" });
    const expFormatSetting = new import_obsidian6.Setting(containerEl).setName("Global File Explorer formatting").setDesc("Default bold, italic, or strikethrough applied to filenames in File Explorer when rule override is OFF");
    const expFormatGroup = expFormatSetting.controlEl.createDiv({ cls: "rule-editor-format-group" });
    const gBoldBtn = expFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerBold ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Bold" }
    });
    (0, import_obsidian6.setIcon)(gBoldBtn, "bold");
    gBoldBtn.addEventListener("click", async () => {
      this.plugin.settings.globalExplorerBold = !this.plugin.settings.globalExplorerBold;
      gBoldBtn.toggleClass("is-active", this.plugin.settings.globalExplorerBold);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    const gItalicBtn = expFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerItalic ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Italic" }
    });
    (0, import_obsidian6.setIcon)(gItalicBtn, "italic");
    gItalicBtn.addEventListener("click", async () => {
      this.plugin.settings.globalExplorerItalic = !this.plugin.settings.globalExplorerItalic;
      gItalicBtn.toggleClass("is-active", this.plugin.settings.globalExplorerItalic);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    const gStrikeBtn = expFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.plugin.settings.globalExplorerStrike ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Strikethrough" }
    });
    (0, import_obsidian6.setIcon)(gStrikeBtn, "strikethrough");
    gStrikeBtn.addEventListener("click", async () => {
      this.plugin.settings.globalExplorerStrike = !this.plugin.settings.globalExplorerStrike;
      gStrikeBtn.toggleClass("is-active", this.plugin.settings.globalExplorerStrike);
      await this.plugin.saveSettings();
      this.plugin.refreshAllViews();
    });
    new import_obsidian6.Setting(containerEl).setName("Show indicator dot").setDesc("Display colored dot next to note titles when rule override is OFF").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.globalShowExplorerDot).onChange(async (val) => {
        this.plugin.settings.globalShowExplorerDot = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Indicator dot glow effect").setDesc("Add luminous glow effect to indicator dots when rule override is OFF").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.globalExplorerDotGlow).onChange(async (val) => {
        this.plugin.settings.globalExplorerDotGlow = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Indicator dot size").setDesc("Size in pixels of the File Explorer indicator dot").addSlider((slider) => {
      slider.setLimits(4, 16, 1).setValue(this.plugin.settings.explorerDotSize).setDynamicTooltip().onChange(async (val) => {
        this.plugin.settings.explorerDotSize = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
  }
  /**
   * Tab 4: General Settings & Tools
   */
  renderGeneralTab(containerEl) {
    containerEl.createEl("h3", { text: "General Settings" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Master switches, automatic theme adaptations, and maintenance tools."
    });
    new import_obsidian6.Setting(containerEl).setName("Enable File Explorer styling").setDesc("Master switch to color and style matching note titles in File Explorer").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.explorerEnabled).onChange(async (val) => {
        this.plugin.settings.explorerEnabled = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Auto theme contrast").setDesc("Automatically optimize colors and contrast between Obsidian Light and Dark themes").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.autoThemeColors).onChange(async (val) => {
        this.plugin.settings.autoThemeColors = val;
        await this.plugin.saveSettings();
        this.plugin.refreshAllViews();
        this.display();
      });
    });
    containerEl.createEl("h3", { text: "Maintenance & Tools" });
    new import_obsidian6.Setting(containerEl).setName("Repaint all").setDesc("Forces a full refresh of all open note properties and File Explorer items").addButton((btn) => {
      btn.setButtonText("Repaint Now");
      btn.setCta();
      btn.onClick(() => {
        this.plugin.refreshAllViews();
      });
    });
  }
};
var RuleEditorModal = class extends import_obsidian6.Modal {
  constructor(app, plugin, rule, isNew, onSaveCallback, ruleIndex = -1) {
    super(app);
    this.plugin = plugin;
    this.isNew = isNew;
    this.onSaveCallback = onSaveCallback;
    this.rule = {
      ...rule,
      folderScope: rule.folderScope || "global",
      folderPath: rule.folderPath ?? "",
      exceptFolderPath: rule.exceptFolderPath ?? "",
      prefixIcon: rule.prefixIcon ?? "",
      styleMode: rule.styleMode || "badge",
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
      this.rule.id = "rule-" + Date.now();
      this.plugin.settings.rules.push(this.rule);
      this.ruleIndex = this.plugin.settings.rules.length - 1;
    } else {
      this.ruleIndex = ruleIndex;
    }
  }
  /**
   * Applies changes immediately to settings and refreshes all active views in real-time
   */
  async applyDirectChange() {
    if (this.ruleIndex >= 0 && this.ruleIndex < this.plugin.settings.rules.length) {
      this.plugin.settings.rules[this.ruleIndex] = { ...this.rule };
    }
    await this.plugin.saveSettings();
    this.plugin.refreshAllViews();
    if (this.updatePreview) {
      this.updatePreview();
    }
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("property-painter-rule-editor");
    contentEl.createEl("h2", { text: this.isNew ? "Create Color Rule" : "Edit Color Rule" });
    const previewWrapper = contentEl.createDiv({ cls: "rule-editor-preview-wrapper" });
    const propPreviewBox = previewWrapper.createDiv({ cls: "rule-preview-box" });
    propPreviewBox.createSpan({ cls: "rule-preview-label", text: "Note Property: " });
    const previewPill = propPreviewBox.createSpan({ cls: "rule-preview-pill" });
    const expPreviewBox = previewWrapper.createDiv({ cls: "rule-preview-box" });
    expPreviewBox.createSpan({ cls: "rule-preview-label", text: "File Explorer: " });
    const expPreviewDot = expPreviewBox.createSpan({ cls: "property-painter-dot" });
    const expPreviewTitle = expPreviewBox.createSpan({ cls: "rule-preview-title" });
    this.updatePreview = () => {
      const isBadge = (this.rule.styleMode || "badge") === "badge";
      const effTextColor = getAdaptiveTextColor(this.rule.textColor, this.plugin.settings.autoThemeColors);
      const effBgColor = getAdaptiveBackgroundColor(this.rule.backgroundColor, this.rule.textColor, this.plugin.settings.autoThemeColors);
      previewPill.empty();
      if (this.rule.prefixIcon && this.rule.prefixIcon.trim()) {
        const iconSpan = previewPill.createSpan({ cls: "property-painter-prefix-icon" });
        let iconName = this.rule.prefixIcon.trim();
        if (iconName.toLowerCase().startsWith("lucide-")) {
          iconName = iconName.slice(7);
        }
        (0, import_obsidian6.setIcon)(iconSpan, iconName.toLowerCase());
        if (!iconSpan.querySelector("svg")) {
          (0, import_obsidian6.setIcon)(iconSpan, iconName);
        }
        if (!iconSpan.querySelector("svg")) {
          iconSpan.textContent = this.rule.prefixIcon.trim();
        }
      }
      let pillDisplayText = this.rule.value;
      if (this.rule.operator === "empty") {
        pillDisplayText = pillDisplayText || "(empty)";
      } else if (this.rule.operator === "filled") {
        pillDisplayText = pillDisplayText || "(filled)";
      } else {
        pillDisplayText = pillDisplayText || this.rule.property || "Preview";
      }
      previewPill.createSpan({ text: pillDisplayText });
      previewPill.style.setProperty("--pp-pill-color", effTextColor, "important");
      previewPill.style.setProperty("--pp-rule-color", effTextColor, "important");
      previewPill.style.setProperty("color", effTextColor, "important");
      previewPill.style.setProperty("-webkit-text-fill-color", effTextColor, "important");
      previewPill.style.fontWeight = this.rule.propertyBold ? "bold" : "normal";
      previewPill.style.fontStyle = this.rule.propertyItalic ? "italic" : "normal";
      previewPill.style.textDecoration = this.rule.propertyStrike ? "line-through" : "none";
      if (isBadge) {
        previewPill.classList.remove("property-painter-text-only");
        previewPill.style.setProperty("--pp-pill-border", effTextColor, "important");
        previewPill.style.setProperty("--pp-pill-bg", effBgColor, "important");
        previewPill.style.setProperty("border", `1px solid ${effTextColor}`, "important");
        previewPill.style.setProperty("background-color", effBgColor, "important");
      } else {
        previewPill.classList.add("property-painter-text-only");
        previewPill.style.setProperty("--pp-pill-border", "transparent", "important");
        previewPill.style.setProperty("--pp-pill-bg", "transparent", "important");
        previewPill.style.setProperty("border", "1px solid transparent", "important");
        previewPill.style.setProperty("background-color", "transparent", "important");
      }
      let sampleTitle = "example-note.md";
      if (this.rule.operator === "empty") {
        sampleTitle = `${this.rule.property || "property"}-empty.md`;
      } else if (this.rule.operator === "filled") {
        sampleTitle = `${this.rule.property || "property"}-filled.md`;
      } else if (this.rule.value) {
        sampleTitle = `${this.rule.value}-note.md`;
      }
      expPreviewTitle.setText(sampleTitle);
      if (this.rule.applyToFileExplorer) {
        expPreviewTitle.style.color = effTextColor;
      } else {
        expPreviewTitle.style.color = "var(--text-normal)";
      }
      expPreviewTitle.style.fontWeight = this.rule.explorerBold ? "bold" : "normal";
      expPreviewTitle.style.fontStyle = this.rule.explorerItalic ? "italic" : "normal";
      expPreviewTitle.style.textDecoration = this.rule.explorerStrike ? "line-through" : "none";
      if (this.rule.showExplorerDot) {
        expPreviewDot.style.display = "inline-block";
        expPreviewDot.style.backgroundColor = effTextColor;
        expPreviewDot.style.width = `${this.plugin.settings.explorerDotSize}px`;
        expPreviewDot.style.height = `${this.plugin.settings.explorerDotSize}px`;
        if (this.rule.explorerDotGlow) {
          expPreviewDot.classList.add("has-glow");
          const isDark = isDarkTheme();
          if (isDark) {
            expPreviewDot.style.boxShadow = `0 0 5px ${effTextColor}, 0 0 10px ${effTextColor}`;
          } else {
            expPreviewDot.style.boxShadow = `0 0 0 1.5px var(--background-primary), 0 0 5px ${effTextColor}, 0 0 11px ${effTextColor}`;
          }
        } else {
          expPreviewDot.classList.remove("has-glow");
          expPreviewDot.style.boxShadow = "none";
        }
      } else {
        expPreviewDot.style.display = "none";
      }
    };
    this.updatePreview();
    contentEl.createEl("h4", { text: "Matching Rule" });
    new import_obsidian6.Setting(contentEl).setName("Rule Name").setDesc("Descriptive label for this rule").addText((text) => {
      text.setValue(this.rule.name || "");
      text.onChange(async (val) => {
        this.rule.name = val;
        await this.applyDirectChange();
      });
    });
    new import_obsidian6.Setting(contentEl).setName("Property Key").setDesc("Frontmatter key to match (e.g., shelf, status, priority, tags)").addText((text) => {
      text.setPlaceholder("shelf");
      text.setValue(this.rule.property || "");
      new PropertyKeySuggest(this.app, text.inputEl, async (val) => {
        this.rule.property = val;
        await this.applyDirectChange();
      });
      text.onChange(async (val) => {
        this.rule.property = val;
        await this.applyDirectChange();
      });
    });
    let targetValueSetting;
    let caseSensitiveSetting;
    const updateOperatorVisibility = () => {
      const isValueless = this.rule.operator === "empty" || this.rule.operator === "filled";
      if (targetValueSetting) {
        targetValueSetting.settingEl.style.display = isValueless ? "none" : "";
      }
      if (caseSensitiveSetting) {
        caseSensitiveSetting.settingEl.style.display = isValueless ? "none" : "";
      }
    };
    new import_obsidian6.Setting(contentEl).setName("Operator").setDesc("How the property value should be compared").addDropdown((dd) => {
      dd.addOption("equals", "Equals");
      dd.addOption("contains", "Contains");
      dd.addOption("starts-with", "Starts With");
      dd.addOption("ends-with", "Ends With");
      dd.addOption("regex", "Regular Expression");
      dd.addOption("empty", "Empty (Property is empty)");
      dd.addOption("filled", "Filled (Property has value)");
      dd.setValue(this.rule.operator || "equals");
      dd.onChange(async (val) => {
        this.rule.operator = val;
        updateOperatorVisibility();
        await this.applyDirectChange();
      });
    });
    targetValueSetting = new import_obsidian6.Setting(contentEl).setName("Target Value").setDesc("Value to match against (e.g., to-read, read, or tags from your vault)").addText((text) => {
      text.setPlaceholder("to-read");
      text.setValue(this.rule.value || "");
      new TagSuggest(
        this.app,
        text.inputEl,
        () => this.rule.property || "",
        async (val) => {
          this.rule.value = val;
          await this.applyDirectChange();
        }
      );
      text.onChange(async (val) => {
        this.rule.value = val;
        await this.applyDirectChange();
      });
    });
    caseSensitiveSetting = new import_obsidian6.Setting(contentEl).setName("Case Sensitive").setDesc("Match value with exact case sensitivity").addToggle((toggle) => {
      toggle.setValue(this.rule.caseSensitive).onChange(async (val) => {
        this.rule.caseSensitive = val;
        await this.applyDirectChange();
      });
    });
    updateOperatorVisibility();
    contentEl.createEl("h4", { text: "Folder Scope & Filter" });
    let targetFolderSetting;
    const updateFolderScopeVisibility = () => {
      const isFolderSpecific = (this.rule.folderScope || "global") === "folder";
      if (targetFolderSetting) {
        targetFolderSetting.settingEl.style.display = isFolderSpecific ? "" : "none";
      }
    };
    new import_obsidian6.Setting(contentEl).setName("Apply to").setDesc("Choose whether this rule applies across all vault notes or only within a specific folder").addDropdown((dd) => {
      dd.addOption("global", "Global (All folders)");
      dd.addOption("folder", "This folder (Specific folder)");
      dd.setValue(this.rule.folderScope || "global");
      dd.onChange(async (val) => {
        this.rule.folderScope = val;
        updateFolderScopeVisibility();
        await this.applyDirectChange();
      });
    });
    targetFolderSetting = new import_obsidian6.Setting(contentEl).setName("Target folder").setDesc("Only notes located inside this folder or its subfolders will be matched (e.g. Books or Work/Projects)").addText((text) => {
      text.setPlaceholder("e.g. Books or Work/Projects");
      text.setValue(this.rule.folderPath || "");
      new FolderSuggest(this.app, text.inputEl, false, async (val) => {
        this.rule.folderPath = val;
        await this.applyDirectChange();
      });
      text.onChange(async (val) => {
        this.rule.folderPath = val;
        await this.applyDirectChange();
      });
    });
    new import_obsidian6.Setting(contentEl).setName("Except folder").setDesc("Exclude notes located inside this folder or its subfolders (supports comma-separated list, e.g. Archive, Templates)").addText((text) => {
      text.setPlaceholder("e.g. Archive, Templates");
      text.setValue(this.rule.exceptFolderPath || "");
      new FolderSuggest(this.app, text.inputEl, true, async (val) => {
        this.rule.exceptFolderPath = val;
        await this.applyDirectChange();
      });
      text.onChange(async (val) => {
        this.rule.exceptFolderPath = val;
        await this.applyDirectChange();
      });
    });
    updateFolderScopeVisibility();
    contentEl.createEl("h4", { text: "Color & Appearance" });
    new import_obsidian6.Setting(contentEl).setName("Style Mode").setDesc("Choose between a rounded pill badge (border + background tint) or text color only").addDropdown((dd) => {
      dd.addOption("badge", "Badge Style (Pill with border & tint)");
      dd.addOption("text-only", "Text Color Only (No badge or border)");
      dd.setValue(this.rule.styleMode || "badge");
      dd.onChange(async (val) => {
        this.rule.styleMode = val;
        await this.applyDirectChange();
      });
    });
    const prefixDesc = document.createDocumentFragment();
    prefixDesc.appendChild(document.createTextNode("Optional icon or text prefix for this property (e.g., bookmark, check, star, book-open, or emojis like \u{1F4D6}, \u2B50). Browse all available icons at "));
    const lucideLink = document.createElement("a");
    lucideLink.textContent = "lucide.dev/icons";
    lucideLink.href = "https://lucide.dev/icons";
    lucideLink.target = "_blank";
    lucideLink.rel = "noopener noreferrer";
    lucideLink.className = "property-painter-external-link";
    prefixDesc.appendChild(lucideLink);
    prefixDesc.appendChild(document.createTextNode("."));
    new import_obsidian6.Setting(contentEl).setName("Prefix Icon or Symbol").setDesc(prefixDesc).addText((text) => {
      text.setPlaceholder("e.g. bookmark, check, star, \u{1F4D6}");
      text.setValue(this.rule.prefixIcon || "");
      text.onChange(async (val) => {
        this.rule.prefixIcon = val;
        await this.applyDirectChange();
      });
    });
    let colorTextComp = null;
    let colorPickerComp = null;
    let bgComp = null;
    new import_obsidian6.Setting(contentEl).setName("Text Color").setDesc("Hex or CSS color for text and indicator dot (e.g., #FCE7B2, #CFF3D8, #D9E8FF)").addColorPicker((cp) => {
      colorPickerComp = cp;
      const validHex = this.rule.textColor.startsWith("#") && this.rule.textColor.length === 7 ? this.rule.textColor : "#FCE7B2";
      cp.setValue(validHex);
      cp.onChange(async (val) => {
        this.rule.textColor = val;
        if (colorTextComp) colorTextComp.setValue(val);
        await this.applyDirectChange();
      });
    }).addText((text) => {
      colorTextComp = text;
      text.setValue(this.rule.textColor || "#FCE7B2");
      text.onChange(async (val) => {
        this.rule.textColor = val;
        if (colorPickerComp && val.startsWith("#") && val.length === 7) {
          colorPickerComp.setValue(val);
        }
        await this.applyDirectChange();
      });
    });
    new import_obsidian6.Setting(contentEl).setName("Background Color").setDesc("Background tint when Badge style is enabled (e.g. rgba(252, 231, 178, 0.15))").addText((text) => {
      bgComp = text;
      text.setPlaceholder("rgba(252, 231, 178, 0.15)");
      text.setValue(this.rule.backgroundColor || "");
      text.onChange(async (val) => {
        this.rule.backgroundColor = val;
        await this.applyDirectChange();
      });
    });
    contentEl.createEl("h4", { text: "Note Properties Scope" });
    new import_obsidian6.Setting(contentEl).setName("Apply to Note Properties").setDesc("Apply color inside note property views in both Live Preview and Reading View").addToggle((toggle) => {
      toggle.setValue(this.rule.applyToProperties).onChange(async (val) => {
        this.rule.applyToProperties = val;
        await this.applyDirectChange();
      });
    });
    const propFormatSetting = new import_obsidian6.Setting(contentEl).setName("Property text formatting").setDesc("Format property value with bold, italic, or strikethrough in note properties");
    const propFormatGroup = propFormatSetting.controlEl.createDiv({ cls: "rule-editor-format-group" });
    const pBoldBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.propertyBold ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Bold" }
    });
    (0, import_obsidian6.setIcon)(pBoldBtn, "bold");
    pBoldBtn.addEventListener("click", async () => {
      this.rule.propertyBold = !this.rule.propertyBold;
      pBoldBtn.toggleClass("is-active", this.rule.propertyBold);
      await this.applyDirectChange();
    });
    const pItalicBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.propertyItalic ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Italic" }
    });
    (0, import_obsidian6.setIcon)(pItalicBtn, "italic");
    pItalicBtn.addEventListener("click", async () => {
      this.rule.propertyItalic = !this.rule.propertyItalic;
      pItalicBtn.toggleClass("is-active", this.rule.propertyItalic);
      await this.applyDirectChange();
    });
    const pStrikeBtn = propFormatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.propertyStrike ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Strikethrough" }
    });
    (0, import_obsidian6.setIcon)(pStrikeBtn, "strikethrough");
    pStrikeBtn.addEventListener("click", async () => {
      this.rule.propertyStrike = !this.rule.propertyStrike;
      pStrikeBtn.toggleClass("is-active", this.rule.propertyStrike);
      await this.applyDirectChange();
    });
    contentEl.createEl("h4", { text: "File Explorer Styling" });
    new import_obsidian6.Setting(contentEl).setName("Apply Color to File Explorer").setDesc("Color note filenames in the File Explorer tree").addToggle((toggle) => {
      toggle.setValue(this.rule.applyToFileExplorer).onChange(async (val) => {
        this.rule.applyToFileExplorer = val;
        await this.applyDirectChange();
      });
    });
    const formatSetting = new import_obsidian6.Setting(contentEl).setName("File Explorer text formatting").setDesc("Format filename with bold, italic, or strikethrough in File Explorer");
    const formatGroup = formatSetting.controlEl.createDiv({ cls: "rule-editor-format-group" });
    const boldBtn = formatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.explorerBold ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Bold" }
    });
    (0, import_obsidian6.setIcon)(boldBtn, "bold");
    boldBtn.addEventListener("click", async () => {
      this.rule.explorerBold = !this.rule.explorerBold;
      boldBtn.toggleClass("is-active", this.rule.explorerBold);
      await this.applyDirectChange();
    });
    const italicBtn = formatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.explorerItalic ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Italic" }
    });
    (0, import_obsidian6.setIcon)(italicBtn, "italic");
    italicBtn.addEventListener("click", async () => {
      this.rule.explorerItalic = !this.rule.explorerItalic;
      italicBtn.toggleClass("is-active", this.rule.explorerItalic);
      await this.applyDirectChange();
    });
    const strikeBtn = formatGroup.createEl("button", {
      cls: `rule-editor-format-btn ${this.rule.explorerStrike ? "is-active" : ""}`,
      attr: { type: "button", "aria-label": "Strikethrough" }
    });
    (0, import_obsidian6.setIcon)(strikeBtn, "strikethrough");
    strikeBtn.addEventListener("click", async () => {
      this.rule.explorerStrike = !this.rule.explorerStrike;
      strikeBtn.toggleClass("is-active", this.rule.explorerStrike);
      await this.applyDirectChange();
    });
    new import_obsidian6.Setting(contentEl).setName("Show Indicator Dot").setDesc("Display a colored dot next to the note title in File Explorer").addToggle((toggle) => {
      toggle.setValue(this.rule.showExplorerDot).onChange(async (val) => {
        this.rule.showExplorerDot = val;
        await this.applyDirectChange();
      });
    });
    new import_obsidian6.Setting(contentEl).setName("Glow effect on indicator dot").setDesc("Add a luminous glow effect to the indicator dot matching the rule color").addToggle((toggle) => {
      toggle.setValue(this.rule.explorerDotGlow).onChange(async (val) => {
        this.rule.explorerDotGlow = val;
        await this.applyDirectChange();
      });
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.onSaveCallback();
  }
};

// src/main.ts
var PropertyPainterPlugin = class extends import_obsidian7.Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = DEFAULT_SETTINGS;
    this.viewObserver = null;
    this.debouncedRefreshActive = (0, import_obsidian7.debounce)(() => {
      this.refreshActiveMarkdownView();
    }, 40, true);
  }
  async onload() {
    await this.loadSettings();
    this.thumbnailManager = new ThumbnailManager(this.app);
    this.ruleManager = new RuleManager(this.app);
    this.explorerStyler = new ExplorerStyler(this.app, this.ruleManager);
    this.addSettingTab(new PropertyPainterSettingTab(this.app, this));
    this.addCommand({
      id: "repaint-all",
      name: "Repaint properties and File Explorer",
      callback: () => {
        this.refreshAllViews();
      }
    });
    this.addCommand({
      id: "toggle-cover-thumbnail",
      name: "Toggle cover thumbnail beside properties",
      callback: async () => {
        this.settings.thumbnailEnabled = !this.settings.thumbnailEnabled;
        await this.saveSettings();
        this.refreshAllViews();
      }
    });
    const triggerRefreshWithRetries = () => {
      this.debouncedRefreshActive();
      setTimeout(() => this.refreshActiveMarkdownView(), 60);
      setTimeout(() => this.refreshActiveMarkdownView(), 250);
    };
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        triggerRefreshWithRetries();
        this.explorerStyler.debouncedUpdateAll();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        triggerRefreshWithRetries();
        this.attachLivePreviewListeners();
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        triggerRefreshWithRetries();
        this.attachLivePreviewListeners();
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.debouncedRefreshActive();
      })
    );
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.refreshAllViews();
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.debouncedRefreshActive();
        this.explorerStyler.updateFileItem(file, this.settings);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", () => {
        this.explorerStyler.debouncedUpdateAll();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", () => {
        this.explorerStyler.debouncedUpdateAll();
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.explorerStyler.initObserver();
      this.attachLivePreviewListeners();
      this.refreshAllViews();
      setTimeout(() => this.refreshAllViews(), 100);
      setTimeout(() => this.refreshAllViews(), 350);
    });
  }
  onunload() {
    if (this.viewObserver) {
      this.viewObserver.disconnect();
      this.viewObserver = null;
    }
    this.explorerStyler.clearAllExplorerStyles();
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    leaves.forEach((leaf) => {
      if (leaf.view instanceof import_obsidian7.MarkdownView) {
        const metaContainers = leaf.view.contentEl.querySelectorAll(".metadata-container");
        metaContainers.forEach((container) => {
          container.classList.remove(
            "property-painter-has-thumbnail",
            "property-painter-pos-left",
            "property-painter-pos-right"
          );
          const thumb = container.querySelector(".property-painter-thumbnail-container");
          if (thumb) thumb.remove();
        });
      }
    });
  }
  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
    if (!this.settings.rules || this.settings.rules.length === 0) {
      this.settings.rules = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.rules));
    } else {
      this.settings.rules.forEach((rule) => {
        if (rule.prefixIcon === void 0) rule.prefixIcon = "";
        if (rule.propertyBold === void 0) rule.propertyBold = false;
        if (rule.propertyItalic === void 0) rule.propertyItalic = false;
        if (rule.propertyStrike === void 0) rule.propertyStrike = false;
        if (rule.explorerBold === void 0) rule.explorerBold = false;
        if (rule.explorerItalic === void 0) rule.explorerItalic = false;
        if (rule.explorerStrike === void 0) rule.explorerStrike = false;
        if (rule.explorerDotGlow === void 0) rule.explorerDotGlow = true;
        if (rule.folderScope === void 0) rule.folderScope = "global";
        if (rule.folderPath === void 0) rule.folderPath = "";
        if (rule.exceptFolderPath === void 0) rule.exceptFolderPath = "";
        if (rule.showExplorerDot === void 0) rule.showExplorerDot = true;
        if (rule.applyToFileExplorer === void 0) rule.applyToFileExplorer = true;
      });
    }
    if (this.settings.overrideGlobalSettings === void 0) {
      this.settings.overrideGlobalSettings = this.settings.overrideGlobalExplorerSettings ?? true;
    }
    if (this.settings.globalStyleMode === void 0) this.settings.globalStyleMode = "badge";
    if (this.settings.globalPropertyBold === void 0) this.settings.globalPropertyBold = false;
    if (this.settings.globalPropertyItalic === void 0) this.settings.globalPropertyItalic = false;
    if (this.settings.globalPropertyStrike === void 0) this.settings.globalPropertyStrike = false;
    if (this.settings.globalExplorerBold === void 0) this.settings.globalExplorerBold = false;
    if (this.settings.globalExplorerItalic === void 0) this.settings.globalExplorerItalic = false;
    if (this.settings.globalExplorerStrike === void 0) this.settings.globalExplorerStrike = false;
    if (this.settings.globalShowExplorerDot === void 0) this.settings.globalShowExplorerDot = true;
    if (this.settings.globalExplorerDotGlow === void 0) this.settings.globalExplorerDotGlow = true;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Patches Obsidian's MetadataEditor to guarantee live preview and widget re-renders are captured
   */
  patchMetadataEditor(view) {
    const metaEditor = view.metadataEditor;
    if (!metaEditor || metaEditor._pp_patched) return;
    metaEditor._pp_patched = true;
    const origSync = metaEditor.synchronize;
    if (typeof origSync === "function") {
      const self = this;
      metaEditor.synchronize = function(...args) {
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
  attachLivePreviewListeners() {
    if (this.viewObserver) {
      this.viewObserver.disconnect();
      this.viewObserver = null;
    }
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    if (!activeView) return;
    this.patchMetadataEditor(activeView);
    this.viewObserver = new MutationObserver((mutations) => {
      const isOnlyThumbnailMutation = mutations.every((m) => {
        const target = m.target;
        return target && (target.classList?.contains("property-painter-thumbnail-container") || target.closest?.(".property-painter-thumbnail-container") !== null);
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
    const handleEvent = (e) => {
      const target = e.target;
      if (target && target.closest(".metadata-container")) {
        this.debouncedRefreshActive();
      }
    };
    activeView.contentEl.addEventListener("input", handleEvent);
    activeView.contentEl.addEventListener("keyup", handleEvent);
    activeView.contentEl.addEventListener("change", handleEvent);
    activeView.contentEl.addEventListener("focusout", handleEvent);
  }
  /**
   * Refreshes the currently active Markdown view
   */
  refreshActiveMarkdownView() {
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    if (activeView) {
      this.updateMarkdownView(activeView);
    }
  }
  /**
   * Refreshes all open markdown views and the file explorer
   */
  refreshAllViews() {
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    leaves.forEach((leaf) => {
      if (leaf.view instanceof import_obsidian7.MarkdownView) {
        this.updateMarkdownView(leaf.view);
      }
    });
    this.explorerStyler.updateAllExplorerItems(this.settings);
  }
  /**
   * Updates thumbnail and property colors for a specific Markdown view
   */
  updateMarkdownView(view) {
    if (!view || !view.file) return;
    this.patchMetadataEditor(view);
    this.thumbnailManager.updateViewThumbnail(
      view,
      this.settings,
      (url, rawRef, file) => {
        this.handleImageClick(url, rawRef, file);
      }
    );
    this.ruleManager.updateViewProperties(view, this.settings);
  }
  /**
   * Action triggered when clicking thumbnail
   */
  handleImageClick(url, rawRef, file) {
    if (this.settings.thumbnailClickAction === "open-file" && file) {
      this.app.workspace.openLinkText(file.path, "", true);
    } else if (this.settings.thumbnailClickAction === "modal") {
      new ImagePreviewModal(this.app, url, rawRef, file).open();
    }
  }
};
