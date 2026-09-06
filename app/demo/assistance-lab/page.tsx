import type { Metadata } from 'next';
import AssistanceLab from '../../../components/mobility/AssistanceLab';

export const metadata: Metadata = {
  title: 'Synthetic assistance lab — ChallanSakshi',
  description: 'Practise citizen-controlled approval, private input isolation and receipt recovery in a local synthetic portal. No real payment or government action.',
};

export default function AssistanceLabPage() { return <AssistanceLab />; }
