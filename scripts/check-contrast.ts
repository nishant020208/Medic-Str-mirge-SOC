// scripts/check-contrast.ts
// Calculates WCAG 2.1 contrast ratios for theme token pairs and validates quality gates

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function parseColor(color: string): RGB {
  color = color.trim();
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  const rgbaMatch = color.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]),
      g: parseFloat(rgbaMatch[2]),
      b: parseFloat(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  throw new Error(`Unsupported color format: ${color}`);
}

function composite(fg: RGB, bg: RGB): RGB {
  const alpha = fg.a !== undefined ? fg.a : 1;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

function sRGBtoLin(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function getLuminance(rgb: RGB): number {
  return 0.2126 * sRGBtoLin(rgb.r) + 0.7152 * sRGBtoLin(rgb.g) + 0.0722 * sRGBtoLin(rgb.b);
}

function getContrastRatio(fg: RGB, bg: RGB): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ThemeTokens {
  name: string;
  bg: string;
  bgGradientStops: [string, string];
  surface: string;
  surface2: string;
  surfaceGlass: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  textOnPrimary: string;
  accentText: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
}

export const THEMES: Record<string, ThemeTokens> = {
  light: {
    name: 'LIGHT (Marble Day)',
    bg: '#F5F1E8',
    bgGradientStops: ['#F5F1E8', '#EDE6D6'],
    surface: '#FBF8F1',
    surface2: '#EDE6D6',
    surfaceGlass: 'rgba(251, 248, 241, 0.85)',
    border: '#948565',
    text: '#14110D',
    textMuted: '#5B5546',
    primary: '#0B1F4B',
    textOnPrimary: '#F5F1E8',
    accentText: '#7A5C00',
    danger: '#A3331A',
    success: '#3F5A1F',
    warning: '#7A5000',
    info: '#0B1F4B',
  },
  dark: {
    name: 'DARK (Night Temple)',
    bg: '#070E1F',
    bgGradientStops: ['#070E1F', '#0E1A33'],
    surface: '#0E1A33',
    surface2: '#162447',
    surfaceGlass: 'rgba(14, 26, 51, 0.85)',
    border: '#4E68AD',
    text: '#F2EDE0',
    textMuted: '#AEB6CC',
    primary: '#E0B84A',
    textOnPrimary: '#0B1F4B',
    accentText: '#E0B84A',
    danger: '#FF8A70',
    success: '#A7C46A',
    warning: '#F0A742',
    info: '#6CA0DC',
  },
  aesthetic: {
    name: 'AESTHETIC (Olympus Dusk)',
    bg: '#F6DFE7',
    bgGradientStops: ['#FDE9DC', '#E9D5F2'], // Peach to Lavender
    surface: '#FBF1F8',
    surface2: '#F2E0EF',
    surfaceGlass: 'rgba(255, 255, 255, 0.62)',
    border: '#936D88',
    text: '#2B1B2F',
    textMuted: '#644F6A',
    primary: '#7A2E4D',
    textOnPrimary: '#FFF7EE',
    accentText: '#7A2E4D',
    danger: '#9E2A2B',
    success: '#285C34',
    warning: '#7A4C00',
    info: '#3F51B5',
  },
};

interface TestResult {
  pair: string;
  ratio: number;
  minRatio: number;
  passed: boolean;
  type: 'normal-text' | 'ui/large-text';
}

export function runContrastAudit() {
  console.log('========================================================================');
  console.log('      MEDISTORE ASCLEPIUS: WCAG 2.1 AA TOKEN CONTRAST AUDIT             ');
  console.log('========================================================================\n');

  let allPassed = true;

  for (const [themeKey, tokens] of Object.entries(THEMES)) {
    console.log(`\n### THEME: ${tokens.name}`);
    console.log('------------------------------------------------------------------------');
    console.log('| Pair Tested                                | Ratio  | Min Req | Status |');
    console.log('|--------------------------------------------|--------|---------|--------|');

    const results: TestResult[] = [];

    // Background surfaces to test text against
    const bgRgb = parseColor(tokens.bg);
    const surfaceRgb = parseColor(tokens.surface);
    const surface2Rgb = parseColor(tokens.surface2);

    // Glass composited over gradient endpoints (worst-case checking)
    const glassRaw = parseColor(tokens.surfaceGlass);
    const grad1Rgb = parseColor(tokens.bgGradientStops[0]);
    const grad2Rgb = parseColor(tokens.bgGradientStops[1]);
    const glassComp1 = composite(glassRaw, grad1Rgb);
    const glassComp2 = composite(glassRaw, grad2Rgb);

    // Pick glass composite that has higher/lower luminance depending on contrast
    const surfaces = [
      { name: 'bg', color: bgRgb },
      { name: 'surface', color: surfaceRgb },
      { name: 'surface-2', color: surface2Rgb },
      { name: 'glass (grad1)', color: glassComp1 },
      { name: 'glass (grad2)', color: glassComp2 },
    ];

    const textColors = [
      { name: 'text', color: parseColor(tokens.text), min: 4.5, type: 'normal-text' as const },
      { name: 'text-muted', color: parseColor(tokens.textMuted), min: 4.5, type: 'normal-text' as const },
      { name: 'accent-text', color: parseColor(tokens.accentText), min: 4.5, type: 'normal-text' as const },
      { name: 'danger', color: parseColor(tokens.danger), min: 4.5, type: 'normal-text' as const },
      { name: 'success', color: parseColor(tokens.success), min: 4.5, type: 'normal-text' as const },
      { name: 'warning', color: parseColor(tokens.warning), min: 4.5, type: 'normal-text' as const },
    ];

    for (const fg of textColors) {
      for (const s of surfaces) {
        const ratio = getContrastRatio(fg.color, s.color);
        results.push({
          pair: `${fg.name} on ${s.name}`,
          ratio,
          minRatio: fg.min,
          passed: ratio >= fg.min,
          type: fg.type,
        });
      }
    }

    // On-primary on primary (button readability)
    const primaryRgb = parseColor(tokens.primary);
    const onPrimaryRgb = parseColor(tokens.textOnPrimary);
    const primaryRatio = getContrastRatio(onPrimaryRgb, primaryRgb);
    results.push({
      pair: 'text-on-primary on primary',
      ratio: primaryRatio,
      minRatio: 4.5,
      passed: primaryRatio >= 4.5,
      type: 'normal-text',
    });

    // Border vs surfaces for UI boundaries (3:1 requirement)
    const borderRgb = parseColor(tokens.border);
    const borderVsSurfaceRatio = getContrastRatio(borderRgb, surfaceRgb);
    results.push({
      pair: 'border vs surface (UI boundary)',
      ratio: borderVsSurfaceRatio,
      minRatio: 3.0,
      passed: borderVsSurfaceRatio >= 3.0,
      type: 'ui/large-text',
    });

    for (const r of results) {
      const status = r.passed ? 'PASS ✅' : 'FAIL ❌';
      console.log(
        `| ${r.pair.padEnd(42)} | ${r.ratio.toFixed(2).padStart(5)}:1 | ${r.minRatio.toFixed(1).padStart(5)}:1 | ${status.padEnd(6)} |`
      );
      if (!r.passed) {
        allPassed = false;
      }
    }
  }

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('✅ ALL WCAG CONTRAST GATES PASSED ACROSS LIGHT, DARK, AND AESTHETIC THEMES');
    console.log('========================================================================\n');
    return true;
  } else {
    console.error('❌ SOME CONTRAST PAIRS FAILED TO MEET THE WCAG AA CRITERIA');
    console.log('========================================================================\n');
    return false;
  }
}

if (process.argv[1] && process.argv[1].includes('check-contrast')) {
  const ok = runContrastAudit();
  if (!ok) {
    process.exit(1);
  }
}
