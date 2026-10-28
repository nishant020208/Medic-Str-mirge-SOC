import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const appTsxPath = path.join(repoRoot, 'client/src/App.tsx');
if (!fs.existsSync(appTsxPath)) {
  console.error(`[generate-routes-manifest] Error: Cannot find ${appTsxPath}`);
  process.exit(1);
}

const content = fs.readFileSync(appTsxPath, 'utf-8');

const staticRoutesSet = new Set(['/']);
const dynamicRoutes = [];
const allRoutesSet = new Set(['/']);

for (const match of content.matchAll(/<Route\s+([^>]+)>/g)) {
  const attrs = match[1];
  const pathMatch = attrs.match(/path=[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
  if (pathMatch) {
    const raw = pathMatch[1].trim();
    if (raw === '*') continue;
    const normalized = '/' + raw.replace(/^\//, '').replace(/\/+$/, '');
    allRoutesSet.add(normalized);

    if (normalized.includes(':')) {
      // Convert parameters like :id into regex patterns matching any path segment except '/'
      const regexStr = '^' + normalized.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      dynamicRoutes.push({ route: normalized, pattern: regexStr });
    } else {
      staticRoutesSet.add(normalized);
    }
  } else if (attrs.includes('index')) {
    staticRoutesSet.add('/');
    allRoutesSet.add('/');
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  staticRoutes: Array.from(staticRoutesSet),
  dynamicRoutes,
  allRoutes: Array.from(allRoutesSet),
};

const targetDirs = [
  path.join(repoRoot, 'server/generated'),
  path.join(repoRoot, 'server/src/generated'),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const targetPath = path.join(dir, 'routes.json');
  fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[generate-routes-manifest] Generated ${targetPath}`);
}
