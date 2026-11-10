import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textPng } from './stuck/png.js';
import { wrap } from './stuck/pdf.js';
import { THEATRE_SQUARE } from './stuck/problems.js';

// Proves OCR works INSIDE the backend image: renders a problem statement to a PNG, compiles OcrProbe against
// backend/target/classes, and runs it in the image (npm run check:ocr; build the image and the jar first).
const IMAGE = process.env.OCR_IMAGE ?? 'algolearn-backend';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const work = mkdtempSync(path.join(tmpdir(), 'algolearn-ocr-'));
// The image runs as a non-root user: let it read the mounted folder (mkdtemp creates it as 0700).
chmodSync(work, 0o755);

const lines = wrap(THEATRE_SQUARE.split('\n').slice(0, 3).join('\n'), 64);
writeFileSync(path.join(work, 'statement.png'), textPng(lines));
console.log(`rendered ${lines.length} lines to statement.png`);

execFileSync('javac', ['-d', work, '-cp', path.join(root, 'backend/target/classes'),
  path.join(root, 'tools/checks/ocr/OcrProbe.java')], { stdio: 'inherit' });

execFileSync('docker', ['run', '--rm', '-v', `${work}:/probe:ro`, '--entrypoint', 'java', IMAGE,
  '-cp', '/app/app.jar', '-Dloader.path=/probe', '-Dloader.main=OcrProbe',
  'org.springframework.boot.loader.launch.PropertiesLauncher', '/probe/statement.png'], { stdio: 'inherit' });
