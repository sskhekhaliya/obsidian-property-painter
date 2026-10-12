/**
 * Color utility for theme adaptation (Light / Dark mode)
 */

export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return true;
  return document.body.classList.contains('theme-dark') || !document.body.classList.contains('theme-light');
}

/**
 * Parses hex (#rgb, #rrggbb, #rrggbbaa) or rgb/rgba string into RGBA components
 */
export function parseColor(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  if (!colorStr) return null;
  const str = colorStr.trim();

  // Hex
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  // rgba or rgb
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    };
  }

  return null;
}

/**
 * Converts RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

/**
 * Converts HSL to Hex string
 */
function hslToHex(h: number, s: number, l: number): string {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255).toString(16);
    return val.length === 1 ? '0' + val : val;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Adapts color for Light or Dark theme automatically to ensure great contrast and readability
 */
export function getAdaptiveTextColor(color: string, autoAdjust: boolean): string {
  if (!autoAdjust) return color;
  const parsed = parseColor(color);
  if (!parsed) return color;

  const isDark = isDarkTheme();
  const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);

  if (isDark) {
    // In dark mode, ensure text is bright enough to read
    if (hsl.l < 55) {
      return hslToHex(hsl.h, Math.min(hsl.s, 90), 75);
    }
    return color;
  } else {
    // In light mode, ensure text is dark enough to read on white/light backgrounds
    if (hsl.l > 45) {
      // Darken text to between 28% and 38% lightness with rich saturation
      const targetL = Math.max(26, Math.min(38, hsl.l - 45));
      const targetS = Math.min(100, Math.max(65, hsl.s));
      return hslToHex(hsl.h, targetS, targetL);
    }
    return color;
  }
}

/**
 * Adapts background tint for Light or Dark theme
 */
export function getAdaptiveBackgroundColor(
  bgColor: string,
  baseTextColor: string,
  autoAdjust: boolean
): string {
  if (!autoAdjust && bgColor) return bgColor;

  const isDark = isDarkTheme();
  const textParsed = parseColor(baseTextColor);

  if (bgColor) {
    const bgParsed = parseColor(bgColor);
    if (bgParsed) {
      if (!isDark && bgParsed.a < 0.25) {
        // Slightly strengthen background opacity in light mode for clear contrast
        return `rgba(${bgParsed.r}, ${bgParsed.g}, ${bgParsed.b}, 0.22)`;
      }
      return bgColor;
    }
  }

  // Fallback from text color if no background color provided
  if (textParsed) {
    const alpha = isDark ? 0.16 : 0.18;
    return `rgba(${textParsed.r}, ${textParsed.g}, ${textParsed.b}, ${alpha})`;
  }

  return bgColor || 'transparent';
}
