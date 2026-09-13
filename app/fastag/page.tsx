import { publicPageMetadata } from '../../lib/site-seo';
import TollSakshiApp from '../../components/public-beta/TollSakshiApp';

export const metadata = publicPageMetadata('/fastag');

export default function FastagPage() { return <TollSakshiApp />; }
