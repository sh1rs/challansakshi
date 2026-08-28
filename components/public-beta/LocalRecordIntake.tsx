'use client';

import { useRef, useState, type ChangeEvent, type JSX, type RefObject } from 'react';
import {
  formatLocalRecordSize,
  validateLocalRecordFile,
  type LocalRecordFileMeta,
  type LocalRecordRole,
} from '../../lib/local-record-intake';
import styles from './LocalRecordIntake.module.css';

const ACCEPTED_RECORD_TYPES = 'application/pdf,image/jpeg,image/png,image/webp';

export type LocalRecordSelection = {
  file: File;
  meta: LocalRecordFileMeta;
  previewUrl: string;
};

type Language = 'en' | 'hi';

const copy = {
  en: {
    heading: 'Bring the record back',
    introduction: 'Choose a downloaded challan print, receipt, screenshot, or supplied photograph. The selected file stays in this browser memory.',
    receiptHeading: 'Local-processing receipt',
    nothingLeft: 'Nothing has left this device',
    login: 'Government login information · never collected',
    recordPending: 'Selected record · not yet chosen',
    recordReady: 'Selected record · ready for local preview',
    photoPending: 'Selected photograph · not yet chosen',
    photoReady: 'Selected photograph · ready for local preview',
    upload: 'Server upload: off',
    saved: 'Saved case: off',
    recordTitle: 'Official record',
    recordHelp: 'Choose the challan print, receipt, or screenshot you obtained yourself.',
    photoTitle: 'Supplied photograph',
    photoHelp: 'Add the photograph you want to inspect beside the record.',
    chooseRecord: 'Choose official record',
    choosePhoto: 'Choose supplied photograph',
    replace: 'Replace',
    remove: 'Remove',
    memory: 'Memory only',
    category: 'MIME category',
    previewReady: 'Local preview ready',
    inputRecord: 'Choose an official record from this device',
    inputPhoto: 'Choose a supplied photograph from this device',
    imageAlt: 'Citizen-selected evidence preview',
    pdfFallback: 'This browser cannot show the PDF preview. The selected file remains only in browser memory.',
    errors: {
      'empty-file': 'This file is empty. Choose a record or photograph that contains the information you want to review.',
      'file-too-large': 'This file is larger than 12 MiB. Choose a smaller PDF or image before previewing it.',
      'unsupported-type': 'Choose a PDF, JPEG, PNG, or WebP file. The file name alone cannot verify its type.',
    },
  },
  hi: {
    heading: 'रिकॉर्ड वापस लाएँ',
    introduction: 'अपने द्वारा डाउनलोड किया हुआ चालान प्रिंट, रसीद, स्क्रीनशॉट या दी गई तस्वीर चुनें। चुनी गई फ़ाइल केवल इस ब्राउज़र की मेमोरी में रहती है।',
    receiptHeading: 'स्थानीय-प्रोसेसिंग रसीद',
    nothingLeft: 'इस डिवाइस से कुछ भी बाहर नहीं गया है',
    login: 'सरकारी लॉगिन जानकारी · कभी एकत्र नहीं की जाती',
    recordPending: 'चुना गया रिकॉर्ड · अभी नहीं चुना गया',
    recordReady: 'चुना गया रिकॉर्ड · स्थानीय प्रीव्यू के लिए तैयार',
    photoPending: 'चुनी गई तस्वीर · अभी नहीं चुनी गई',
    photoReady: 'चुनी गई तस्वीर · स्थानीय प्रीव्यू के लिए तैयार',
    upload: 'सर्वर अपलोड: बंद',
    saved: 'सेव किया गया केस: बंद',
    recordTitle: 'आधिकारिक रिकॉर्ड',
    recordHelp: 'चालान प्रिंट, रसीद या स्क्रीनशॉट चुनें जो आपने स्वयं प्राप्त किया है।',
    photoTitle: 'दी गई तस्वीर',
    photoHelp: 'वह तस्वीर जोड़ें जिसे आप रिकॉर्ड के साथ देखना चाहते हैं।',
    chooseRecord: 'आधिकारिक रिकॉर्ड चुनें',
    choosePhoto: 'दी गई तस्वीर चुनें',
    replace: 'बदलें',
    remove: 'हटाएँ',
    memory: 'केवल मेमोरी में',
    category: 'MIME श्रेणी',
    previewReady: 'स्थानीय प्रीव्यू तैयार है',
    inputRecord: 'इस डिवाइस से आधिकारिक रिकॉर्ड चुनें',
    inputPhoto: 'इस डिवाइस से दी गई तस्वीर चुनें',
    imageAlt: 'नागरिक द्वारा चुनी गई साक्ष्य तस्वीर का प्रीव्यू',
    pdfFallback: 'यह ब्राउज़र PDF प्रीव्यू नहीं दिखा सकता। चुनी गई फ़ाइल केवल ब्राउज़र मेमोरी में रहती है।',
    errors: {
      'empty-file': 'यह फ़ाइल खाली है। ऐसा रिकॉर्ड या तस्वीर चुनें जिसमें वह जानकारी हो जिसे आप देखना चाहते हैं।',
      'file-too-large': 'यह फ़ाइल 12 MiB से बड़ी है। प्रीव्यू से पहले छोटा PDF या चित्र चुनें।',
      'unsupported-type': 'PDF, JPEG, PNG या WebP फ़ाइल चुनें। केवल फ़ाइल नाम से उसका प्रकार सत्यापित नहीं होता।',
    },
  },
} as const;

type IntakeRowProps = {
  role: LocalRecordRole;
  selection: LocalRecordSelection | null;
  onSelectionChange: (selection: LocalRecordSelection | null) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  language: Language;
};

function IntakeRow({ role, selection, onSelectionChange, inputRef, disabled, language }: IntakeRowProps) {
  const [error, setError] = useState<keyof (typeof copy)['en']['errors'] | null>(null);
  const text = copy[language];
  const isPhotograph = role === 'photograph';
  const title = isPhotograph ? text.photoTitle : text.recordTitle;

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const validation = validateLocalRecordFile(file, role);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    setError(null);
    onSelectionChange({
      file,
      meta: {
        name: file.name,
        size: file.size,
        type: file.type,
        role,
        previewKind: validation.previewKind,
      },
      previewUrl: URL.createObjectURL(file),
    });
  };

  const clearSelection = () => {
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
    onSelectionChange(null);
  };

  return (
    <section className={styles.intakeRow} aria-labelledby={`${role}-title`}>
      <div className={styles.rowCopy}>
        <p className={styles.eyebrow}>{isPhotograph ? 'B' : 'A'}</p>
        <h3 id={`${role}-title`}>{title}</h3>
        <p>{isPhotograph ? text.photoHelp : text.recordHelp}</p>
      </div>

      <input
        ref={inputRef}
        className={styles.visuallyHidden}
        tabIndex={-1}
        type="file"
        accept={ACCEPTED_RECORD_TYPES}
        capture={isPhotograph ? 'environment' : undefined}
        aria-label={isPhotograph ? text.inputPhoto : text.inputRecord}
        disabled={disabled}
        onChange={chooseFile}
      />

      {selection ? (
        <div className={styles.selection}>
          <div className={styles.metadata}>
            <strong>{selection.meta.name}</strong>
            <span>{formatLocalRecordSize(selection.meta.size)}</span>
            <span>{text.category}: {selection.meta.type}</span>
            <span>{text.memory}</span>
            <span>{text.upload}</span>
            <span>{text.previewReady}</span>
          </div>

          <div className={styles.preview}>
            {selection.meta.previewKind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- The deliberate local object URL must not be routed through an image service.
              <img src={selection.previewUrl} alt={text.imageAlt} />
            ) : (
              <object data={selection.previewUrl} type="application/pdf" aria-label={text.previewReady}>
                <p>{text.pdfFallback}</p>
              </object>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
              {text.replace}
            </button>
            <button type="button" className={styles.remove} onClick={clearSelection} disabled={disabled}>
              {text.remove}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.choose} onClick={() => inputRef.current?.click()} disabled={disabled}>
          {isPhotograph ? text.choosePhoto : text.chooseRecord}
        </button>
      )}

      {error ? <p className={styles.error} role="alert">{text.errors[error]}</p> : null}
    </section>
  );
}

export function LocalRecordIntake(props: {
  record: LocalRecordSelection | null;
  photograph: LocalRecordSelection | null;
  onRecordChange: (selection: LocalRecordSelection | null) => void;
  onPhotographChange: (selection: LocalRecordSelection | null) => void;
  disabled?: boolean;
  language: 'en' | 'hi';
}): JSX.Element {
  const recordInputRef = useRef<HTMLInputElement>(null);
  const photographInputRef = useRef<HTMLInputElement>(null);
  const text = copy[props.language];
  const disabled = props.disabled ?? false;

  return (
    <section className={styles.intake} aria-labelledby="local-record-intake-heading">
      <header className={styles.header}>
        <h2 id="local-record-intake-heading">{text.heading}</h2>
        <p>{text.introduction}</p>
      </header>

      <aside className={styles.receipt} aria-label={text.receiptHeading}>
        <strong>{text.receiptHeading}</strong>
        <ul>
          <li>{text.nothingLeft}</li>
          <li>{text.login}</li>
          <li>{props.record ? text.recordReady : text.recordPending}</li>
          <li>{props.photograph ? text.photoReady : text.photoPending}</li>
          <li>{text.upload}</li>
          <li>{text.saved}</li>
        </ul>
      </aside>

      <div className={styles.rows}>
        <IntakeRow
          role="official-record"
          selection={props.record}
          onSelectionChange={props.onRecordChange}
          inputRef={recordInputRef}
          disabled={disabled}
          language={props.language}
        />
        <IntakeRow
          role="photograph"
          selection={props.photograph}
          onSelectionChange={props.onPhotographChange}
          inputRef={photographInputRef}
          disabled={disabled}
          language={props.language}
        />
      </div>
    </section>
  );
}
