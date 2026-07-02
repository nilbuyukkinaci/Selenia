// Fetch latin woff2 subsets from Google Fonts and self-host them.
import { writeFileSync, mkdirSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const url = 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
mkdirSync('fonts', { recursive: true });
const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
const blocks = css.split('@font-face').slice(1);
let out = '/* Self-hosted latin subsets — Spectral (Production Type) + Hanken Grotesk */\n';
let n = 0;
for (const b of blocks) {
  const fam = (b.match(/font-family:\s*'([^']+)'/) || [])[1];
  const wght = (b.match(/font-weight:\s*(\d+)/) || [])[1];
  const style = (b.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
  const range = (b.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
  const src = (b.match(/url\(([^)]+)\)\s*format\('woff2'\)/) || [])[1];
  if (!src || !fam) continue;
  if (!/U\+0000-00FF/.test(range)) continue; // latin subset only
  const slug = `${fam.replace(/\s+/g, '')}-${wght}-${style}`.toLowerCase();
  const file = `fonts/${slug}.woff2`;
  const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
  writeFileSync(file, buf);
  out += `@font-face{font-family:'${fam}';font-style:${style};font-weight:${wght};font-display:swap;src:url('${slug}.woff2') format('woff2');}\n`;
  n++;
  console.log('saved', file, (buf.length / 1024).toFixed(1) + 'KB');
}
writeFileSync('fonts/fonts.css', out);
console.log('wrote fonts/fonts.css with', n, 'faces');
