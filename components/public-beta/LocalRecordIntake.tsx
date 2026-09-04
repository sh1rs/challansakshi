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
  meta: LocalRecordFileMeta;
  previewUrl: string;
};

type Language = 'en' | 'hi';

const copy = {
  en: {
    selectedRecord: 'Selected notice',
    selectedPhotograph: 'Selected photograph',
    recordTitle: 'Challan copy',
    recordHelp: 'The challan print, receipt, or screenshot you obtained yourself.',
    photoTitle: 'Photo from the challan',
    photoHelp: 'The photograph you want to inspect beside the record.',
    chooseRecord: 'Choose challan copy',
    choosePhoto: 'Choose photo from the challan',
    remove: 'Remove',
    memory: 'memory only',
    openPdf: 'Open selected PDF locally',
    inputRecord: 'Choose an official record from this device',
    inputPhoto: 'Choose a supplied photograph from this device',
    imageAlt: 'Citizen-selected evidence preview',
    pdfNote: 'Opens in a new browser-local tab. Close the PDF tab yourself, especially on a shared device.',
    errors: {
      'empty-file': 'This file is empty. Choose a record or photograph that contains the information you want to review.',
      'file-too-large': 'This file is larger than 12 MiB. Choose a smaller PDF or image before previewing it.',
      'unsupported-type': 'Choose a PDF, JPEG, PNG, or WebP file. The file name alone cannot verify its type.',
    },
  },
  hi: {
    selectedRecord: 'चुना गया नोटिस',
    selectedPhotograph: 'चुनी गई तस्वीर',
    recordTitle: 'चालान की कॉपी',
    recordHelp: 'चालान प्रिंट, रसीद या स्क्रीनशॉट जो आपने स्वयं प्राप्त किया है।',
    photoTitle: 'चालान की तस्वीर',
    photoHelp: 'वह तस्वीर जिसे आप रिकॉर्ड के साथ देखना चाहते हैं।',
    chooseRecord: 'चालान की कॉपी चुनें',
    choosePhoto: 'चालान की तस्वीर चुनें',
    remove: 'हटाएँ',
    memory: 'केवल मेमोरी में',
    openPdf: 'चुना गया PDF स्थानीय रूप से खोलें',
    inputRecord: 'इस डिवाइस से आधिकारिक रिकॉर्ड चुनें',
    inputPhoto: 'इस डिवाइस से दी गई तस्वीर चुनें',
    imageAlt: 'नागरिक द्वारा चुनी गई साक्ष्य तस्वीर का प्रीव्यू',
    pdfNote: 'नए ब्राउज़र-स्थानीय टैब में खुलता है। खासकर साझा डिवाइस पर PDF टैब स्वयं बंद करें।',
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
      meta: {
        size: file.size,
        type: validation.type,
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
        <h3 id={`${role}-title`}>{title}</h3>
        <p>{isPhotograph ? text.photoHelp : text.recordHelp}</p>
      </div>

      <input
        ref={inputRef}
        className={styles.visuallyHidden}
        tabIndex={-1}
        type="file"
        accept={ACCEPTED_RECORD_TYPES}
        aria-label={isPhotograph ? text.inputPhoto : text.inputRecord}
        disabled={disabled}
        onChange={chooseFile}
      />

      {selection ? (
        <div className={styles.selection}>
          <div className={styles.metadata}>
            <strong>{isPhotograph ? text.selectedPhotograph : text.selectedRecord}</strong>
            <span>{formatLocalRecordSize(selection.meta.size)} · {selection.meta.type} · {text.memory}</span>
            <button type="button" className={styles.remove} onClick={clearSelection} disabled={disabled}>
              {text.remove}
            </button>
          </div>

          <div className={styles.preview}>
            {selection.meta.previewKind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- The deliberate local object URL must not be routed through an image service.
              <img src={selection.previewUrl} alt={text.imageAlt} />
            ) : (
              <div className={styles.pdfOpen}>
                <a href={selection.previewUrl} target="_blank" rel="noopener noreferrer">
                  {text.openPdf}
                </a>
                <p>{text.pdfNote}</p>
              </div>
            )}
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
  const disabled = props.disabled ?? false;

  return (
    <div className={styles.intake}>
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
    </div>
  );
}
