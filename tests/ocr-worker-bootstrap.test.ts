import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const wrapper = () => readFileSync(new URL('../public/document-assets/tesseract-7.0.0/reader-worker.js', import.meta.url), 'utf8');

function boot() {
  const calls: unknown[] = [];
  const self = { postMessage: (message: unknown) => calls.push(message), close: () => calls.push('closed') };
  const importScripts = vi.fn();
  vm.runInNewContext(wrapper(), { self, importScripts });
  return { calls, self, importScripts };
}

describe('local OCR worker bootstrap cleanup', () => {
  it.each(['load', 'loadLanguage', 'initialize'])('forwards %s failure before closing the bootstrap worker', action => {
    const worker = boot();
    const failure = { action, status: 'reject', jobId: 'job', workerId: 'worker', data: 'download failed' };
    worker.self.postMessage(failure);
    expect(worker.calls).toEqual([failure, 'closed']);
  });
  it('preserves normal progress, results, and non-bootstrap errors', () => {
    const worker = boot();
    const messages = [{ action: 'load', status: 'progress' }, { action: 'initialize', status: 'resolve' }, { action: 'recognize', status: 'resolve', data: { text: 'controlled fixture' } }, { action: 'recognize', status: 'reject' }];
    messages.forEach(message => worker.self.postMessage(message));
    expect(worker.calls).toEqual(messages);
    expect(worker.importScripts).toHaveBeenCalledWith('./worker.min.js');
  });
});
