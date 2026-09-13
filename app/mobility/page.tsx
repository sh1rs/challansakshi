import { publicPageMetadata } from '../../lib/site-seo';
import MobilityWorkspace from '../../components/mobility/MobilityWorkspace';

export const metadata = publicPageMetadata('/mobility');

export default function MobilityPage() { return <MobilityWorkspace />; }
