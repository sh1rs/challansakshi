'use client';

import RecoveryPage from '../components/shared/RecoveryPage';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecoveryPage kind="error" retry={reset} />;
}
