import { App, Modal, TFile, setIcon } from 'obsidian';

export class ImagePreviewModal extends Modal {
  private imageUrl: string;
  private rawRef: string;
  private file: TFile | null;

  constructor(app: App, imageUrl: string, rawRef: string, file: TFile | null) {
    super(app);
    this.imageUrl = imageUrl;
    this.rawRef = rawRef;
    this.file = file;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass('property-painter-modal');

    contentEl.empty();
    const container = contentEl.createDiv({ cls: 'property-painter-modal-container' });

    // Header bar
    const header = container.createDiv({ cls: 'property-painter-modal-header' });
    const title = header.createEl('h3', { text: this.file ? this.file.name : 'Cover Preview' });
    title.className = 'property-painter-modal-title';

    const info = header.createSpan({ text: this.rawRef });
    info.className = 'property-painter-modal-subtitle';

    // Image frame
    const imgWrapper = container.createDiv({ cls: 'property-painter-modal-img-wrapper' });
    const img = imgWrapper.createEl('img');
    img.className = 'property-painter-modal-img';
    img.src = this.imageUrl;
    img.alt = 'Full cover preview';

    // Metadata bar / action buttons
    const footer = container.createDiv({ cls: 'property-painter-modal-footer' });
    
    // Dimension display
    const dimSpan = footer.createSpan({ cls: 'property-painter-modal-dims', text: 'Loading image...' });
    img.onload = () => {
      dimSpan.setText(`${img.naturalWidth} × ${img.naturalHeight} px`);
    };

    const btnGroup = footer.createDiv({ cls: 'property-painter-modal-actions' });

    if (this.file) {
      const openBtn = btnGroup.createEl('button', { cls: 'mod-cta', text: 'Open in Obsidian' });
      setIcon(openBtn, 'external-link');
      openBtn.addEventListener('click', () => {
        if (this.file) {
          this.app.workspace.openLinkText(this.file.path, '', true);
          this.close();
        }
      });
    }

    const copyBtn = btnGroup.createEl('button', { text: 'Copy Link' });
    setIcon(copyBtn, 'copy');
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(this.rawRef);
      copyBtn.setText('Copied!');
      setTimeout(() => copyBtn.setText('Copy Link'), 2000);
    });

    const closeBtn = btnGroup.createEl('button', { text: 'Close' });
    closeBtn.addEventListener('click', () => this.close());
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
