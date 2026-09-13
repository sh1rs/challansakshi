import { createPageMetadata } from '../../../lib/site-seo';
import AssistanceLab from '../../../components/mobility/AssistanceLab';

export const metadata = createPageMetadata('/demo/assistance-lab', {
  title: 'Synthetic assistance lab — ChallanSakshi',
  description: 'Practise a fictional citizen-controlled portal journey. No real payment or government action.',
  index: false,
});

export default function AssistanceLabPage() { return <AssistanceLab />; }
