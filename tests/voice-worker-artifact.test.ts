import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { compileVoiceWorker } from '../scripts/build-voice-worker.mjs';
it('ships the exact compiled voice worker without page-only development imports', async () => {
  const shipped = await readFile(new URL('../public/voice/voice-recognition.worker.js', import.meta.url), 'utf8');
  expect(shipped).toBe(await compileVoiceWorker());
  expect(shipped).not.toContain('/@vite/client');
});
