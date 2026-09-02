import type { Metadata } from 'next';
import CitizenReviewApp from '../../components/public-beta/CitizenReviewApp';

export const metadata: Metadata = {
  title: 'Manual e-Challan Review — ChallanSakshi',
  description: 'A tab-memory-only e-Challan review with local preview, citizen-confirmed facts, conservative findings, and a confirmed official-service handoff.',
};

export default function ReviewPage() { return <CitizenReviewApp />; }
