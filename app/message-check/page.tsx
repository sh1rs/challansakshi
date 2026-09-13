import { publicPageMetadata } from '../../lib/site-seo';
import MessageSafetyCheck from '../../components/public-beta/MessageSafetyCheck';
export const metadata = publicPageMetadata('/message-check');
export default function MessageCheckPage() { return <MessageSafetyCheck />; }
