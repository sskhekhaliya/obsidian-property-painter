import { App, MarkdownView, TFile, setIcon } from 'obsidian';
import { PropertyPainterSettings } from './types';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.bmp'];

export class ThumbnailManager {
  private app: App;
  private failedUrls: Set<string> = new Set();

  constructor(app: App) {
    this.app = app;
  }

  public clearFailedCache(): void {
    this.failedUrls.clear();
  }

  /**
   * Extracts an image reference string from frontmatter value
   */
  public extractImageReference(value: any): string | null {
    if (value === null || value === undefined) return null;

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.extractImageReference(item);
        if (found) return found;
      }
      return null;
    }

    if (typeof value !== 'string') return null;
    const str = value.trim();
    if (!str) return null;

    // Direct web or data url
    if (/^https?:\/\//i.test(str) || /^data:image\//i.test(str)) {
      return str;
    }

    // Markdown image: ![alt](url) or [alt](url)
    const mdMatch = str.match(/^!?\[.*?\]\((https?:\/\/[^\s\)]+|[^\s\)]+)\)$/);
    if (mdMatch && mdMatch[1]) {
      const url = mdMatch[1].trim();
      if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url) || IMAGE_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))) {
        return url;
      }
    }

    // Wikilink: ![[image.ext]] (embed) or [[image.ext]] (explicit image file)
    const wikiMatch = str.match(/^!?\[\[(.*?)(?:\|.*)?\]\]$/);
    if (wikiMatch && wikiMatch[1]) {
      const target = wikiMatch[1].trim();
      const isEmbed = str.startsWith('!');
      const hasImgExt = IMAGE_EXTENSIONS.some(ext => target.toLowerCase().endsWith(ext));
      // In Obsidian, regular wikilinks like [[My Note]] are notes, NOT images
      if (isEmbed || hasImgExt) {
        return target;
      }
      return null;
    }

    // Check if filename has image extension
    const cleanLower = str.toLowerCase();
    if (IMAGE_EXTENSIONS.some(ext => cleanLower.endsWith(ext))) {
      return str;
    }

    return null;
  }

  /**
   * Finds the image reference in a note's frontmatter
   */
  public findImageInFrontmatter(frontmatter: Record<string, any> | undefined, settings: PropertyPainterSettings): string | null {
    if (!frontmatter) return null;

    // Check configured priority property keys first
    const keys = settings.thumbnailPropertyKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    for (const key of keys) {
      if (key in frontmatter) {
        const ref = this.extractImageReference(frontmatter[key]);
        if (ref) return ref;
      }
      const lowerKey = key.toLowerCase();
      const matchedEntry = Object.keys(frontmatter).find(k => k.toLowerCase() === lowerKey);
      if (matchedEntry) {
        const ref = this.extractImageReference(frontmatter[matchedEntry]);
        if (ref) return ref;
      }
    }

    // Fallback: auto-detect any property with an image
    if (settings.thumbnailAutoDetect) {
      for (const [k, val] of Object.entries(frontmatter)) {
        if (keys.some(ck => ck.toLowerCase() === k.toLowerCase())) continue;
        const ref = this.extractImageReference(val);
        if (ref) return ref;
      }
    }

    return null;
  }

  /**
   * Resolves vault file or external URL to a usable resource URL
   */
  public resolveImageUrl(reference: string, sourcePath: string): { url: string; file: TFile | null; isValid: boolean } {
    if (/^https?:\/\//i.test(reference) || /^data:image\//i.test(reference)) {
      return { url: reference, file: null, isValid: true };
    }

    // Clean wikilink or path
    let cleanPath = reference.replace(/^!?\[\[/, '').replace(/\]\]$/, '');
    const pipeIndex = cleanPath.indexOf('|');
    if (pipeIndex !== -1) {
      cleanPath = cleanPath.substring(0, pipeIndex);
    }
    cleanPath = cleanPath.trim();

    // Try finding via metadataCache
    let file = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);

    // Try direct vault path
    if (!file) {
      const abstractFile = this.app.vault.getAbstractFileByPath(cleanPath);
      if (abstractFile instanceof TFile) {
        file = abstractFile;
      }
    }

    // Try finding by name across vault if not found
    if (!file) {
      const allFiles = this.app.vault.getFiles();
      const filenameOnly = cleanPath.split('/').pop()?.toLowerCase();
      if (filenameOnly) {
        file = allFiles.find(f => f.name.toLowerCase() === filenameOnly) || null;
      }
    }

    if (file instanceof TFile) {
      const ext = '.' + file.extension.toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        return { url: '', file: null, isValid: false };
      }
      return {
        url: this.app.vault.getResourcePath(file),
        file,
        isValid: true
      };
    }

    // If it's not a valid vault file and not an http url, it's not available
    return { url: '', file: null, isValid: false };
  }

  /**
   * Updates or mounts the thumbnail in the active view
   */
  public updateViewThumbnail(
    view: MarkdownView,
    settings: PropertyPainterSettings,
    onImageClick: (url: string, rawRef: string, file: TFile | null) => void
  ): void {
    if (!view || !view.file) return;

    const containerEl = view.contentEl;
    const metadataContainers: HTMLElement[] = Array.from(
      containerEl.querySelectorAll<HTMLElement>('.metadata-container')
    );
    const editorContainer = (view as any).metadataEditor?.containerEl;
    if (editorContainer && !metadataContainers.includes(editorContainer)) {
      metadataContainers.push(editorContainer);
    }

    if (metadataContainers.length === 0) return;

    const activeFile = view.file;
    const cache = this.app.metadataCache.getFileCache(activeFile);
    const frontmatter = cache?.frontmatter;
    const imageRef = settings.thumbnailEnabled ? this.findImageInFrontmatter(frontmatter, settings) : null;

    metadataContainers.forEach(metaContainer => {
      let thumbWrapper = metaContainer.querySelector<HTMLElement>('.property-painter-thumbnail-container');

      const removeThumbnail = () => {
        metaContainer.classList.remove(
          'property-painter-has-thumbnail',
          'property-painter-pos-left',
          'property-painter-pos-right'
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

      // Check if current thumbnail already displays this URL
      const currentUrl = thumbWrapper?.getAttribute('data-image-url');
      if (thumbWrapper && currentUrl === resolvedUrl && thumbWrapper.querySelector('img.is-loaded')) {
        this.applyThumbnailStyles(thumbWrapper, settings);
        metaContainer.classList.add('property-painter-has-thumbnail');
        metaContainer.classList.remove('property-painter-pos-left', 'property-painter-pos-right');
        metaContainer.classList.add(`property-painter-pos-${settings.thumbnailPosition}`);
        return;
      }

      // Preload image; mount to DOM only when image is verified and ready
      const img = new Image();
      img.className = 'property-painter-thumb-img';
      img.alt = 'Property cover thumbnail';

      img.onload = () => {
        // Guard: check that active file has not changed while loading
        if (view.file?.path !== activeFile.path) return;

        if (!thumbWrapper) {
          thumbWrapper = document.createElement('div');
          thumbWrapper.className = 'property-painter-thumbnail-container';
        }

        thumbWrapper.setAttribute('data-image-url', resolvedUrl);
        thumbWrapper.empty();

        const thumbCard = thumbWrapper.createDiv({ cls: 'property-painter-thumb-card' });
        this.applyThumbnailStyles(thumbWrapper, settings);

        img.classList.add('is-loaded');
        thumbCard.appendChild(img);

        const zoomBtn = thumbCard.createDiv({ cls: 'property-painter-zoom-btn' });
        setIcon(zoomBtn, 'maximize-2');
        zoomBtn.setAttribute('aria-label', 'View full cover image');

        thumbCard.addEventListener('click', (evt) => {
          evt.stopPropagation();
          onImageClick(resolvedUrl, imageRef, localFile);
        });

        if (!metaContainer.contains(thumbWrapper)) {
          metaContainer.appendChild(thumbWrapper);
        }

        metaContainer.classList.add('property-painter-has-thumbnail');
        metaContainer.classList.remove('property-painter-pos-left', 'property-painter-pos-right');
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
  private applyThumbnailStyles(wrapper: HTMLElement, settings: PropertyPainterSettings): void {
    const card = wrapper.querySelector<HTMLElement>('.property-painter-thumb-card');
    if (!card) return;

    wrapper.style.setProperty('--pp-thumb-width', `${settings.thumbnailWidth}px`);
    wrapper.style.setProperty('--pp-thumb-max-height', `${settings.thumbnailMaxHeight}px`);
    wrapper.style.setProperty('--pp-thumb-radius', `${settings.thumbnailBorderRadius}px`);
    wrapper.style.setProperty('--pp-thumb-fit', settings.thumbnailObjectFit);

    card.classList.remove('aspect-cover', 'aspect-square', 'aspect-wide', 'aspect-auto', 'aspect-linked');

    if (settings.thumbnailMaintainAspectRatio) {
      card.classList.add('aspect-linked');
    } else {
      card.classList.add(`aspect-${settings.thumbnailAspectRatio}`);
    }
  }
}
