// scripts/patch-stitch-nav.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stitchDir = path.join(__dirname, '..', 'public', 'stitch');
const files = fs.readdirSync(stitchDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(stitchDir, file);
  let html = fs.readFileSync(filePath, 'utf-8');

  // Replace data-path links with actual URLs
  html = html.replace(/data-path="autonomous-dating-arena"\s+href="#"/g, 'data-path="autonomous-dating-arena" href="/stitch/autonomous-dating-arena.html"');
  html = html.replace(/data-path="agent-dossiers"\s+href="#"/g, 'data-path="agent-dossiers" href="/stitch/agent-personality-dossiers.html"');
  html = html.replace(/data-path="compatibility-matrix"\s+href="#"/g, 'data-path="compatibility-matrix" href="/stitch/compatibility-matrix-rankings.html"');
  html = html.replace(/data-path="ingestion-terminal"\s+href="#"/g, 'data-path="ingestion-terminal" href="/stitch/data-ingestion-tech-terminal.html"');
  html = html.replace(/href="#"/g, 'href="javascript:void(0)"');

  // Add interactive switch button in header if not already present
  if (!html.includes('id="btn-switch-interactive"')) {
    html = html.replace(
      '</header>',
      `<div class="fixed bottom-6 right-6 z-50">
        <a href="/" id="btn-switch-interactive" class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-2xl hover:scale-105 transition-all">
          <span>⚡ Open Live Interactive Engine (26 Real People)</span>
        </a>
      </div></header>`
    );
  }

  fs.writeFileSync(filePath, html);
  console.log(`Patched navigation in ${file}`);
});

console.log("Stitch navigation patched successfully!");
