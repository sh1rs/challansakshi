import type { Metadata } from 'next';
import CitizenReviewApp from '../../components/public-beta/CitizenReviewApp';

export const metadata: Metadata = {
  title: 'Manual e-Challan Review — ChallanSakshi',
  description: 'A tab-memory-only e-Challan review with local record preview, citizen-confirmed structured facts, conservative evidence findings, and exact official handoff.',
};

export default function ReviewPage() { return <CitizenReviewApp />; }
