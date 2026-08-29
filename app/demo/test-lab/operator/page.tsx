import type { Metadata } from 'next';
import OperatorAnalysisLab from '../../../../components/test-lab/OperatorAnalysisLab';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Controlled Synthetic Extraction — ChallanSakshi',
  description: 'Feature-flagged evaluation of ChallanSakshi’s three-source observation extraction contract.',
  robots: { index: false, follow: false },
};

export default function OperatorAnalysisPage() {
  const enabled = process.env.ANALYSIS_ENABLED === 'true'
    && process.env.SYNTHETIC_UPLOADS_ENABLED === 'true';
  const disabledMessage = 'Controlled model analysis is disabled in this deployment.';

  return <OperatorAnalysisLab enabled={enabled} disabledMessage={disabledMessage} />;
}
