# Property Painter (Obsidian Plugin)

<p align="center">
  <a href="https://buymeacoffee.com/sskhekhaliya">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee">
  </a>
</p>

**Property Painter** elevates your Obsidian workspace by displaying image thumbnails side-by-side with note properties and dynamically painting property values and File Explorer filenames with custom colors, badges, and typography styling.

Designed to be lightweight, reactive, theme-adaptive, and visually stunning in both **Live Preview** and **Reading View**.

---

## ✨ Key Features

### 1. 🖼️ Cover Thumbnail Beside Note Properties
* **Side-by-Side Layout**: Places a clean cover thumbnail beside your native `.metadata-container` (**Default: Left side**, or Right side).
* **Zero-Flicker Preloading**: Images are verified and preloaded off-DOM. If an image is missing, invalid, or fails to load, zero container is mounted so properties remain at full width with no layout shift or visual glitch.
* **Aspect Ratio Lock (Link/Unlink)**:
  * **Linked (Default)**: Automatically preserves the image's original aspect ratio smoothly up to your max-height setting without stretching or cropping.
  * **Unlinked**: Choose custom preset proportions (Book Cover `2:3`, Square `1:1`, Widescreen `16:9`, Natural `Auto`).
* **Universal Link Support**:
  * Web URLs (`https://...`, `http://...`)
  * Obsidian Wikilinks (`![[cover.jpg]]`, `[[cover.jpg]]`)
  * Markdown Image Links (`![Cover](attachments/cover.jpg)`)
  * Vault paths (`attachments/book-cover.png`)
  * Base64 data URLs (`data:image/png;base64,...`)
* **Lightbox Preview**: Click on the thumbnail to open a fullscreen lightbox modal with dimensions, link copy, and quick file navigation.

---

### 2. 🎨 Custom Property Value Styling Rules
* **Badge Style vs. Text Color Only**:
  * **Badge Style (Pill)**: Rounded pill container with crisp border outline, soft tinted background, and custom text color.
  * **Text Color Only**: Clean text coloring with transparent background and no pill border.
* **Prefix Icon or Symbol**: Prepend any native [Lucide icon](https://lucide.dev/icons) (e.g. `bookmark`, `check`, `star`, `book-open`) or custom emoji/symbol (e.g. `📖`, `⭐`) directly inside property pills and values.
* **Text Formatting**: Format property values directly with **Bold**, *Italic*, or ~~Strikethrough~~.
* **Theme Auto-Contrast**:
  * Intelligently detects whether Obsidian is in Light or Dark theme.
  * Automatically optimizes contrast so pastel shades (like `#FCE7B2`) remain bold and legible on white backgrounds while glowing softly in dark mode.

#### Default Built-In Rules:
| Property | Match Condition | Prefix Icon | Text Color | Style Mode | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `shelf` | Equals `to-read` | `bookmark` | `#FCE7B2` | Badge (Pill) | Warm pastel peach / amber |
| `shelf` | Equals `read` | `check` | `#CFF3D8` | Badge (Pill) | Soft mint green |
| `shelf` | Equals `currently-reading` | `book-open` | `#D9E8FF` | Badge (Pill) | Gentle sky blue |

---

### 3. 📂 File Explorer Styling & Neon Dot Glow
* **Dynamic File Coloring**: Automatically styles matching note filenames in the Obsidian File Explorer tree based on frontmatter properties.
* **Typography Formatting**: Apply **Bold**, *Italic*, or ~~Strikethrough~~ to File Explorer titles per rule or globally.
* **Indicator Dot & Glow**: Display a colored indicator dot next to file titles with an optional luminous neon glow halo.

---

### 4. ⚡ Real-Time Live Preview Reflection
* **Instant Feedback**: Changes made in the rule editor modal reflect instantly on open notes and File Explorer items as you type and toggle settings.
* **Sticky Dual Preview**: Rule editor features a sticky dual live preview showing both Note Property pill and File Explorer title in real time.

---

### 5. 🗂️ Systematic Tabbed Settings
Organized into 4 intuitive tabs with Goodreads Bookshelf-inspired navigation:
* 🎨 **Color Rules**: Master override toggle, rule cards, and instant rule editor.
* 🖼️ **Cover Thumbnail**: Dimensions, aspect ratio lock, object fit, corner radius, and click actions.
* 🌐 **Global Settings**: Default property style mode (Badge vs Text-Only), global property formatting, and global File Explorer defaults.
* ⚙️ **General Settings**: Master File Explorer styling toggle, theme auto-contrast, and "Repaint Now" maintenance button.

---

## ☕ Support & Feedback

If you find Property Painter useful in organizing and beautifying your vault, consider supporting its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/sskhekhaliya)

---

## 📄 License & Credits

- **Author**: [SSKhekhaliya](https://www.sskhekhaliya.in/)
- **Support**: [buymeacoffee.com/sskhekhaliya](https://buymeacoffee.com/sskhekhaliya)
- **License**: MIT License © [SSKhekhaliya](https://www.sskhekhaliya.in/)
- Built with ❤️ for the [Obsidian](https://obsidian.md) community.
