import { connection } from 'next/server';
import {
  SYNTHETIC_EXTENSION_FIXTURE,
  createSyntheticExtensionFixtureCapsule,
} from '../../../../lib/synthetic-extension-fixture-contract';

export const dynamic = 'force-dynamic';

export function SyntheticExtensionSourceCapsule({ canonicalJson }: { canonicalJson: string }) {
  const fixture = SYNTHETIC_EXTENSION_FIXTURE.source;
  return (
    <div
      {...{ [fixture.rootAttribute]: fixture.markerValue }}
      aria-hidden="true"
      hidden
      inert
      translate="no"
    ><span
      {...{ [fixture.envelopeAttribute]: fixture.markerValue }}
      aria-hidden="true"
      inert
      translate="no"
    >{canonicalJson}</span></div>
  );
}

export default async function SyntheticExtensionFixtureSourcePage() {
  await connection();
  const capsule = createSyntheticExtensionFixtureCapsule();
  return <SyntheticExtensionSourceCapsule canonicalJson={capsule.canonicalJson} />;
}
