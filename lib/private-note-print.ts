import type { Language } from './domain';

let activeCleanup: (() => void) | undefined;

// This style exists only while an explicitly requested private print is active.
// The note is a direct body child, so hiding its siblings also hides every form,
// original document preview, unrelated note, and application navigation.
const printRules = `
[data-private-note-print-root] { display: none; }
@media print {
  body > :not([data-private-note-print-root]) { display: none !important; }
  body > [data-private-note-print-root] {
    display: block !important; margin: 0; padding: 0; width: auto;
    background: white; color: black; font: 12pt/1.5 sans-serif;
  }
  [data-private-note-print-root] h1 { margin: 0 0 8pt; color: black; font: bold 18pt/1.3 sans-serif; }
  [data-private-note-print-root] p { margin: 0 0 16pt; color: black; }
  [data-private-note-print-root] pre { margin: 0; color: black; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
}`;

/** Call only from a user gesture. Returns cleanup for source changes/unmount. */
export function printPrivateNote({ note, language, privateDevice }: { note: string; language: Language; privateDevice: boolean }): () => void {
  if (!privateDevice || !note.trim()) return () => undefined;
  activeCleanup?.();
  const root = document.createElement('section');
  root.dataset.privateNotePrintRoot = '';
  root.lang = language;
  const title = document.createElement('h1');
  title.textContent = 'ChallanSakshi';
  const boundary = document.createElement('p');
  boundary.textContent = language === 'hi' ? 'तैयार नोट — जमा नहीं किया गया' : 'Prepared note — not submitted';
  const content = document.createElement('pre');
  content.textContent = note;
  root.appendChild(title); root.appendChild(boundary); root.appendChild(content);
  const style = document.createElement('style');
  style.dataset.privateNotePrintStyle = '';
  style.textContent = printRules;
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('afterprint', cleanup);
    window.removeEventListener('pagehide', cleanup);
    media?.removeEventListener('change', onMediaChange);
    root.replaceChildren(); root.remove(); style.remove();
    if (activeCleanup === cleanup) activeCleanup = undefined;
  };
  const onMediaChange = (event: MediaQueryListEvent) => { if (!event.matches) cleanup(); };
  activeCleanup = cleanup;
  window.addEventListener('afterprint', cleanup);
  window.addEventListener('pagehide', cleanup);
  media?.addEventListener('change', onMediaChange);
  try {
    document.head.appendChild(style); document.body.appendChild(root);
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}
