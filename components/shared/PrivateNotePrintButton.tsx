'use client';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../lib/domain';
import { printPrivateNote } from '../../lib/private-note-print';

export default function PrivateNotePrintButton({ note, language, privateDevice, onAuthorize, className }: { note: string; language: Language; privateDevice: boolean; onAuthorize: () => boolean; className?: string }) {
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { cleanup.current?.(); cleanup.current = undefined; }, [note, language, privateDevice]);
  if (!privateDevice || !note.trim()) return null;
  const print = () => {
    cleanup.current?.(); setFailed(false);
    if (!onAuthorize()) return;
    try { cleanup.current = printPrivateNote({ note, language, privateDevice }); }
    catch { setFailed(true); }
  };
  return <>
    <button type="button" data-private-note-print-button className={className} onClick={print}>{language === 'hi' ? 'प्रिंट करें या PDF के रूप में सहेजें' : 'Print or save as PDF'}</button>
    {failed && <p role="status">{language === 'hi' ? 'प्रिंट विकल्प नहीं खुला। दोबारा कोशिश करें या पाठ वाला नोट डाउनलोड करें।' : 'Could not open printing. Try again or download the text note.'}</p>}
  </>;
}
