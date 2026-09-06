'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MOBILITY_STORE_EVENT, readProfile, saveProfile } from '../../lib/mobility/store';
import { validateProfile, type MobilityProfile } from '../../lib/mobility/cases';

type Language = 'en' | 'hi';
type RemoteProfile = { value: MobilityProfile; revision: number };
type Operation = 'review-device' | 'load-account' | 'save-account' | 'save-device' | 'delete-account';

const sectionStyle: CSSProperties = { borderTop: '1px solid var(--border-soft, #d6e3df)', display: 'grid', gap: 14, marginTop: 8, paddingTop: 20, minWidth: 0 };
const actionRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10 };
const previewStyle: CSSProperties = { background: 'var(--surface-soft, #f6faf9)', border: '1px solid var(--border-soft, #d6e3df)', borderRadius: 14, display: 'grid', gap: 12, minWidth: 0, padding: 16 };
const definitionStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(84px, 0.35fr) minmax(0, 1fr)', gap: '8px 14px', margin: 0 };
const termStyle: CSSProperties = { color: 'var(--muted, #526f67)', fontWeight: 650 };
const definitionValueStyle: CSSProperties = { margin: 0, overflowWrap: 'anywhere' };
const vehicleListStyle: CSSProperties = { display: 'grid', gap: 8, listStyle: 'none', margin: 0, padding: 0 };
const vehicleStyle: CSSProperties = { borderLeft: '3px solid var(--border, #9bb5ac)', minWidth: 0, overflowWrap: 'anywhere', paddingLeft: 12 };

class ProfileRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(`Profile account request failed with status ${status}.`);
  }
}

async function accountRequest(accountId: string, method = 'GET', payload?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch('/api/account/profile', {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Mobility-Account': accountId, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (response.status === 401) throw new ProfileRequestError(401);
  const parsed: unknown = await response.json();
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ProfileRequestError(response.status || 500);
  if (!response.ok) throw new ProfileRequestError(response.status, typeof (parsed as Record<string, unknown>).code === 'string' ? (parsed as { code: string }).code : undefined);
  return parsed as Record<string, unknown>;
}

async function readAccountProfile(accountId: string): Promise<RemoteProfile | null> {
  const response = await accountRequest(accountId);
  const record = response.profile;
  if (record === null) return null;
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid account profile response.');
  const candidate = record as Record<string, unknown>;
  if (!Number.isSafeInteger(candidate.revision) || (candidate.revision as number) < 1) throw new Error('Invalid account profile revision.');
  return { value: validateProfile(candidate.value), revision: candidate.revision as number };
}

function ProfilePreview({ profile, language }: { profile: MobilityProfile; language: Language }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  return <div>
    <dl style={definitionStyle}>
      <dt style={termStyle}>{t('Name', 'नाम')}</dt>
      <dd style={definitionValueStyle}>{profile.name || t('Not provided', 'नहीं दिया गया')}</dd>
      <dt style={termStyle}>{t('Address', 'पता')}</dt>
      <dd style={definitionValueStyle}>{profile.address || t('Not provided', 'नहीं दिया गया')}</dd>
      <dt style={termStyle}>{t('Language', 'भाषा')}</dt>
      <dd style={definitionValueStyle}>{profile.language === 'hi' ? t('Hindi', 'हिन्दी') : t('English', 'अंग्रेज़ी')}</dd>
    </dl>
    <h3>{t('Vehicles', 'वाहन')}</h3>
    {profile.vehicles.length === 0
      ? <p>{t('No vehicles saved.', 'कोई वाहन सहेजा नहीं गया।')}</p>
      : <ul style={vehicleListStyle}>{profile.vehicles.map((vehicle) => <li style={vehicleStyle} key={vehicle.id}><strong>{vehicle.label}</strong><br /><span>{vehicle.registration}</span></li>)}</ul>}
  </div>;
}

export default function ProfileAccountPanel({ accountId, language, disabled = false, onAccountChanged }: { accountId: string; language: Language; disabled?: boolean; onAccountChanged?: () => void }) {
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [busy, setBusy] = useState<Operation | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [localReview, setLocalReview] = useState<MobilityProfile | null>(null);
  const [remote, setRemote] = useState<RemoteProfile | null>(null);
  const [privateDeviceConfirmed, setPrivateDeviceConfirmed] = useState(false);
  const [accountChanged, setAccountChanged] = useState(false);
  const sourceGeneration = useRef(0);
  const unavailable = disabled || accountChanged;

  useEffect(() => {
    const changed = (event: Event) => {
      const area = (event as CustomEvent<{ area?: string }>).detail?.area;
      if (area !== 'profile' && area !== 'all') return;
      sourceGeneration.current += 1;
      setLocalReview(null);
      setPrivateDeviceConfirmed(false);
      setMessage(language === 'hi' ? 'डिवाइस की प्रोफ़ाइल बदल गई। खाते में सहेजने से पहले मौजूदा जानकारी फिर जाँचें।' : 'Your device profile changed. Review its current details again before saving to your account.');
    };
    window.addEventListener(MOBILITY_STORE_EVENT, changed);
    return () => { sourceGeneration.current += 1; window.removeEventListener(MOBILITY_STORE_EVENT, changed); };
  }, [language]);

  const requestNewSourceReview = () => {
    setLocalReview(null);
    setPrivateDeviceConfirmed(false);
    setError(t('Your device profile changed or was deleted. Nothing was uploaded. Review the current reusable details before saving.', 'डिवाइस की प्रोफ़ाइल बदल गई या मिटा दी गई। कुछ अपलोड नहीं हुआ। सहेजने से पहले दोबारा उपयोग की मौजूदा जानकारी जाँचें।'));
  };

  const recoverAccountChange = (cause: unknown) => {
    if (!(cause instanceof ProfileRequestError) || !(cause.status === 401 || (cause.status === 409 && cause.code === 'account-changed'))) return false;
    setLocalReview(null);
    setRemote(null);
    setPrivateDeviceConfirmed(false);
    setMessage('');
    setError(t('Your signed-in account changed. Review the current account before continuing.', 'साइन इन किया खाता बदल गया। आगे बढ़ने से पहले मौजूदा खाता जाँचें।'));
    setAccountChanged(true);
    onAccountChanged?.();
    return true;
  };

  const start = (operation: Operation) => {
    setBusy(operation);
    setError('');
    setMessage('');
  };

  const reviewLocal = async () => {
    if (busy || unavailable) return;
    const generation = sourceGeneration.current;
    start('review-device');
    try {
      // Read the current account revision before exposing the final save action.
      const latest = await readAccountProfile(accountId);
      if (generation !== sourceGeneration.current) { requestNewSourceReview(); return; }
      const local = readProfile();
      setRemote(latest);
      setPrivateDeviceConfirmed(false);
      setLocalReview(local);
      if (!local) setMessage(t('No reusable details are saved on this device.', 'इस डिवाइस पर दोबारा उपयोग की जानकारी सहेजी नहीं गई है।'));
    } catch (cause) {
      if (recoverAccountChange(cause)) return;
      setLocalReview(null);
      setError(t('Could not load the current account revision. Nothing was uploaded. Try again before reviewing a save.', 'खाते का नया संशोधन नहीं खुल सका। कुछ अपलोड नहीं हुआ। सहेजने की समीक्षा से पहले फिर कोशिश करें।'));
    } finally {
      setBusy(null);
    }
  };

  const loadRemote = async () => {
    if (busy || unavailable) return;
    start('load-account');
    try {
      const latest = await readAccountProfile(accountId);
      setRemote(latest);
      setLocalReview(null);
      setPrivateDeviceConfirmed(false);
      if (!latest) setMessage(t('No reusable details are saved in your account.', 'आपके खाते में दोबारा उपयोग की जानकारी सहेजी नहीं गई है।'));
    } catch (cause) {
      if (recoverAccountChange(cause)) return;
      setRemote(null);
      setError(t('Could not load reusable details from your account. Your device details were not changed.', 'खाते से दोबारा उपयोग की जानकारी नहीं खुल सकी। डिवाइस की जानकारी नहीं बदली।'));
    } finally {
      setBusy(null);
    }
  };

  const reloadAfterConflict = async (action: 'saving' | 'deleting') => {
    try {
      setRemote(await readAccountProfile(accountId));
      setError(action === 'saving'
        ? t('Your account profile changed on another device. The latest revision was loaded. Review your device details again before saving.', 'खाते की प्रोफ़ाइल दूसरे डिवाइस पर बदली। नया संशोधन खुल गया है। सहेजने से पहले डिवाइस की जानकारी फिर जाँचें।')
        : t('Your account profile changed on another device. The latest revision was loaded. Review it before deleting.', 'खाते की प्रोफ़ाइल दूसरे डिवाइस पर बदली। नया संशोधन खुल गया है। मिटाने से पहले इसे फिर जाँचें।'));
    } catch (cause) {
      if (recoverAccountChange(cause)) return;
      setRemote(null);
      setError(t('Your account profile changed and the latest revision could not be loaded. Reload before trying again.', 'खाते की प्रोफ़ाइल बदल गई और नया संशोधन नहीं खुल सका। फिर कोशिश से पहले पेज दोबारा खोलें।'));
    }
  };

  const saveToAccount = async () => {
    if (busy || unavailable || !localReview) return;
    start('save-account');
    try {
      // Recheck at the upload boundary even if a storage event has not arrived.
      const current = readProfile();
      if (!current || JSON.stringify(current) !== JSON.stringify(localReview)) { requestNewSourceReview(); return; }
      const response = await accountRequest(accountId, 'PUT', { value: localReview, revision: remote?.revision ?? 0 });
      if (!Number.isSafeInteger(response.revision) || (response.revision as number) < 1) throw new Error('Invalid saved profile revision.');
      setRemote({ value: localReview, revision: response.revision as number });
      setLocalReview(null);
      setMessage(t('Reusable details saved to your account.', 'दोबारा उपयोग की जानकारी खाते में सहेजी गई।'));
    } catch (cause) {
      if (recoverAccountChange(cause)) return;
      setLocalReview(null);
      if (cause instanceof ProfileRequestError && cause.status === 409) {
        await reloadAfterConflict('saving');
      } else {
        setError(t('Could not save reusable details to your account. Nothing on this device was changed.', 'दोबारा उपयोग की जानकारी खाते में सहेजी नहीं जा सकी। इस डिवाइस पर कुछ नहीं बदला।'));
      }
    } finally {
      setBusy(null);
    }
  };

  const saveToDevice = () => {
    if (busy || unavailable || !remote || !privateDeviceConfirmed) return;
    start('save-device');
    try {
      const localCopy = validateProfile({ ...remote.value, updatedAt: new Date().toISOString() });
      saveProfile(localCopy);
      setPrivateDeviceConfirmed(false);
      setMessage(t('Account reusable details saved on this private device. Existing cases were not changed.', 'खाते की दोबारा उपयोग की जानकारी इस निजी डिवाइस पर सहेजी गई। मौजूदा केस नहीं बदले।'));
    } catch {
      setError(t('Could not save the account profile on this device. The existing reusable profile remains available.', 'खाते की प्रोफ़ाइल इस डिवाइस पर सहेजी नहीं जा सकी। मौजूदा दोबारा उपयोग की प्रोफ़ाइल उपलब्ध है।'));
    } finally {
      setBusy(null);
    }
  };

  const deleteRemote = async () => {
    if (busy || unavailable || !remote) return;
    start('delete-account');
    try {
      await accountRequest(accountId, 'DELETE', { revision: remote.revision });
      setRemote(null);
      setLocalReview(null);
      setPrivateDeviceConfirmed(false);
      setMessage(t('Reusable details deleted from your account. The private-device copy remains.', 'दोबारा उपयोग की जानकारी खाते से मिटाई गई। निजी डिवाइस की प्रति बनी हुई है।'));
    } catch (cause) {
      if (recoverAccountChange(cause)) return;
      if (cause instanceof ProfileRequestError && cause.status === 409) {
        await reloadAfterConflict('deleting');
      } else {
        setError(t('Could not delete reusable details from your account. Reload the account copy before trying again.', 'दोबारा उपयोग की जानकारी खाते से नहीं मिट सकी। फिर कोशिश से पहले खाते की प्रति दोबारा खोलें।'));
      }
    } finally {
      setBusy(null);
    }
  };

  return <section style={sectionStyle} aria-labelledby="account-profile-heading">
    <h2 id="account-profile-heading">{t('Reusable profile across devices', 'डिवाइसों पर दोबारा उपयोग की प्रोफ़ाइल')}</h2>
    <p>{t('Profile transfers are separate from cases. Review every reusable field before moving it; existing cases and official services are never changed.', 'प्रोफ़ाइल का लेन-देन केस से अलग है। जानकारी भेजने से पहले हर दोबारा उपयोग वाले विवरण की जाँच करें; मौजूदा केस और आधिकारिक सेवाएँ कभी नहीं बदलतीं।')}</p>
    <div style={actionRowStyle}>
      <button disabled={unavailable || busy !== null} onClick={() => void reviewLocal()}>{busy === 'review-device' ? t('Loading current revision…', 'नया संशोधन खुल रहा है…') : t('Review reusable details on this device', 'इस डिवाइस की दोबारा उपयोग की जानकारी जाँचें')}</button>
      <button disabled={unavailable || busy !== null} onClick={() => void loadRemote()}>{busy === 'load-account' ? t('Loading account details…', 'खाते की जानकारी खुल रही है…') : t('Load reusable details from my account', 'मेरे खाते से दोबारा उपयोग की जानकारी खोलें')}</button>
    </div>

    {localReview ? <div style={previewStyle} role="region" aria-label={t('Review reusable details for account save', 'खाते में सहेजने के लिए दोबारा उपयोग की जानकारी जाँचें')}>
      <h3>{t('Device details to save', 'सहेजने के लिए डिवाइस की जानकारी')}</h3>
      <ProfilePreview profile={localReview} language={language} />
      <p>{remote ? t('Saving will replace the current account profile only after its revision is checked.', 'संशोधन जाँचने के बाद सहेजने से खाते की मौजूदा प्रोफ़ाइल बदलेगी।') : t('Saving will create a reusable profile in your account.', 'सहेजने से आपके खाते में दोबारा उपयोग की प्रोफ़ाइल बनेगी।')}</p>
      <button disabled={unavailable || busy !== null} onClick={() => void saveToAccount()}>{busy === 'save-account' ? t('Saving…', 'सहेजा जा रहा है…') : t('Save these reusable details to my account', 'दोबारा उपयोग की यह जानकारी मेरे खाते में सहेजें')}</button>
      <button disabled={unavailable || busy !== null} onClick={() => setLocalReview(null)}>{t('Cancel account save', 'खाते में सहेजना रद्द करें')}</button>
    </div> : null}

    {remote ? <div style={previewStyle} role="region" aria-label={t('Account reusable details', 'खाते की दोबारा उपयोग की जानकारी')}>
      <h3>{t('Account copy', 'खाते की प्रति')}</h3>
      <ProfilePreview profile={remote.value} language={language} />
      <p>{t('This will replace the reusable profile currently saved in this browser. Saved cases will not change.', 'इससे इस ब्राउज़र में सहेजी दोबारा उपयोग की प्रोफ़ाइल बदलेगी। सहेजे गए केस नहीं बदलेंगे।')}</p>
      <label><input type="checkbox" checked={privateDeviceConfirmed} disabled={unavailable || busy !== null} onChange={(event) => setPrivateDeviceConfirmed(event.target.checked)} />{t('This is my private device. Replace its reusable profile with the account copy.', 'यह मेरा निजी डिवाइस है। इसकी दोबारा उपयोग की प्रोफ़ाइल खाते की प्रति से बदलें।')}</label>
      <button disabled={unavailable || busy !== null || !privateDeviceConfirmed} onClick={saveToDevice}>{busy === 'save-device' ? t('Saving on this device…', 'इस डिवाइस पर सहेजा जा रहा है…') : t('Replace reusable details on this private device', 'इस निजी डिवाइस पर दोबारा उपयोग की जानकारी बदलें')}</button>
      <details>
        <summary>{t('Remove account reusable details', 'खाते की दोबारा उपयोग की जानकारी हटाएँ')}</summary>
        <p>{t('This deletes only the account profile. Device profiles and saved cases remain.', 'यह केवल खाते की प्रोफ़ाइल मिटाता है। डिवाइस प्रोफ़ाइल और सहेजे केस बने रहते हैं।')}</p>
        <button disabled={unavailable || busy !== null} onClick={() => void deleteRemote()}>{busy === 'delete-account' ? t('Deleting…', 'मिटाया जा रहा है…') : t('Delete reusable details from my account', 'मेरे खाते से दोबारा उपयोग की जानकारी मिटाएँ')}</button>
      </details>
    </div> : null}

    {error ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
