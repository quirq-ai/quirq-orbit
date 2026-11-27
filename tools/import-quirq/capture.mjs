// Capture a poster screenshot and a short scrolling clip of each live app, for the Work showcase.
// No dependencies: drives a local headless Chrome over the DevTools protocol, encodes with ffmpeg.
//
//   node capture.mjs ../../assets/work heartwood=https://... instants=https://...
//   node capture.mjs ../../assets/work --from ../../js/repos.js        (every repo with a live app)
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [, , outArg, ...rest] = process.argv;
const OUT = resolve(outArg || '../../assets/work');
const W = 1280, H = 800, PORT = 9339;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = [];
if (rest[0] === '--from') {
  const { REPOS } = await import(pathToFileURL(resolve(rest[1])).href);
  targets = REPOS.filter((r) => r.demo).map((r) => [r.slug, r.demo]);
} else {
  targets = rest.map((a) => a.split(/=(.+)/).slice(0, 2));
}
mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'qcap-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader',
  'about:blank',
], { stdio: 'ignore' });

async function json(path, method = 'GET') {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}${path}`, { method })).json(); } catch { await sleep(200); }
  }
  throw new Error('Chrome did not start');
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) listeners.forEach((l) => l(m));
  };
  const ready = new Promise((r) => (ws.onopen = r));
  return {
    ready,
    send: (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
    once: (name, ms) => new Promise((r) => { const t = setTimeout(() => r(null), ms); listeners.push((m) => { if (m.method === name) { clearTimeout(t); r(m); } }); }),
    close: () => ws.close(),
  };
}

async function capture(slug, url) {
  const t = await json('/json/new?about:blank', 'PUT');
  const c = cdp(t.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const loaded = c.once('Page.loadEventFired', 25000);
  await c.send('Page.navigate', { url });
  await loaded;
  await sleep(4500);
  // Get past splash screens: press an obvious Begin / Start / Enter button if there is one.
  const btn = (await c.send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const b = [...document.querySelectorAll('button, a, [role=button]')].find((e) => {
      const r = e.getBoundingClientRect();
      return /^\\s*(begin|start|enter|play|explore|launch)\\b/i.test(e.textContent || '') && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight;
    });
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()` })).result.result.value;
  if (btn) {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await c.send('Input.dispatchMouseEvent', { type, x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
    }
    await sleep(9000);
  }
  const shot = async (q) => Buffer.from((await c.send('Page.captureScreenshot', { format: 'jpeg', quality: q })).result.data, 'base64');
  writeFileSync(join(OUT, `${slug}.jpg`), await shot(82));

  // A ~9s clip: hold, scroll down the page, sweep the pointer, scroll back. Canvas apps get a slow drag instead.
  const frames = mkdtempSync(join(tmpdir(), `qf-${slug}-`));
  const docH = (await c.send('Runtime.evaluate', { expression: 'Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)', returnByValue: true })).result.result.value || H;
  const canvasApp = (await c.send('Runtime.evaluate', { expression: '!!document.querySelector("canvas") && document.documentElement.scrollHeight <= innerHeight + 40', returnByValue: true })).result.result.value;
  const reach = Math.min(Math.max(docH - H, 0), 1800);
  const N = 100;
  const t0 = Date.now();
  if (canvasApp) await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: W * 0.35, y: H * 0.5, button: 'left', clickCount: 1 });
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    if (canvasApp) {
      const x = W * (0.35 + 0.3 * Math.sin(p * Math.PI)), y = H * (0.5 + 0.06 * Math.sin(p * Math.PI * 2));
      await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    } else {
      const s = p < 0.15 ? 0 : p < 0.7 ? (p - 0.15) / 0.55 : p < 0.82 ? 1 : 1 - (p - 0.82) / 0.18;
      const ease = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
      await c.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${Math.round(reach * ease)})` });
      await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W * (0.3 + 0.4 * p), y: H * (0.45 + 0.1 * Math.sin(p * 6)) });
    }
    writeFileSync(join(frames, `f${String(i).padStart(3, '0')}.jpg`), await shot(72));
    await sleep(40);
  }
  if (canvasApp) await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: W * 0.35, y: H * 0.5, button: 'left', clickCount: 1 });
  const fps = Math.max(6, Math.min(24, N / ((Date.now() - t0) / 1000)));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps.toFixed(2), '-i', join(frames, 'f%03d.jpg'),
    '-vf', 'scale=960:-2,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-movflags', '+faststart', '-an',
    join(OUT, `${slug}.mp4`)]);
  rmSync(frames, { recursive: true, force: true });
  await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`);
  c.close();
  console.log(`${slug}: ok (${canvasApp ? 'canvas drag' : `scroll ${reach}px`}, ${fps.toFixed(1)} fps)`);
}

try {
  await json('/json/version');
  for (const [slug, url] of targets) {
    try { await capture(slug, url); } catch (e) { console.log(`${slug}: failed (${e.message})`); }
  }
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
