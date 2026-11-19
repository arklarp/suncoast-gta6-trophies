// SUNCOAST — 100% offline Grand Theft Auto VI (PS5) Trophy Guide & Tracker.
// Copies static app/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output) and emits dossier.json.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const screenshotsSrc = join(repoRoot, 'screenshots');
const screenshotsDst = join(outputDir, 'screenshots');
mkdirSync(screenshotsDst, { recursive: true });
if (existsSync(screenshotsSrc)) {
  cpSync(screenshotsSrc, screenshotsDst, { recursive: true });
}

const dossierJson = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossierJson);
