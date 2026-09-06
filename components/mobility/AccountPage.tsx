'use client';
import { useState } from 'react';
import { PublicBetaShell } from '../public-beta/PublicBetaShell';
import AccountPanel from './AccountPanel';
export default function AccountPage() {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  return <PublicBetaShell language={language} setLanguage={setLanguage} service="ChallanSakshi" serviceHindi="आपका खाता" onQuickExit={() => window.location.replace('/')}><main style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 64px' }}><AccountPanel language={language} /></main></PublicBetaShell>;
}
