import type { Metadata } from 'next';
import MessageSafetyCheck from '../../components/public-beta/MessageSafetyCheck';
export const metadata: Metadata = { title: 'Check a Challan Message — ChallanSakshi', description: 'Check pasted SMS and messages locally for common warning signs, with an independent official route. No message upload or link opening.' };
export default function MessageCheckPage() { return <MessageSafetyCheck />; }
