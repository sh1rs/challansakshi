/**
 * Real browser-local ASR smoke using generated speech, never a microphone.
 * Requires macOS say/afconvert, a production build and a running local preview.
 * Public model assets are downloaded; no paid API or audio upload is used.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.env.CHALLANSAKSHI_BASE_URL ?? 'http://127.0.0.1:4188';
const repeats = Number(process.env.VOICE_SMOKE_REPEATS ?? 4);
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 5) throw new Error('VOICE_SMOKE_REPEATS must be between 1 and 5.');
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'challansakshi-voice-smoke-'));
let browser;

try {
  const aiff = path.join(temporaryDirectory, 'synthetic.aiff');
  const wav = path.join(temporaryDirectory, 'synthetic.wav');
  execFileSync('/usr/bin/say', ['-v', 'Samantha', '-r', '150', '-o', aiff, 'What evidence is missing?']);
  execFileSync('/usr/bin/afconvert', [aiff, wav, '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1']);
  const syntheticAudio = await readFile(wav);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const requests = [];
  const failures = [];
  context.on('request', request => {
    const url = new URL(request.url());
    if (/voice|huggingface|hf\.co/.test(request.url())) {
      requests.push({ host: url.host, path: url.pathname, method: request.method() });
    }
  });
  context.on('requestfailed', request => failures.push({ host: new URL(request.url()).host, error: request.failure()?.errorText }));
  // Supply only a generated audio fixture. Page and worker response headers stay intact.
  await context.route('**/voice-synthetic-fixture.wav', route => route.fulfill({
    status: 200, contentType: 'audio/wav', body: syntheticAudio,
  }));
  const page = await context.newPage();
  await page.goto(new URL('/review', baseUrl).href);
  await page.evaluate(workerPath => {
    const start = performance.now();
    const worker = new Worker(workerPath, { type: 'module' });
    window.voiceSmoke = { worker, start, events: [], pending: new Map() };
    worker.onmessage = ({ data }) => {
      const state = window.voiceSmoke;
      if (data.type !== 'progress') state.events.push({ ...data, atMs: Math.round(performance.now() - start) });
      if (data.type === 'result' || (data.type === 'error' && data.id !== undefined)) {
        state.pending.get(data.id)?.(data);
        state.pending.delete(data.id);
      }
    };
    worker.onerror = event => window.voiceSmoke.events.push({ type: 'worker-error', message: event.message });
    worker.postMessage({ type: 'load' });
  }, '/voice/voice-recognition.worker.js');
  await page.waitForFunction(() => window.voiceSmoke.events.some(event => ['ready', 'error', 'worker-error'].includes(event.type)), {}, { timeout: 300_000 });
  const events = await page.evaluate(() => window.voiceSmoke.events);
  if (!events.some(event => event.type === 'ready')) throw new Error(`Local model did not load: ${JSON.stringify(events)}`);

  const report = await page.evaluate(async count => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const decoded = await audioContext.decodeAudioData(await (await fetch('/voice-synthetic-fixture.wav')).arrayBuffer());
    const original = decoded.getChannelData(0);
    if (!original.length || !original.some(value => Math.abs(value) > 0.001)) throw new Error('Synthetic speech generation returned empty audio.');
    const results = [];
    for (let id = 1; id <= count; id++) {
      const audio = new Float32Array(original);
      const start = performance.now();
      const reply = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Local decode timed out.')), 120_000);
        window.voiceSmoke.pending.set(id, result => { clearTimeout(timeout); resolve(result); });
        window.voiceSmoke.worker.postMessage({ type: 'decode', id, audio, language: 'en' }, [audio.buffer]);
      });
      results.push({ ...reply, decodeMs: Math.round(performance.now() - start) });
    }
    const result = {
      modelReadyMs: window.voiceSmoke.events.find(event => event.type === 'ready').atMs,
      syntheticText: 'What evidence is missing?', sampleRate: decoded.sampleRate,
      audioSeconds: decoded.duration, results,
    };
    await audioContext.close();
    window.voiceSmoke.worker.terminate();
    return result;
  }, repeats);
  process.stdout.write(`${JSON.stringify({ ...report, requests, failures }, null, 2)}\n`);
  if (report.results.some(result => result.type !== 'result' || result.text.trim().toLowerCase() !== 'what evidence is missing?')) process.exitCode = 1;
} finally {
  await browser?.close();
  // Generated temporary audio is deleted even after a failed run.
  await rm(temporaryDirectory, { recursive: true, force: true });
}
