'use client';
/* eslint-disable @next/next/no-img-element -- The preview is a revocable browser-local object URL. */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CitizenFooter, CitizenHeader } from '../shared/CitizenChrome';
import {
  validateSyntheticEvidenceExtraction,
  type SyntheticEvidenceExtraction,
} from '../../lib/synthetic-evidence-pipeline';
import type { SyntheticEvaluationCase } from '../../lib/synthetic-evidence-corpus';
import { TestCaseWorkbench } from './SyntheticTestLabApp';
import styles from './OperatorAnalysisLab.module.css';

const MAX_OPERATOR_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_OPERATOR_SOURCE_BYTES = 12_000;
const allowedOperatorImageTypes = ['image/png', 'image/jpeg'];
const defaultSyntheticChallan = [
  'SYNTHETIC TEST CHALLAN — NOT A GOVERNMENT DOCUMENT',
  'Challan reference: CS-OPERATOR-2026-001',
  'Issue date: 2026-08-29',
  'Alleged registration: TEST 26 CS 3317',
  'Event timestamp: 2026-08-29 10:15 IST',
  'Location: Model Avenue, Pilot City',
  'Alleged offence: Synthetic helmet-visibility test',
  'Amount: INR 1000',
].join('\n');
const defaultSyntheticVehicleRecord = [
  'SYNTHETIC VEHICLE RECORD — NOT A GOVERNMENT DOCUMENT',
  'Registration: TEST 26 CS 3317',
  'Vehicle category: Scooter',
  'Colour: Blue',
  'Make / model: Sample Scooter',
].join('\n');

type SelectedImage = {
  file: File;
  url: string;
  size: number;
  type: string;
};

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32_768));
  }
  return btoa(binary);
}

function DisabledOperatorLab({ message }: { message: string }) {
  return (
    <div className={styles.page}>
      <CitizenHeader language="en" setLanguage={() => undefined} boundary="demo" englishOnly />
      <main className={styles.disabledMain}>
        <p className={styles.kicker}>CONTROLLED SYNTHETIC EVALUATION</p>
        <h1>{message}</h1>
        <p>The public Test Lab remains available with ten runtime cases and a browser-local manual workbench. No upload or model request is available here.</p>
        <a className={styles.secondaryButton} href="/demo/test-lab">Return to the public Test Lab</a>
      </main>
      <CitizenFooter language="en" boundary="demo" />
    </div>
  );
}

function EnabledOperatorLab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [challanText, setChallanText] = useState(defaultSyntheticChallan);
  const [vehicleRecordText, setVehicleRecordText] = useState(defaultSyntheticVehicleRecord);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [attested, setAttested] = useState(false);
  const [providerTransferAccepted, setProviderTransferAccepted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'ready'>('idle');
  const [message, setMessage] = useState('Choose a wholly synthetic PNG or JPEG to begin.');
  const [extraction, setExtraction] = useState<SyntheticEvidenceExtraction | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const challanByteLength = new TextEncoder().encode(challanText).byteLength;
  const vehicleRecordByteLength = new TextEncoder().encode(vehicleRecordText).byteLength;
  const sourceTextsWithinLimit = challanByteLength > 0
    && challanByteLength <= MAX_OPERATOR_SOURCE_BYTES
    && vehicleRecordByteLength > 0
    && vehicleRecordByteLength <= MAX_OPERATOR_SOURCE_BYTES;

  useEffect(() => () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage.url);
  }, [selectedImage]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    requestControllerRef.current?.abort('operator-input-changed');
    requestControllerRef.current = null;
  }, []);

  const extractedCase = useMemo<SyntheticEvaluationCase | null>(() => extraction ? ({
    id: `operator-extraction-${resultVersion}`,
    title: 'Live synthetic extraction — human review required',
    description: 'The model returned observations only. Correct every source value, visibility, and confidence before the deterministic engine is allowed to compare them.',
    expectedOverall: 'inconclusive',
    extraction,
  }) : null, [extraction, resultVersion]);

  const cancelPendingRequest = () => {
    requestIdRef.current += 1;
    requestControllerRef.current?.abort('operator-input-changed');
    requestControllerRef.current = null;
  };

  const invalidateResult = (nextMessage: string) => {
    cancelPendingRequest();
    setExtraction(null);
    setStatus('idle');
    setMessage(nextMessage);
  };

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    invalidateResult('Image selection changed. Choose a supported synthetic image.');
    setSelectedImage(null);
    setAttested(false);
    setProviderTransferAccepted(false);
    if (!allowedOperatorImageTypes.includes(file.type)) {
      setStatus('error');
      setMessage('Use a PNG or JPEG synthetic image. Other formats are rejected.');
      return;
    }
    if (file.size < 1 || file.size > MAX_OPERATOR_IMAGE_BYTES) {
      setStatus('error');
      setMessage('The synthetic image must be non-empty and no larger than 2 MiB.');
      return;
    }
    setSelectedImage({ file, url: URL.createObjectURL(file), size: file.size, type: file.type });
    setMessage('Preview ready. Confirm the synthetic-only boundary before extraction.');
  };

  const clearAll = () => {
    setSelectedImage(null);
    setChallanText(defaultSyntheticChallan);
    setVehicleRecordText(defaultSyntheticVehicleRecord);
    setAttested(false);
    setProviderTransferAccepted(false);
    invalidateResult('Operator inputs cleared from this page.');
  };

  const analyze = async () => {
    if (!selectedImage || !attested || !providerTransferAccepted || !sourceTextsWithinLimit) return;
    cancelPendingRequest();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = requestIdRef.current;
    setStatus('running');
    setMessage('Extracting bounded observations. No comparison is being made yet.');
    setExtraction(null);

    try {
      const base64 = await fileToBase64(selectedImage.file);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          schema: 'challansakshi.synthetic-analysis-request.v2',
          syntheticOnly: true,
          challanText,
          vehicleRecordText,
          enforcementImage: { mimeType: selectedImage.type, base64 },
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      const candidate = payload && typeof payload === 'object' && 'extraction' in payload
        ? (payload as { extraction?: unknown }).extraction
        : null;
      if (!response.ok || !validateSyntheticEvidenceExtraction(candidate)) {
        setStatus('error');
        setMessage('Extraction was unavailable or returned an unusable structure. No result was created.');
        return;
      }
      setExtraction(candidate);
      setResultVersion((value) => value + 1);
      setStatus('ready');
      setMessage('Observation extraction complete. Human review is required before comparison.');
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setStatus('error');
      setMessage('Extraction could not be completed. No result was created and no fallback facts were inserted.');
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#operator-main">Skip to operator evaluation</a>
      <CitizenHeader language="en" setLanguage={() => undefined} boundary="demo" englishOnly />
      <main id="operator-main" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.kicker}>CONTROLLED EVALUATION · BOTH SERVER FLAGS REQUIRED</p>
          <h1>Run the real extraction adapter</h1>
          <p>This feature-flagged surface keeps the synthetic challan, vehicle record, and enforcement image separate while producing source-linked observations. It does not produce a finding until a person reviews and confirms those observations.</p>
          <div className={styles.warning} role="note">
            <strong>Never enter real citizen or government data.</strong>
            <span>Feature flags are kill switches, not authentication. Run this only on localhost or in a separately access-controlled environment. The request sends both texts and the original image bytes—including any embedded metadata—through the ChallanSakshi Worker to OpenAI. API data is not used for training by default, but <code>store:false</code> is not a zero-retention guarantee.</span>
          </div>
        </header>

        <section className={styles.inputGrid} aria-labelledby="operator-input-heading">
          <div className={styles.recordCard}>
            <p className={styles.kicker}>SOURCES A + B</p>
            <h2 id="operator-input-heading">Separate synthetic records</h2>
            <label htmlFor="operator-challan">A · Wholly fictional challan text</label>
            <textarea
              id="operator-challan"
              maxLength={12_000}
              value={challanText}
              onChange={(event) => {
                setChallanText(event.target.value);
                setAttested(false);
                setProviderTransferAccepted(false);
                invalidateResult('Challan text changed. Reconfirm both boundaries.');
              }}
            />
            <small className={challanByteLength > MAX_OPERATOR_SOURCE_BYTES ? styles.byteError : undefined}>{challanByteLength.toLocaleString('en-IN')} / 12,000 UTF-8 bytes allowed by the server</small>
            <label htmlFor="operator-vehicle-record">B · Wholly fictional vehicle-record text</label>
            <textarea
              id="operator-vehicle-record"
              maxLength={12_000}
              value={vehicleRecordText}
              onChange={(event) => {
                setVehicleRecordText(event.target.value);
                setAttested(false);
                setProviderTransferAccepted(false);
                invalidateResult('Vehicle-record text changed. Reconfirm both boundaries.');
              }}
            />
            <small className={vehicleRecordByteLength > MAX_OPERATOR_SOURCE_BYTES ? styles.byteError : undefined}>{vehicleRecordByteLength.toLocaleString('en-IN')} / 12,000 UTF-8 bytes allowed by the server</small>
          </div>

          <div className={styles.imageCard}>
            <p className={styles.kicker}>SOURCE C</p>
            <h2>Synthetic enforcement image</h2>
            <input ref={inputRef} className={styles.hiddenInput} tabIndex={-1} type="file" accept="image/png,image/jpeg" onChange={chooseImage} />
            {selectedImage ? (
              <>
                <img src={selectedImage.url} alt="Controlled local preview of the selected synthetic enforcement evidence" />
                <p>Preview ready · filename hidden · {(selectedImage.size / 1024).toFixed(0)} KiB · {selectedImage.type}</p>
                <button className={styles.secondaryButton} type="button" onClick={() => inputRef.current?.click()}>Replace synthetic image</button>
              </>
            ) : (
              <button className={styles.primaryButton} type="button" onClick={() => inputRef.current?.click()}>Choose synthetic PNG or JPEG</button>
            )}
          </div>
        </section>

        <section className={styles.confirmation} aria-labelledby="operator-confirm-heading">
          <h2 id="operator-confirm-heading">Confirm the boundary before sending</h2>
          <label>
            <input type="checkbox" checked={attested} onChange={(event) => {
              const checked = event.target.checked;
              setAttested(checked);
              if (!checked) invalidateResult('Synthetic-only confirmation cleared. No pending or previous result can be used.');
            }} />
            <span><b>I confirm all three sources are wholly synthetic.</b> They contain no real name, face, plate, address, QR code, account, challan, vehicle, location, or authority record.</span>
          </label>
          <label>
            <input type="checkbox" checked={providerTransferAccepted} onChange={(event) => {
              const checked = event.target.checked;
              setProviderTransferAccepted(checked);
              if (!checked) invalidateResult('Provider-transfer consent cleared. No pending or previous result can be used.');
            }} />
            <span><b>I understand these supplied bytes will be sent to OpenAI.</b> The original file may contain metadata, and <code>store:false</code> does not promise zero abuse-monitoring retention.</span>
          </label>
          <div className={styles.actions}>
            <button className={styles.primaryButton} type="button" disabled={!selectedImage || !attested || !providerTransferAccepted || !sourceTextsWithinLimit || status === 'running'} onClick={analyze}>{status === 'running' ? 'Extracting observations…' : 'Extract observations'}</button>
            <button className={styles.secondaryButton} type="button" onClick={clearAll}>Clear operator inputs</button>
            <a className={styles.secondaryButton} href="/demo/test-lab">Public Test Lab</a>
          </div>
          <p className={status === 'error' ? styles.error : styles.status} role="status">{message}</p>
        </section>

        {extractedCase ? <TestCaseWorkbench key={extractedCase.id} testCase={extractedCase} /> : (
          <section className={styles.locked}>
            <strong>Comparison locked</strong>
            <p>First extract observations. Then inspect and correct every field in the Evidence stage and explicitly confirm it. AI never supplies the final finding or route.</p>
          </section>
        )}
      </main>
      <CitizenFooter language="en" boundary="demo" />
    </div>
  );
}

export default function OperatorAnalysisLab({ enabled, disabledMessage }: { enabled: boolean; disabledMessage: string }) {
  return enabled ? <EnabledOperatorLab /> : <DisabledOperatorLab message={disabledMessage} />;
}
