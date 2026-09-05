/* eslint-disable @next/next/no-img-element -- Same-origin generated scene atlas; no external image service. */
import type { SyntheticEvidenceExtraction, SyntheticObservation } from '../../lib/synthetic-evidence-pipeline';
import styles from './SyntheticSourceVisuals.module.css';

type Vehicle = SyntheticEvidenceExtraction['vehicle_record'];

type Scene = { id: string; plate: string; crop: [number, number, number, number] };

// Each lossless WebP is pixel-identical to its hand-inspected 627px atlas panel.
// Only the selected panel downloads, not the entire 2.8MB atlas. Selection is
// from ORIGINAL fixture observations; no plate is drawn with HTML text.
function sceneFor(vehicle: Vehicle): Scene | null {
  const plate = vehicle.registration.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const car = /car|hatchback|four.wheeler/i.test(vehicle.vehicle_category.value);
  const white = /white/i.test(vehicle.colour.value);
  if (!car && !white && vehicle.registration.visibility === 'unclear') return { id: 'blue-unreadable', plate: 'unreadable', crop: [99, 294, 190, 140] };
  if (!car && !white && vehicle.registration.visibility === 'partial' && plate === '3317') return { id: 'blue-partial-3317', plate, crop: [83, 413, 175, 110] };
  if (vehicle.registration.visibility !== 'clear') return null;
  if (!car && !white && plate === 'KA01AB3817') return { id: 'blue-clear-3817', plate, crop: [83, 412, 175, 110] };
  if (plate !== 'KA01AB3317') return null;
  if (car) return white
    ? { id: 'white-car-3317', plate, crop: [39, 308, 185, 110] }
    : { id: 'grey-car-3317', plate, crop: [53, 307, 185, 110] };
  return white
    ? { id: 'white-scooter-3317', plate, crop: [77, 398, 185, 125] }
    : { id: 'blue-clear-3317', plate, crop: [83, 412, 175, 110] };
}

export function SyntheticScene({ vehicle, compact = false, metadata }: { vehicle: Vehicle; compact?: boolean; metadata?: { timestamp: string; location: string } }) {
  const car = /car|hatchback|four.wheeler/i.test(vehicle.vehicle_category.value);
  const white = /white/i.test(vehicle.colour.value);
  const description = `${car ? (white ? 'white' : 'grey') : (white ? 'white' : 'blue')} ${car ? 'hatchback' : 'scooter'}`;
  const scene = sceneFor(vehicle);
  if (!scene) return <p className={styles.unavailable}>No matching bundled photograph for these observations.</p>;
  const source = `/demo-plates/${scene.id}-v2.webp`;
  const [cropX, cropY, cropWidth, cropHeight] = scene.crop;
  const cropStyle = { aspectRatio: `${cropWidth} / ${cropHeight}` };
  const imageCropStyle = { width: `${627 / cropWidth * 100}%`, left: `${-cropX / cropWidth * 100}%`, top: `${-cropY / cropHeight * 100}%` };
  const plateDescription = scene.plate === 'unreadable' ? 'plate unreadable' : scene.plate === '3317' ? 'only plate suffix 3317 is visible; prefix obscured' : `plate ${scene.plate}`;
  const alt = `Synthetic photo of a ${description}; ${plateDescription}`;
  return (
    <figure className={`${styles.photo} ${compact ? styles.compact : ''}`} data-synthetic-photo data-scene-id={scene.id} data-image-registration={scene.plate} aria-label={`Synthetic photo: ${description}, ${plateDescription}`}>
      <div className={styles.scene}>
        <img src={source} width={627} height={627} loading="lazy" decoding="async" alt={alt} />
        <span className={styles.sceneLabel}>SYNTHETIC TEST PHOTO</span>
        {metadata && <div className={styles.metadata}><span>FICTIONAL OVERLAY</span>{metadata.timestamp}<br />{metadata.location}</div>}
      </div>
      <div className={styles.plateDetail}>
        <span>Plate detail · same photo</span>
        <div className={styles.plateCrop} style={cropStyle} data-plate-pixel-crop>
          <img src={source} width={627} height={627} loading="lazy" decoding="async" style={imageCropStyle} alt={`Enlarged original pixels: ${alt}`} />
        </div>
      </div>
      {!compact && <figcaption>Synthetic test photo · pre-authored observations, not a live AI reading.</figcaption>}
    </figure>
  );
}

function Value({ label, observation }: { label: string; observation: SyntheticObservation }) {
  return <div><dt>{label}</dt><dd>{observation.value || 'Not supplied'}{observation.visibility !== 'clear' && <small>{observation.visibility}</small>}</dd></div>;
}

export function SyntheticSourceBundle({ extraction }: { extraction: SyntheticEvidenceExtraction }) {
  const challan = extraction.challan_document;
  const vehicle = extraction.vehicle_record;
  const observed = extraction.enforcement_image;
  return (
    <section className={styles.bundle} data-synthetic-source-bundle aria-label="Original fictional source bundle">
      <div className={styles.intro}><strong>See the original synthetic case</strong><span>Source cards stay unchanged when you edit the observations below.</span></div>
      <div className={styles.sourceGrid}>
        <article className={styles.document}>
          <header><span>01 · FICTIONAL RECORD</span><h4>Fictional challan</h4></header>
          <dl><Value label="Reference" observation={challan.challan_number} /><Value label="Registration" observation={challan.alleged_registration} /><Value label="Allegation" observation={challan.alleged_offence} /><Value label="Amount" observation={challan.amount} /><Value label="Recorded time" observation={challan.timestamp} /><Value label="Recorded place" observation={challan.location} /></dl>
          <footer>Authored test record · not government-issued</footer>
        </article>
        <article className={styles.document}>
          <header><span>02 · FICTIONAL RECORD</span><h4>Fictional vehicle record</h4></header>
          <dl><Value label="Registration" observation={vehicle.registration} /><Value label="Vehicle" observation={vehicle.vehicle_category} /><Value label="Make / model" observation={vehicle.make_model} /><Value label="Colour" observation={vehicle.colour} /></dl>
          <footer>Authored reference · not proof of ownership</footer>
        </article>
        <article className={styles.observation}>
          <header><span>03 · SYNTHETIC PHOTO</span><h4>Fictional image observations</h4></header>
          <SyntheticScene vehicle={observed} metadata={{ timestamp: observed.timestamp.value, location: observed.location.value }} />
          <dl><Value label="Authored plate observation" observation={observed.registration} /><Value label="Test time / overlay" observation={observed.timestamp} /><Value label="Test location / overlay" observation={observed.location} /></dl>
        </article>
      </div>
    </section>
  );
}
