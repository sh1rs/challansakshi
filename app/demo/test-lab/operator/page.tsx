import { createPageMetadata } from '../../../../lib/site-seo';
import OperatorAnalysisLab from '../../../../components/test-lab/OperatorAnalysisLab';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata('/demo/test-lab/operator', {
  title: 'Controlled synthetic extraction — ChallanSakshi',
  description: 'Controlled synthetic extraction evaluation. Disabled in public production.',
  index: false,
  follow: false,
});

export default function OperatorAnalysisPage() {
  const enabled = process.env.ANALYSIS_ENABLED === 'true'
    && process.env.SYNTHETIC_UPLOADS_ENABLED === 'true';
  const disabledMessage = 'Controlled model analysis is disabled in this deployment.';

  return <OperatorAnalysisLab enabled={enabled} disabledMessage={disabledMessage} />;
}
