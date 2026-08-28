import type { Metadata } from 'next';
import { SafetyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata: Metadata = { title: 'Safety & Official Routes — ChallanSakshi', description: 'Official e-Challan and FASTag routes, credential warnings, and the no-payment, no-submission, no-government-API boundary.' };
export default function Page() { return <SafetyPage />; }
