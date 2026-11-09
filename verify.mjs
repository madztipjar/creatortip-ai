// CreatorTip AI — automated verification.
// Usage: npm run verify
// Checks:
//   1. server.mjs serves /, /app.js, /style.css, /config.js with HTTP 200
//   2. JS files pass `node --check`
//   3. the AI composer returns DISTINCT messages for the same inputs across
//      all four tones, and never repeats a string in 20 runs of one tone
//   4. amount validation rejects 0 / negative / NaN / empty, accepts valid
// Prints PASS/FAIL per check and exits non-zero if anything fails.
import { spawn, execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const PORT = 4174;
const BASE = `http://localhost:${PORT}`;
let failures = 0;

function report(ok, label, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

async function waitForServer(proc, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) return false;
    try {
      const r = await fetch(BASE + '/');
      if (r.status === 200) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/* ---- 2 (run first, no server needed): node --check on JS files ---- */
for (const file of ['public/app.js', 'public/config.js', 'server.mjs', 'verify.mjs']) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    report(true, `node --check ${file}`);
  } catch (e) {
    report(false, `node --check ${file}`, String(e.stderr || e.message).trim().split('\n')[0]);
  }
}

/* ---- Load the pure core from public/app.js in a vm (no DOM) ---- */
let core = null;
try {
  const src = await readFile('public/app.js', 'utf8');
  const sandbox = { console, Math, JSON, setTimeout, clearTimeout };
  sandbox.module = { exports: {} };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'app.js' });
  core = sandbox.module.exports;
  report(core && typeof core.composeMessage === 'function', 'app.js core loads in Node (no DOM)');
} catch (e) {
  report(false, 'app.js core loads in Node (no DOM)', e.message);
}

/* ---- 3: composer distinctness ---- */
if (core) {
  const inputs = {
    fanName: 'Alex',
    creatorName: 'madz',
    detail: 'your late-night coding streams',
  };
  const toneKeys = ['supportive', 'funny', 'hype', 'grateful'];
  const byTone = toneKeys.map((t) => core.composeMessage({ ...inputs, tone: t }));
  report(
    new Set(byTone).size === toneKeys.length && byTone.every((m) => typeof m === 'string' && m.length > 20),
    'composer: 4 tones produce 4 distinct messages for identical inputs',
  );
  report(
    byTone.every((m) => m.includes('Alex') || m.includes('Alex,')) &&
      byTone.every((m) => m.toLowerCase().includes('late-night coding streams')),
    'composer: fan name and creator detail are interpolated into every tone',
  );

  const runs = new Set();
  for (let i = 0; i < 20; i++) runs.add(core.composeMessage({ ...inputs, tone: 'supportive' }));
  report(runs.size === 20, 'composer: 20 runs of one tone produce 20 distinct messages', `unique=${runs.size}/20`);

  const ty1 = core.composeThankYou({ fanName: 'Alex', amount: 5, message: byTone[0], detail: inputs.detail });
  report(
    typeof ty1 === 'string' && ty1.includes('Alex') && ty1.includes('$5'),
    'thank-you generator: draft includes fan name and tip amount',
  );
}

/* ---- 4: amount validation ---- */
if (core) {
  const cases = [
    [0, false, 'zero'],
    [-5, false, 'negative'],
    ['-0.01', false, 'negative string'],
    ['abc', false, 'non-numeric (NaN)'],
    ['', false, 'empty'],
    [NaN, false, 'NaN'],
    [5, true, 'integer 5'],
    ['10.50', true, 'decimal string 10.50'],
    [0.5, true, 'fraction 0.5'],
    [10001, false, 'above demo cap'],
  ];
  for (const [input, shouldBeOk, label] of cases) {
    const r = core.validateAmount(input);
    report(r.ok === shouldBeOk, `validateAmount rejects/accepts ${label}`, `input=${JSON.stringify(input)} ok=${r.ok}`);
  }
  const rounded = core.validateAmount('10.505');
  report(rounded.ok && Math.abs(rounded.value - 10.51) < 1e-9 || (rounded.ok && Math.abs(rounded.value - 10.5) < 1e-9),
    'validateAmount rounds to cents', `value=${rounded.value}`);
}

/* ---- 1: server serves the app ---- */
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'pipe',
});
try {
  const up = await waitForServer(server);
  report(up, `server starts on port ${PORT}`);
  if (up) {
    for (const path of ['/', '/app.js', '/style.css', '/config.js']) {
      try {
        const r = await fetch(BASE + path);
        report(r.status === 200, `GET ${path} -> HTTP ${r.status}`);
      } catch (e) {
        report(false, `GET ${path}`, e.message);
      }
    }
    const home = await (await fetch(BASE + '/')).text();
    report(
      home.includes('CreatorTip') && home.includes('paypal-buttons') && home.includes('composer-panel'),
      'index.html contains tip page, composer and checkout mount points',
    );
  }
} finally {
  server.kill('SIGTERM');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
