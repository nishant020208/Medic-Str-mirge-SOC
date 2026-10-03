// scripts/lint-colors.ts
// Audits client/src to ensure zero raw Tailwind colors or hardcoded hex/rgb/hsl outside themes.css

import fs from 'node:fs';
import path from 'node:path';

interface Violation {
  file: string;
  line: number;
  match: string;
  content: string;
}

const CLIENT_SRC = path.resolve(process.cwd(), 'client/src');
const EXCLUDED_FILES = [
  path.normalize(path.resolve(CLIENT_SRC, 'styles/themes.css')),
  path.normalize(path.resolve(CLIENT_SRC, 'data/oracleKnowledge.json')),
];

const RAW_PALETTES = [
  'blue', 'gray', 'slate', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
  'marble', 'lapis', 'gold', 'terracotta', 'olive', 'ink',
].join('|');

const RAW_TAILWIND_REGEX = new RegExp(
  `\\b(?:(?:dark:|hover:|focus:|active:|group-hover:)?(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:(?:${RAW_PALETTES})-(?:[0-9]+|DEFAULT)|white|black)(?:\\/[0-9]+)?)\\b`,
  'g'
);

// Hex colors like #fff, #123456, but ignore things like #root or anchor links like href="#..."
const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

// RGB, RGBA, HSL, HSLA
const RGB_HSL_REGEX = /\b(?:rgba?|hsla?)\s*\([^\)]+\)/g;

function walkDir(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (entry.isFile()) {
      if (
        (fullPath.endsWith('.tsx') ||
          fullPath.endsWith('.ts') ||
          fullPath.endsWith('.css')) &&
        !EXCLUDED_FILES.includes(path.normalize(fullPath))
      ) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

export function lintColors(): boolean {
  console.log('========================================================================');
  console.log('      MEDISTORE ASCLEPIUS: COLOR LINT & SEMANTIC TOKEN ENFORCEMENT       ');
  console.log('========================================================================\n');

  const files = walkDir(CLIENT_SRC);
  const violations: Violation[] = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

      // 1. Check raw Tailwind palette classes
      const rawMatches = line.match(RAW_TAILWIND_REGEX);
      if (rawMatches) {
        for (const m of rawMatches) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            match: `Raw Tailwind Color: "${m}"`,
            content: trimmed,
          });
        }
      }

      // 2. Check hardcoded hex colors
      const hexMatches = line.match(HEX_COLOR_REGEX);
      if (hexMatches) {
        for (const m of hexMatches) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            match: `Hardcoded Hex Color: "${m}"`,
            content: trimmed,
          });
        }
      }

      // 3. Check hardcoded rgb/hsl
      const rgbMatches = line.match(RGB_HSL_REGEX);
      if (rgbMatches) {
        for (const m of rgbMatches) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNum,
            match: `Hardcoded RGB/HSL Color: "${m}"`,
            content: trimmed,
          });
        }
      }
    });
  }

  if (violations.length === 0) {
    console.log(`✅ Audited ${files.length} client files.`);
    console.log('✅ ZERO hardcoded colors or raw Tailwind palette classes found outside themes.css.');
    console.log('========================================================================\n');
    return true;
  }

  console.error(`❌ Found ${violations.length} color token violations in client/src:\n`);
  for (const v of violations.slice(0, 30)) {
    console.error(`  - ${v.file}:${v.line} -> ${v.match}`);
    console.error(`    Line: ${v.content}`);
  }
  if (violations.length > 30) {
    console.error(`  ... and ${violations.length - 30} more violations.`);
  }

  console.log('\n========================================================================\n');
  return false;
}

if (process.argv[1] && process.argv[1].includes('lint-colors')) {
  const ok = lintColors();
  if (!ok) {
    process.exit(1);
  }
}
