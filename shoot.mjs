// Dependency-free CDP screenshotter driving system Chrome (Node 24 global WebSocket).
// Usage: node shoot.mjs <url> <out.png> [--w=1440] [--h=0] [--dpr=2] [--reduce] [--wait=1400] [--scroll=PX] [--full]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
const opt = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const flag = (k) => args.includes(`--${k}`);
const W = +opt('w', 1440), DPR = +opt('dpr', 2), WAIT = +opt('wait', 1400);
const SCROLL = opt('scroll', null);
const REDUCE = flag('reduce');
const FULL = flag('full') || +opt('h', 0) === 0;
const Hbase = +opt('h', 0) || 1000;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor((Date.now ? 0 : 0)) + (process.pid % 400); // stable-ish per process
const userDir = mkdtempSync(join(tmpdir(), 'sel-chrome-'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--force-color-profile=srgb', '--disable-lcd-text',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'ignore'] });

let ws, msgId = 0; const pending = new Map();
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

async function getJson(path) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return r.json();
}

async function main() {
  // wait for devtools endpoint
  let version;
  for (let i = 0; i < 60; i++) {
    try { version = await getJson('/json/version'); break; } catch { await sleep(150); }
  }
  if (!version) throw new Error('Chrome devtools did not come up');

  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (method, params) => send(method, params, sessionId);

  await S('Page.enable');
  await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: Hbase, deviceScaleFactor: DPR, mobile: W < 600 });
  if (REDUCE) await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  await S('Page.navigate', { url });
  await sleep(WAIT);

  // Force reveals + trigger figure animations, then let them finish, so captures show the final composition.
  if (!REDUCE) {
    await S('Runtime.evaluate', { expression: `window.__revealAll && window.__revealAll();` });
    await sleep(1900);
  }

  if (SCROLL !== null) {
    await S('Runtime.evaluate', { expression: `document.documentElement.style.scrollBehavior='auto';window.scrollTo(0, ${+SCROLL});` });
    await sleep(650);
  }

  let clip;
  if (FULL) {
    await S('Runtime.evaluate', { expression: `window.__revealAll && window.__revealAll();` });
    await sleep(250);
    const { cssContentSize } = await S('Page.getLayoutMetrics');
    clip = { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.ceil(cssContentSize.height), scale: 1 };
  }

  const shot = await S('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: FULL,
    ...(clip ? { clip } : {})
  });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`saved ${out}  (${W}w dpr${DPR}${REDUCE ? ' reduced' : ''}${FULL ? ' full' : SCROLL !== null ? ' @' + SCROLL : ''})`);
}

main().then(() => { chrome.kill('SIGKILL'); try { rmSync(userDir, { recursive: true, force: true }); } catch {} process.exit(0); })
  .catch(e => { console.error('ERR', e.message); chrome.kill('SIGKILL'); try { rmSync(userDir, { recursive: true, force: true }); } catch {} process.exit(1); });
