import type { Metadata } from 'next';
import { SafetyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata: Metadata = { title: 'Safety & Official Routes — ChallanSakshi', description: 'Verified e-Challan, FASTag issuer, 1033, cybercrime, NPCI, NHAI, and RBI route boundaries.' };
export default function Page() { return <SafetyPage />; }
