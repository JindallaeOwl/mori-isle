// Minimal Chrome DevTools Protocol driver (Node 22+, built-in WebSocket).
// usage: node tools/cdp.mjs "file:///D:/Owl/mori-isle/mori_isle.html#debug=1" tools/tests/controls.mjs
// The script default-exports async ({ wait, evaluate, mouse, wheel, key, shot, log }) => {}
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [url, scriptFile] = process.argv.slice(2);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'mori-cdp-'));
// AUTOPLAY=0 keeps Chrome's normal rule (no sound before the first click / key), like a real visit
const autoplay = process.env.AUTOPLAY === '0' ? [] : ['--autoplay-policy=no-user-gesture-required'];
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', ...autoplay, '--window-size=1000,640', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// close Chrome and remove this run's profile folder (tens of MB each; they piled up in TEMP before).
// Browser.close lets every Chrome process quit; Windows may hold the files a moment longer, so retry.
const cleanup = async (close) => {
  if (proc.exitCode === null) {
    const gone = new Promise((r) => proc.once('exit', r));
    if (close) close(); else proc.kill();
    await Promise.race([gone, sleep(5000)]);
    if (proc.exitCode === null) proc.kill();
  }
  for (let i = 0; ; i++) {
    try { rmSync(prof, { recursive: true, force: true }); return; } catch (e) { if (i >= 40) { console.log('could not remove', prof, e.code); return; } }
    await sleep(250);
  }
};

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
  if (!wsUrl) await sleep(250);
}
if (!wsUrl) { console.log('no chrome'); await cleanup(); process.exit(1); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +(process.env.W || 1000), height: +(process.env.H || 640), deviceScaleFactor: 1, mobile: false }); // W, H env: viewport size
await send('Page.navigate', { url });

const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
const wait = async (ms) => sleep(ms);
const mouse = async (type, x, y, opts = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: opts.button || 'none', buttons: opts.buttons || 0, clickCount: opts.clickCount || 0, modifiers: opts.modifiers || 0 });
const wheel = async (x, y, deltaY, deltaX = 0, modifiers = 0) => send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY, modifiers });
const key = async (k) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k }); };
const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
const log = (...a) => console.log(...a);

try {
  const mod = await import(pathToFileURL(scriptFile).href);
  await mod.default({ wait, evaluate, mouse, wheel, key, shot, log, send });
} catch (e) { console.log('SCRIPT ERROR', e.stack || e); }
await cleanup(() => send('Browser.close'));
ws.close();
process.exit(0);
