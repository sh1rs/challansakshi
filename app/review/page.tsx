import type { Metadata } from 'next';
import CitizenReviewApp from '../../components/public-beta/CitizenReviewApp';

export const metadata: Metadata = {
  title: 'Manual e-Challan Review — ChallanSakshi',
  description: 'A tab-memory-only, no-upload, no-AI self-review for recording masked observations from an official e-Challan and preparing a conservative worksheet.',
};

export default function ReviewPage() { return <CitizenReviewApp />; }
