# ChallanSakshi Citizen Evidence and Resolution Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic root experience with a clean citizen homepage and extend the real e-Challan journey with a deliberate local-only official-record preview, source/confidence findings, a citizen-recorded timeline, and a local evidence summary.

**Architecture:** Keep the existing synthetic application intact at `/demo`. Real citizen files stay inside a dedicated client-only intake component and never enter a server, persistence API, URL, or the synthetic AI route. Pure TypeScript modules validate local file metadata and translate the existing conservative e-Challan assessment into a shared evidence presentation, timeline, and summary contract.

**Tech Stack:** Next.js-compatible Vinext, React 19, TypeScript 5.9, CSS Modules, Vitest 4, Cloudflare Workers build target.

**Spec:** `docs/superpowers/specs/2026-08-28-challansakshi-citizen-resolution-layer-design.md`

## Global Constraints

- The normal citizen route is `/`; the synthetic showcase is `/demo`; real e-Challan review remains `/review`; FASTag remains `/fastag`.
- Never request, receive, store, relay, or auto-fill a government password, CAPTCHA, OTP, Aadhaar or VID detail, department credential, payment credential, card detail, CVV, UPI PIN, or banking/FASTag password.
- Real citizen files are memory-only and must never reach `fetch`, XMLHttpRequest, `sendBeacon`, a server action, `/api/analyze`, localStorage, sessionStorage, IndexedDB, cookies, Cache API, analytics, logs, or URL state.
- Use `URL.createObjectURL` only after validation and call `URL.revokeObjectURL` on replace, remove, reset, Quick Exit, and unmount.
- Accepted file MIME types are exactly `application/pdf`, `image/jpeg`, `image/png`, and `image/webp`; maximum size is exactly `12 * 1024 * 1024` bytes; zero-byte files are rejected.
- The initial release previews selected files locally and does not claim OCR, model extraction, document authentication, government API access, filing, payment, or authority acknowledgement.
- Citizen-entered facts must be confirmed before comparison; confidence measures visibility, not source authenticity.
- Preserve the deterministic safety gates in `lib/public-challan.ts`, including the readable-own-record requirement, colour-only refusal, unclear-evidence route, and consistent-record refusal to manufacture a dispute.
- Shared/public device mode disables in-app download, clipboard, and print actions.
- English and Hindi remain the only selectable languages; every new safety, privacy, limitation, result, and action string must ship in both languages. Simple Mode may change presentation copy but never rule outcomes.
- Keep the existing synthetic demo modules and `/api/analyze` fixture-only contract unchanged apart from routing the app to `/demo`.
- Use the written spec for behavior and visible copy. Use the three PNG concepts in `docs/superpowers/specs/assets/` for layout, hierarchy, palette, typography character, icon weight, and responsive composition.
- The main background is true white `#FFFFFF`; do not replace it with cream, ivory, beige, or warm gray.
- No above-the-fold eyebrow, pretitle, badge, metric, login control, upload control, government seal, stock photo, glassmorphism, decorative gradient blob, neon glow, or bento dashboard.
- Use the bundled Node executable for all verification: `/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
- Do not run `pnpm install` or purge `node_modules`; the checkout already has a complete dependency tree and its baseline is 13 test files / 141 tests passing with the bundled Node runtime.

---

### Task 1: Citizen homepage and real/demo route separation

**Files:**
- Create: `lib/citizen-home.ts`
- Create: `tests/citizen-home.test.ts`
- Create: `components/public-beta/CitizenHome.tsx`
- Create: `components/public-beta/CitizenHome.module.css`
- Create: `app/demo/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/public-beta/PublicBetaShell.tsx`

**Interfaces:**
- Produces: `CitizenGoal`, `HOME_ACTIONS`, `SITUATION_LINKS`, `buildReviewHref(goal)`, and `parseCitizenGoal(search)` from `lib/citizen-home.ts`.
- Produces: a server-light `/` route rendering `CitizenHome` and a `/demo` route rendering the unchanged `ChallanSakshiApp`.
- Consumed by Task 4: `parseCitizenGoal()` and the four `CitizenGoal` values.

- [ ] **Step 1: Write the failing homepage-domain test**

Create `tests/citizen-home.test.ts` with literal expectations that would fail if a goal is omitted, mapped to a sensitive URL, or parsed from an unsupported value:

```ts
import { describe, expect, it } from 'vitest';
import { HOME_ACTIONS, SITUATION_LINKS, buildReviewHref, parseCitizenGoal } from '../lib/citizen-home';

describe('citizen homepage routing', () => {
  it('exposes the four approved citizen goals in order', () => {
    expect(HOME_ACTIONS.map((item) => [item.goal, item.title, item.cta])).toEqual([
      ['verify', 'Verify', 'Find the official record'],
      ['understand', 'Understand', 'Explain my situation'],
      ['evidence', 'Check evidence', 'Compare the evidence'],
      ['resolve', 'Resolve', 'Show my next step'],
    ]);
  });

  it('routes only a non-sensitive goal to review', () => {
    expect(buildReviewHref('verify')).toBe('/review?goal=verify');
    expect(buildReviewHref('resolve')).toBe('/review?goal=resolve');
  });

  it('rejects unknown query values without echoing them', () => {
    expect(parseCitizenGoal('?goal=evidence')).toBe('evidence');
    expect(parseCitizenGoal('?goal=vehicle%3DDL01AB1234')).toBeNull();
    expect(parseCitizenGoal('?challan=123')).toBeNull();
  });

  it('keeps every situation shortcut inside the bounded review or safety routes', () => {
    expect(SITUATION_LINKS.map((item) => item.href)).toEqual([
      '/review?goal=verify',
      '/review?goal=evidence',
      '/review?goal=resolve',
      '/review?goal=resolve',
      '/review?goal=understand',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/citizen-home.test.ts
```

Expected: FAIL because `lib/citizen-home.ts` does not exist.

- [ ] **Step 3: Implement the homepage domain**

Create `lib/citizen-home.ts` with these exact public types and values:

```ts
export type CitizenGoal = 'verify' | 'understand' | 'evidence' | 'resolve';

export type CitizenHomeAction = {
  goal: CitizenGoal;
  title: string;
  question: string;
  cta: string;
};

export const HOME_ACTIONS: readonly CitizenHomeAction[] = [
  { goal: 'verify', title: 'Verify', question: 'Is this challan actually connected to you or your vehicle?', cta: 'Find the official record' },
  { goal: 'understand', title: 'Understand', question: 'What does this notice, status, or Virtual Court update mean?', cta: 'Explain my situation' },
  { goal: 'evidence', title: 'Check evidence', question: 'Does the supplied evidence agree with the record and your vehicle?', cta: 'Compare the evidence' },
  { goal: 'resolve', title: 'Resolve', question: 'What is the safest official next step?', cta: 'Show my next step' },
] as const;

export const SITUATION_LINKS = [
  { label: 'I do not recognise this challan', href: '/review?goal=verify' },
  { label: 'The photograph may show another vehicle', href: '/review?goal=evidence' },
  { label: 'I already paid', href: '/review?goal=resolve' },
  { label: 'My grievance was rejected', href: '/review?goal=resolve' },
  { label: 'My case moved to Virtual Court', href: '/review?goal=understand' },
] as const;

const goals = new Set<CitizenGoal>(['verify', 'understand', 'evidence', 'resolve']);

export function buildReviewHref(goal: CitizenGoal): string {
  return `/review?goal=${goal}`;
}

export function parseCitizenGoal(search: string): CitizenGoal | null {
  const value = new URLSearchParams(search).get('goal');
  return value && goals.has(value as CitizenGoal) ? value as CitizenGoal : null;
}
```

- [ ] **Step 4: Run the homepage-domain test and verify GREEN**

Run the Task 1 test command again. Expected: 4 tests pass.

- [ ] **Step 5: Implement the citizen homepage and route split**

Implement `CitizenHome.tsx` as a focused component that renders, in order:

```tsx
<header>{/* brand; English; Simple mode; Privacy; /demo */}</header>
<main>
  <section>{/* exact hero heading/supporting sentence and HOME_ACTIONS evidence-trail rows */}</section>
  <nav aria-label="Common challan situations">{/* SITUATION_LINKS */}</nav>
  <section aria-label="How ChallanSakshi works">{/* three ordered journey steps */}</section>
  <section aria-label="Your privacy is built in">{/* prohibited credentials, on-device default, official actions */}</section>
  <aside>{/* FASTag doorway to /fastag */}</aside>
</main>
<footer>{/* Privacy, Safety, /demo, independent-service limitation */}</footer>
```

Implementation requirements:

- use ordinary `<a>` links so same-origin navigation reliably resets memory-only case state;
- mark `CitizenHome` as a client component only because the language and Simple Mode controls need local UI state; it must still contain no effect, storage, cookie, URL mutation, or network call;
- implement `English / हिंदी` as the only language choices and translate every homepage string through one local copy dictionary;
- implement `Simple mode` as a real `aria-pressed` toggle that changes the supporting sentence to `Check what the official record says. Compare only what you can see. Then use the official service.` and changes the four questions to `Check whether the official record is about your vehicle.`, `See what the notice or status means.`, `Check whether the photo and record agree.`, and `See the next official step.` without changing destinations;
- use small inline SVG components with `currentColor`, a `viewBox`, rounded caps/joins, and consistent 1.8–2px strokes for the four task metaphors and arrows;
- encode the homepage visual system in `CitizenHome.module.css`, not `app/globals.css`;
- match the desktop and mobile concept composition; and
- keep every essential mobile action at least 48px high.

Replace `app/page.tsx` with `CitizenHome`, create `app/demo/page.tsx` with `ChallanSakshiApp`, update the footer’s synthetic link to `/demo`, and update root metadata so it describes the citizen service rather than the fictional scooter fixture.

- [ ] **Step 6: Run Task 1 verification**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/citizen-home.test.ts tests/synthetic-guided-header.test.ts tests/synthetic-guided-journey.test.ts
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
```

Expected: all selected tests pass and typecheck exits 0.

- [ ] **Step 7: Commit Task 1**

```bash
git add app/page.tsx app/demo/page.tsx app/layout.tsx lib/citizen-home.ts tests/citizen-home.test.ts components/public-beta/CitizenHome.tsx components/public-beta/CitizenHome.module.css components/public-beta/PublicBetaShell.tsx
git commit -m "feat: add citizen-first ChallanSakshi home"
```

---

### Task 2: Memory-only official-record intake

**Files:**
- Create: `lib/local-record-intake.ts`
- Create: `tests/local-record-intake.test.ts`
- Create: `components/public-beta/LocalRecordIntake.tsx`
- Create: `components/public-beta/LocalRecordIntake.module.css`

**Interfaces:**
- Produces: `LocalRecordRole`, `LocalRecordFileMeta`, `LocalRecordValidation`, `validateLocalRecordFile(file, role)`, and `formatLocalRecordSize(bytes)`.
- Produces: `LocalRecordIntake` with controlled `record` and `photograph` selections for Task 4.
- Must not import or call any government, AI, storage, or network API.

- [ ] **Step 1: Write the failing local-file validation tests**

Create `tests/local-record-intake.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatLocalRecordSize, validateLocalRecordFile } from '../lib/local-record-intake';

const MiB = 1024 * 1024;

describe('local official-record intake', () => {
  it('accepts only the approved PDF and image MIME types', () => {
    expect(validateLocalRecordFile({ name: 'challan.pdf', size: 2 * MiB, type: 'application/pdf' }, 'official-record')).toMatchObject({ ok: true, previewKind: 'pdf' });
    expect(validateLocalRecordFile({ name: 'evidence.webp', size: MiB, type: 'image/webp' }, 'photograph')).toMatchObject({ ok: true, previewKind: 'image' });
    expect(validateLocalRecordFile({ name: 'notice.svg', size: 100, type: 'image/svg+xml' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('rejects empty and oversized files before preview', () => {
    expect(validateLocalRecordFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' }, 'official-record')).toEqual({ ok: false, reason: 'empty-file' });
    expect(validateLocalRecordFile({ name: 'large.jpg', size: 12 * MiB + 1, type: 'image/jpeg' }, 'photograph')).toEqual({ ok: false, reason: 'file-too-large' });
  });

  it('does not infer support from a filename extension', () => {
    expect(validateLocalRecordFile({ name: 'challan.pdf', size: 20, type: 'application/octet-stream' }, 'official-record')).toEqual({ ok: false, reason: 'unsupported-type' });
  });

  it('formats selected size without exposing file contents', () => {
    expect(formatLocalRecordSize(1536)).toBe('1.5 KiB');
    expect(formatLocalRecordSize(2 * MiB)).toBe('2.0 MiB');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/local-record-intake.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the pure local-file validator**

Create `lib/local-record-intake.ts` with:

```ts
export type LocalRecordRole = 'official-record' | 'photograph';
export type LocalRecordPreviewKind = 'pdf' | 'image';

export type LocalRecordFileMeta = {
  name: string;
  size: number;
  type: string;
  role: LocalRecordRole;
  previewKind: LocalRecordPreviewKind;
};

export type LocalRecordValidation =
  | { ok: true; previewKind: LocalRecordPreviewKind }
  | { ok: false; reason: 'empty-file' | 'file-too-large' | 'unsupported-type' };

export const MAX_LOCAL_RECORD_BYTES = 12 * 1024 * 1024;

const acceptedTypes = new Map<string, LocalRecordPreviewKind>([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['image/webp', 'image'],
]);

export function validateLocalRecordFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  _role: LocalRecordRole,
): LocalRecordValidation {
  if (file.size === 0) return { ok: false, reason: 'empty-file' };
  if (file.size > MAX_LOCAL_RECORD_BYTES) return { ok: false, reason: 'file-too-large' };
  const previewKind = acceptedTypes.get(file.type);
  return previewKind ? { ok: true, previewKind } : { ok: false, reason: 'unsupported-type' };
}

export function formatLocalRecordSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${(bytes / 1024).toFixed(1)} KiB`;
}
```

- [ ] **Step 4: Run the local-file tests and verify GREEN**

Run the Task 2 test command again. Expected: 4 tests pass.

- [ ] **Step 5: Implement the controlled local intake component**

Use this exact public contract:

```ts
export type LocalRecordSelection = {
  file: File;
  meta: LocalRecordFileMeta;
  previewUrl: string;
};

export function LocalRecordIntake(props: {
  record: LocalRecordSelection | null;
  photograph: LocalRecordSelection | null;
  onRecordChange: (selection: LocalRecordSelection | null) => void;
  onPhotographChange: (selection: LocalRecordSelection | null) => void;
  disabled?: boolean;
  language: 'en' | 'hi';
}): JSX.Element;
```

The component must:

- render separate `<input type="file">` controls for official record and photograph with exact `accept="application/pdf,image/jpeg,image/png,image/webp"`;
- add `capture="environment"` only to the photograph input;
- validate before `URL.createObjectURL`;
- create one object URL for each accepted selection and return it to the parent, which owns cross-step lifecycle cleanup;
- return only `File`, metadata, and object URL to the parent;
- preview images with `<img alt="Citizen-selected evidence preview">` and PDFs with `<object type="application/pdf">` plus a plain fallback;
- show file name, human-readable size, MIME category, `Memory only`, and `Server upload: off`;
- show localized, actionable validation errors;
- provide replace and remove controls that clear the controlled selection and reset the underlying file input so the same file can be selected again; and
- contain no `fetch`, XHR, beacon, storage, cookie, worker, server action, `<form>`, or `/api/analyze` reference.

Do not revoke URLs merely because `LocalRecordIntake` unmounts when the journey advances: Task 4 still needs the same preview in Stage 3. The parent `CitizenReviewApp` owns replacement, removal, Quick Exit, and final-unmount cleanup.

Keep the visual layout consistent with the official-record intake concept: open action rows, obvious borders, no upload-cloud marketing treatment, and an always-visible local-processing receipt.

- [ ] **Step 6: Run Task 2 verification**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/local-record-intake.test.ts
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
```

Expected: tests pass and typecheck exits 0.

- [ ] **Step 7: Commit Task 2**

```bash
git add lib/local-record-intake.ts tests/local-record-intake.test.ts components/public-beta/LocalRecordIntake.tsx components/public-beta/LocalRecordIntake.module.css
git commit -m "feat: add local-only official record intake"
```

---

### Task 3: Evidence presentation, citizen timeline, and local summary

**Files:**
- Create: `lib/evidence-intelligence.ts`
- Create: `tests/evidence-intelligence.test.ts`
- Modify: `lib/public-challan.ts`
- Modify: `tests/public-challan.test.ts`

**Interfaces:**
- Consumes: `CitizenChallanAnswers`, `CitizenReviewAssessment`, `OfficialSourceStatus`, and `LocalRecordFileMeta`.
- Produces: `EvidenceSourceRef`, `EvidenceObservation`, `EvidenceConflict`, `CitizenTimelineEvent`, `buildCitizenEvidenceView(input)`, `buildCitizenTimeline(input)`, and `buildCitizenEvidenceSummary(input)`.
- Consumed by Task 4: all three builder functions and their return types.

- [ ] **Step 1: Write failing evidence-intelligence tests**

Create literal fixtures that prove source authenticity, uncertainty, conflict materiality, actor language, and summary disclaimers. Use this required test shape:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildCitizenEvidenceSummary,
  buildCitizenEvidenceView,
  buildCitizenTimeline,
} from '../lib/evidence-intelligence';

const answers = {
  sourceStatus: 'downloaded-official-record' as const,
  imageInspected: true,
  plateObservation: 'different' as const,
  categoryObservation: 'different' as const,
  colourObservation: 'different' as const,
  offenceObservation: 'unclear' as const,
  timestampStatus: 'displayed' as const,
  locationStatus: 'unclear' as const,
  ownRecordAvailable: 'present' as const,
  noticeCopyAvailable: 'present' as const,
  custodyRecordAvailable: 'not-applicable' as const,
};

describe('citizen evidence intelligence', () => {
  it('labels a downloaded record as citizen-declared rather than government-authenticated', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.sources[0]).toMatchObject({
      kind: 'official-record-copy',
      acquisition: 'local-file-preview',
      authenticity: 'citizen-declared-origin',
    });
  });

  it('keeps unclear observations inconclusive and explains the limitation', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.observations.find((item) => item.field === 'Alleged offence')).toMatchObject({
      confidence: 'inconclusive',
      confirmation: 'confirmed',
      limitation: 'The citizen recorded that the supplied still is unclear.',
    });
  });

  it('marks readable plate and category differences as material but colour as context only', () => {
    const view = buildCitizenEvidenceView({ answers, recordName: 'challan.pdf', photographName: 'photo.jpg' });
    expect(view.conflicts.map((item) => [item.reason, item.materiality])).toEqual([
      ['registration', 'material'],
      ['vehicle-category', 'material'],
      ['colour', 'context-only'],
    ]);
  });

  it('uses citizen actor language for every memory-only timeline event', () => {
    expect(buildCitizenTimeline({ recordSelected: true, imageSelected: true, sourceConfirmed: true, observationsConfirmed: true, summaryGenerated: true }).map((event) => event.label)).toEqual([
      'You started a private review',
      'You selected a downloaded record',
      'You added a supplied photograph',
      'You confirmed the record source',
      'You recorded evidence observations',
      'You generated a local case summary',
    ]);
  });

  it('generates a minimised summary with the mandatory disclaimer and no file bytes', () => {
    const summary = buildCitizenEvidenceSummary({
      jurisdiction: 'Central e-Challan service',
      vehicleSuffix: '3317',
      allegedOffence: 'Helmet',
      eventDate: '2026-08-20',
      officialDeadline: '',
      recordName: 'challan.pdf',
      photographName: 'photo.jpg',
      answers,
      materialSignals: ['You recorded that the readable plate details differ.'],
      missingEvidence: [],
      timeline: buildCitizenTimeline({ recordSelected: true, imageSelected: true, sourceConfirmed: true, observationsConfirmed: true, summaryGenerated: true }),
    });
    expect(summary).toContain('Vehicle registration suffix: …3317');
    expect(summary).toContain('Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.');
    expect(summary).not.toContain('data:');
    expect(summary).not.toContain('blob:');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/evidence-intelligence.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the normalized evidence layer**

Create `lib/evidence-intelligence.ts` with the exact public types from the spec and these additions:

```ts
export type CitizenTimelineEvent = {
  id: string;
  label: string;
  actor: 'citizen';
};

export type CitizenEvidenceView = {
  sources: EvidenceSourceRef[];
  observations: EvidenceObservation[];
  conflicts: EvidenceConflict[];
};
```

Implementation rules:

- stable source IDs are `source-official-copy`, `source-enforcement-image`, and `source-citizen-record`;
- stable observation IDs are prefixed `observation-` and use field slugs;
- `different` plate/category becomes high confidence only when the citizen selected it and `imageInspected` is true;
- `unclear`, `not-visible`, `not-found`, and `not-assessable-from-still` become `inconclusive` with an explicit limitation;
- colour differences always produce `context-only` conflicts;
- all initial-release observations use `confirmation: 'confirmed'` only after Task 4’s confirmation gate; the builder accepts only confirmed answers;
- source authenticity is `citizen-declared-origin`, never `authorised-connector`; and
- no function reads a `File`, object URL, or source bytes.

`buildCitizenEvidenceSummary()` must produce sections in this order:

1. title and mandatory disclaimer;
2. minimised case details;
3. citizen-provided source register;
4. citizen-confirmed observations;
5. material signals;
6. records still needed;
7. citizen-recorded timeline;
8. neutral clarification request; and
9. important limits and official handoff reminder.

Extend `lib/public-challan.ts` only to add a stable situation alias function:

```ts
export type CitizenSituation =
  | 'source-not-verified'
  | 'insufficient-review'
  | 'records-appear-consistent'
  | 'evidence-unclear'
  | 'material-inconsistency-recorded';

export function citizenSituationForFinding(finding: CitizenReviewFinding): CitizenSituation {
  if (finding === 'citizen-recorded-inconsistency') return 'material-inconsistency-recorded';
  if (finding === 'supplied-image-unclear') return 'evidence-unclear';
  if (finding === 'entries-do-not-support-mismatch') return 'records-appear-consistent';
  return finding;
}
```

Add literal mapping tests to `tests/public-challan.test.ts` before implementing the function.

- [ ] **Step 4: Run Task 3 tests and verify GREEN**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/evidence-intelligence.test.ts tests/public-challan.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add lib/evidence-intelligence.ts tests/evidence-intelligence.test.ts lib/public-challan.ts tests/public-challan.test.ts
git commit -m "feat: add source-linked citizen evidence summaries"
```

---

### Task 4: Integrate official handoff, local preview, findings, timeline, and evidence summary

**Files:**
- Modify: `lib/guided-journey.ts`
- Modify: `tests/guided-journey.test.ts`
- Modify: `components/guided/GuidedStepHeader.tsx`
- Modify: `components/guided/GuidedStepHeader.module.css`
- Modify: `components/public-beta/CitizenReviewApp.tsx`
- Modify: `components/public-beta/PublicBetaShell.tsx`
- Modify: `components/public-beta/PublicBeta.module.css`
- Modify: `app/review/page.tsx`

**Interfaces:**
- Consumes: `parseCitizenGoal`, `LocalRecordIntake`, `LocalRecordSelection`, `buildCitizenEvidenceView`, `buildCitizenTimeline`, `buildCitizenEvidenceSummary`, and `citizenSituationForFinding`.
- Produces: a four-stage real flow with memory-only selected files and a source/confidence result.
- Does not change the fixture-only `/api/analyze` contract.

- [ ] **Step 1: Update guided-journey tests first and verify RED**

Change the expected e-Challan step labels to exactly:

```ts
[
  ['safety', 'Start safely'],
  ['source', 'Get official record'],
  ['observations', 'Check the evidence'],
  ['result', 'Decide and resolve'],
]
```

Add tests for Stage 2 copy:

```ts
expect(getChallanGuideContent({
  step: 'source',
  safetyReady: true,
  sourceStatus: 'not-selected',
  jurisdictionSelected: false,
  observationsReady: false,
  worksheetAvailable: false,
  exportAllowed: true,
})).toMatchObject({
  currentLabel: 'Step 2 of 4 · Get the official record',
  instruction: 'Open the official record yourself. Then bring back the challan print, receipt, screenshot, or supplied photograph.',
  status: 'Official source and record still needed',
  next: 'Confirm every extracted fact before comparing evidence.',
});
```

Run the guided tests. Expected: FAIL against the previous labels/copy.

- [ ] **Step 2: Implement the new guided labels and instruction hierarchy**

Update `lib/guided-journey.ts` to satisfy the tests while preserving the message-only safe-stop and the FASTag guide.

Update `GuidedStepHeader` so desktop exposes all four steps without requiring disclosure and mobile uses `Step N of 4` plus the compact progress rule. Keep semantic heading focus and state labels. Do not move rules into the component.

- [ ] **Step 3: Integrate goal, selected files, and cleanup into `CitizenReviewApp`**

Add state:

```ts
const [goal, setGoal] = useState<CitizenGoal | null>(null);
const [recordSelection, setRecordSelection] = useState<LocalRecordSelection | null>(null);
const [photographSelection, setPhotographSelection] = useState<LocalRecordSelection | null>(null);
const [factsConfirmed, setFactsConfirmed] = useState(false);
const [summaryGenerated, setSummaryGenerated] = useState(false);
const [simpleMode, setSimpleMode] = useState(false);
const [manualEntryMode, setManualEntryMode] = useState(false);
```

Read only the approved non-sensitive goal after mount:

```ts
useEffect(() => {
  setGoal(parseCitizenGoal(window.location.search));
}, []);
```

Whenever an answer, source, jurisdiction, selected file, or essential fact changes, reset `factsConfirmed`, helper confirmation, artifact status, and `summaryGenerated`. The file itself must not be included in JSON signatures; include only `recordSelection?.meta.name` and `photographSelection?.meta.name`.

Own object URL cleanup in the parent so previews survive a step transition but never survive the app:

```ts
useEffect(() => () => {
  if (recordSelection?.previewUrl) URL.revokeObjectURL(recordSelection.previewUrl);
}, [recordSelection?.previewUrl]);

useEffect(() => () => {
  if (photographSelection?.previewUrl) URL.revokeObjectURL(photographSelection.previewUrl);
}, [photographSelection?.previewUrl]);
```

These dependency cleanups revoke the previous URL after replace/remove and the current URL on app unmount. Quick Exit must also revoke both current object URLs before `window.location.replace('/')`.

Extend `PublicBetaShell` with optional controlled props:

```ts
simpleMode?: boolean;
onSimpleModeChange?: (value: boolean) => void;
```

When both are supplied, render a visible `Simple mode` / `सरल भाषा` button with `aria-pressed`. Remove `englishOnly` from the real e-Challan call so English and Hindi are both available. In Simple Mode, use a dedicated simplified result-body mapping and enlarge explanatory/body copy with a `data-simple-mode` shell attribute; do not change the assessment, progress, readiness, source route, or available actions.

- [ ] **Step 4: Replace Stage 2 with official handoff plus local intake**

Render:

- exact service choices `National e-Challan`, `State or UT traffic service`, `Virtual Court`, `I am not sure`;
- exact official links for the national portal and Virtual Courts;
- `/safety` for state/UT or unknown routing rather than guessing a state URL;
- the `LocalRecordIntake` component;
- the one-deliberate-action explanation; and
- the local-processing receipt.

Selecting a file does not authenticate its origin and does not alone set `sourceStatus`. Keep the citizen’s explicit source choice. When a valid official-record file exists, the source option `downloaded-official-record` may be selected by the citizen and `noticeCopyAvailable` may be suggested but not silently changed.

`Enter the essential facts yourself` sets `manualEntryMode` to true and shows an explicit selected state. Choosing an official-record file sets it back to false only when the citizen chooses the file path intentionally; neither mode changes source authenticity.

Stage 2 can continue only when:

- `sourceStatus` is not `not-selected`;
- jurisdiction/service choice is present; and
- either a valid official record has been selected or `manualEntryMode` is true.

Message-only still produces the current safe stop without displaying the evidence comparison.

- [ ] **Step 5: Add the citizen confirmation gate and evidence view to Stage 3**

Place the local preview above structured fields on mobile and beside them on desktop. Add a final checkbox:

> I checked the selected record and photograph beside these entries. Every fact above is either confirmed by me or marked unclear/not supplied.

Do not allow Stage 4 until it is checked. A helper also requires the existing citizen-present confirmation after this checkbox.

Below the structured fields, render source-linked rows from `buildCitizenEvidenceView()` with columns/labels:

- Field;
- Observation;
- Source;
- Confidence;
- Confirmation; and
- Limitation.

Include the sentence:

> Confidence describes how clear your recorded observation is. It does not authenticate the document.

- [ ] **Step 6: Replace the result worksheet presentation with the citizen evidence summary**

Keep `assessCitizenChallanReview()` as the classification source. Use `citizenSituationForFinding()` for citizen-facing situation labels. Render:

- result heading and limitation;
- what can be established;
- what remains unclear;
- evidence source/confidence rows;
- missing evidence;
- timeline from `buildCitizenTimeline()`;
- exact official route; and
- the summary from `buildCitizenEvidenceSummary()`.

Private device controls:

```ts
function downloadSummary(summary: string) {
  const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'challansakshi-citizen-evidence-summary.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}
```

Also provide explicit clipboard and `window.print()` actions. Disable all three when `device === 'shared'`. `summaryGenerated` becomes true only after one of these actions, and the timeline then includes the local-summary event.

Use this exact disclaimer in the rendered result and artifact:

> Prepared by the citizen using ChallanSakshi. Not submitted, authenticated, or approved by a government authority.

- [ ] **Step 7: Update shell boundary and review metadata**

Change the real e-Challan boundary from `no document upload` to:

> Local record preview · no server upload

The body must say selected records remain in the current browser tab and are not sent to a server, AI model, authority, bank, or toll operator. It must also warn that the hosting provider still receives ordinary page-request metadata.

Update `/review` metadata to describe local preview and citizen-confirmed structured review without saying no file input, OCR, government verification, or AI analysis.

- [ ] **Step 8: Run Task 4 verification**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/guided-journey.test.ts tests/guided-step-header.test.ts tests/public-challan.test.ts tests/evidence-intelligence.test.ts tests/local-record-intake.test.ts
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
```

Expected: selected tests pass and typecheck exits 0.

- [ ] **Step 9: Commit Task 4**

```bash
git add lib/guided-journey.ts tests/guided-journey.test.ts components/guided/GuidedStepHeader.tsx components/guided/GuidedStepHeader.module.css components/public-beta/CitizenReviewApp.tsx components/public-beta/PublicBetaShell.tsx components/public-beta/PublicBeta.module.css app/review/page.tsx
git commit -m "feat: integrate official record evidence journey"
```

---

### Task 5: Privacy isolation, public copy, and release documentation

**Files:**
- Modify: `tests/public-mode-privacy.test.ts`
- Modify: `components/public-beta/PublicInfoPage.tsx`
- Modify: `README.md`
- Modify: `app/privacy/page.tsx` if route-specific metadata is inaccurate
- Modify: `app/safety/page.tsx` if route-specific metadata is inaccurate

**Interfaces:**
- Consumes: the new real-mode files from Tasks 1–4.
- Produces: regression guards that allow only the dedicated local file input while continuing to prohibit transmission and persistence.

- [ ] **Step 1: Write the failing privacy-isolation expectations**

Extend `publicModeFiles` with:

```ts
'components/public-beta/LocalRecordIntake.tsx',
'lib/local-record-intake.ts',
'lib/evidence-intelligence.ts',
```

Replace the blanket file-input prohibition with these behaviors:

```ts
it('allows file selection only in the dedicated local intake component', () => {
  const filesWithFileInputs = publicModeFiles
    .filter(({ source }) => /type=["']file["']/.test(source))
    .map(({ path }) => path);
  expect(filesWithFileInputs).toEqual(['components/public-beta/LocalRecordIntake.tsx']);
});

it('keeps every real-mode file free of network send and persistence', () => {
  for (const { path, source } of publicModeFiles) {
    expect(source, path).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage\.|sessionStorage\.|indexedDB|document\.cookie|caches\./);
    expect(source, path).not.toMatch(/\/api\/analyze|dangerouslySetInnerHTML/);
  }
});

it('uses object URLs only in local intake and local artifact actions', () => {
  const filesWithObjectUrls = publicModeFiles
    .filter(({ source }) => /URL\.(?:create|revoke)ObjectURL/.test(source))
    .map(({ path }) => path)
    .sort();
  expect(filesWithObjectUrls).toEqual([
    'components/public-beta/CitizenReviewApp.tsx',
    'components/public-beta/LocalRecordIntake.tsx',
  ]);
});
```

Keep the existing no-form, no-raw-textarea, and prohibited-credential checks. Replace the obsolete English-only assertion with a check that the e-Challan shell no longer receives `englishOnly`, that both `setLanguage('en')` and `setLanguage('hi')` remain present in `PublicBetaShell`, and that no third selectable language is exposed. Update the no-inspection assertion to require wording that differentiates locally previewed user-provided files from authentication or government verification.

Run `tests/public-mode-privacy.test.ts`. Expected: FAIL until the scan and public copy match the new architecture.

- [ ] **Step 2: Update privacy and safety public copy**

`PublicInfoPage` and the route metadata must state:

- file selection is deliberate and local;
- selected records remain in the current tab and are not sent to ChallanSakshi’s server or an AI model;
- user-provided origin is not government authentication;
- CAPTCHA, OTP, Aadhaar, passwords, and payment credentials are never requested;
- technical page requests still reach the infrastructure provider;
- downloads, screenshots, clipboard, print-to-PDF, browser history, and device backups are outside the app’s deletion control;
- no payment or submission occurs in ChallanSakshi; and
- authorised government API access is not currently implemented.

Do not add legal guarantees, retention guarantees for provider logs, or claims that Cloudflare receives no technical metadata.

- [ ] **Step 3: Update README with implemented route and data-flow truth**

Document:

- `/` citizen home;
- `/review` local official-record preview and structured self-review;
- `/fastag` real FASTag reconciliation;
- `/demo` synthetic showcase;
- exact local-file MIME/size limits;
- no server upload or OCR claim;
- future authorised connector boundary;
- bundled-node verification commands; and
- Cloudflare deploy remains a separate explicit step.

- [ ] **Step 4: Run Task 5 tests and full static checks**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run tests/public-mode-privacy.test.ts
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vinext/dist/cli.js build
git diff --check
```

Expected: all tests pass, typecheck/lint/build exit 0, and `git diff --check` is silent.

- [ ] **Step 5: Commit Task 5**

```bash
git add tests/public-mode-privacy.test.ts components/public-beta/PublicInfoPage.tsx app/privacy/page.tsx app/safety/page.tsx README.md
git commit -m "docs: publish local evidence privacy boundaries"
```

---

### Task 6: Browser fidelity and end-to-end release gate

**Files:**
- Modify only files required by concrete browser findings from Tasks 1–5.
- Do not commit temporary screenshots, traces, browser scripts, or QA reports.

**Interfaces:**
- Consumes: the complete implementation and the three visual concept PNGs.
- Produces: fresh automated evidence, a browser interaction record, desktop/mobile screenshots outside committed source, and a fidelity ledger in the SDD workspace.

- [ ] **Step 1: Run the complete automated gate from a clean process**

Run the exact Task 5 full-check command block again. Record test count, failures, typecheck/lint/build exit status, and generated routes. Do not claim success from Task 5’s older output.

- [ ] **Step 2: Start the local app with the bundled Node runtime**

Run:

```bash
/Users/shars/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vinext/dist/cli.js dev
```

Keep the session alive and use the exact localhost URL it reports.

- [ ] **Step 3: Verify the citizen homepage in Browser/IAB**

Target flow:

```text
/ -> choose Check evidence -> /review?goal=evidence -> Step 1 renders
```

At desktop and approximately 390px mobile width, verify:

- page URL/title;
- meaningful DOM, no framework overlay;
- no relevant console errors/warnings;
- exact heading/supporting copy;
- four approved task rows and situation rail;
- privacy band and FASTag doorway;
- `/demo` link; and
- no clipping, accidental wrap, horizontal scroll, undersized touch target, or browser-default control typography.

- [ ] **Step 4: Verify the private-device real-record journey**

Use a temporary local PDF/image fixture outside the repo. Exercise:

```text
/review?goal=evidence
-> citizen present
-> private device
-> required acknowledgements
-> National e-Challan
-> downloaded official record
-> choose valid local file
-> choose or add supplied image
-> confirm facts
-> record a material mismatch
-> result
-> copy, download, and print controls visible
```

Verify local preview appears, selected metadata is correct, object URLs disappear after remove/replace, no request containing the selected file appears, and the result includes source/confidence/limitation, citizen timeline, mandatory disclaimer, and official handoff.

- [ ] **Step 5: Verify error and shared-device paths**

Exercise:

- unsupported file;
- zero-byte file;
- file greater than 12 MiB;
- message-only safe stop;
- different plate/category without a readable own record;
- colour-only difference;
- consistent plate/category;
- shared/public device result; and
- Quick Exit.

Verify shared mode disables download/copy/print and Quick Exit returns to `/` with no real-case state restored.

- [ ] **Step 6: Verify adjacent routes**

Smoke-test `/fastag`, `/demo`, `/privacy`, and `/safety`. Confirm `/demo` remains explicitly synthetic and the real routes contain no fixture selector or simulated authority action.

- [ ] **Step 7: Perform concept-to-render fidelity comparison**

Capture current desktop and mobile screenshots outside the repo. In one QA pass, use `view_image` on:

- each relevant generated concept; and
- each latest browser screenshot.

Write a fidelity ledger in the SDD workspace with at least these rows:

| Comparison | Concept evidence | Render evidence | Resolution |
|---|---|---|---|
| Above-the-fold copy | approved strings | screenshot/DOM | fix or exact match |
| First viewport hierarchy | heading then task trail | screenshot | fix or exact match |
| Palette | white/navy/teal/marigold | screenshot/computed CSS | fix or exact match |
| Typography | editorial headings, deliberate control type | screenshot/computed CSS | fix or exact match |
| Container model | open rows/rails, few frames | screenshot | fix or exact match |
| Icons | consistent outline metaphors | screenshot | fix or exact match |
| Mobile composition | stacked tasks and compact progress | mobile screenshot | fix or exact match |
| Intake privacy receipt | visible local-only status | screenshot | fix or exact match |

Fix every agency-signoff issue and repeat the affected automated/browser checks. Record any intentional deviation with its reason.

- [ ] **Step 8: Run final fresh verification after all visual fixes**

Run the complete automated gate again, then repeat page identity, DOM, console, screenshot, and core interaction checks. Only this final output may support completion claims.

- [ ] **Step 9: Commit verified visual fixes**

```bash
git add components/public-beta/CitizenHome.tsx components/public-beta/CitizenHome.module.css components/public-beta/LocalRecordIntake.tsx components/public-beta/LocalRecordIntake.module.css components/public-beta/CitizenReviewApp.tsx components/public-beta/PublicBeta.module.css components/guided/GuidedStepHeader.tsx components/guided/GuidedStepHeader.module.css
git commit -m "fix: polish citizen evidence journey"
```

If browser QA required no source change, do not create an empty commit.
