# Connected mobility cases

The user approved implementing the partial and missing capabilities from the 6 September gap audit. The next message asks for a free alternative to Supabase and setup guidance. Preserve the working guest review, demos and local OCR. Build a useful complete local case journey plus a configurable Cloudflare D1/Google account backend; do not imply external providers, official access or SMS are configured.

## Shared contract

Files live under `lib/mobility` and `components/mobility`. Core domain is `lib/mobility/cases.ts`; browser persistence is `lib/mobility/store.ts`; service catalogue is `lib/mobility/services.ts`.

```ts
type ServiceKind = 'challan-review' | 'challan-payment' | 'payment-status' | 'fastag' | 'licence-apply' | 'licence-renew' | 'vehicle-transfer' | 'lost-documents' | 'move-state';
type CaseStatus = 'preparing' | 'ready' | 'awaiting-response' | 'needs-attention' | 'completed';
type CaseFact = { key: string; label: string; value: string; source: 'document' | 'citizen' | 'profile'; confirmed: boolean; sourceId?: string; page?: number };
type CaseEvent = { id: string; at: string; kind: 'created' | 'prepared' | 'updated' | 'official-opened' | 'citizen-report' | 'follow-up'; text: string; basis: 'local' | 'citizen-reported' };
type MobilityCase = { version: 1; id: string; service: ServiceKind; title: string; jurisdiction: string; facts: CaseFact[]; draft: string; status: CaseStatus; createdAt: string; updatedAt: string; followUpDate: string; reference: string; events: CaseEvent[]; completedSteps: string[]; appointment?: { at: string; venue: string; instructions: string }; };
type MobilityProfile = { version: 1; name: string; language: 'en' | 'hi'; vehicles: { id: string; label: string; registration: string }[]; address: string; updatedAt: string };
```

Domain exports `createCase(service, now, id)`, `validateCase(value)`, `updateCase(case, patch, now, event?)`, `buildCaseNote(case, language?)`, `validateProfile(value)`. Patches cannot rewrite identity/events/creation. Events record local/user actions and never imply verified official completion. Cap records, fields, text and event counts; validate dates, unique IDs and enums; reject extra/unexpected secrets-bearing fields. Profile reuse and changes require review and must not edit completed cases silently.

Browser store exports `readCases(): MobilityCase[]`, `saveCase(case): void`, `deleteCase(id): void`, `readProfile(): MobilityProfile | null`, `saveProfile(profile): void`, `deleteAllMobilityData(): void`, `MOBILITY_STORE_EVENT`. Storage errors throw for writes; read errors surface through UI where possible. Explicit private-device consent before storing facts/drafts; 90-day expiry. No raw documents or credentials stored. Keep old checklist intact. Saved case includes readings and draft; the citizen retains original attachments.

Service catalogue exports `SERVICE_KINDS`, `getService(kind)`, `inferService(text)` and `LIFE_EVENTS`. Service has `{kind,title:{en,hi},description:{en,hi},sourceUrl,sourceLabel,steps:{id,title:{en,hi},detail:{en,hi}}[]}`. Sources are official, requirements generic unless verified for jurisdiction. Plans are preparation and official handoff, never claimed application execution. Ambiguous intake gives choices.

## UI and integration

- `/mobility` is a new connected dashboard/workspace. A component can receive `initialCaseId`/read an opaque case ID from the URL fragment. Start in own words, choose service/state, edit useful facts and draft, save/resume, follow-up, timeline, appointment pack, profile/vehicle reuse, case deletion/export. Distinguish citizen-reported outcome from official status. Keep legacy `/dashboard` as the existing checklist, linked both ways.
- `/review` prepared stage adds a connected case panel: derive only explicit issuer/state signals (never registration prefix/GPS), create editable neutral request from confirmed extracted facts, explicitly save to private device then open `/mobility#case=...`. Existing note and voice stay working.
- Add home/sidebar entry to connected mobility workspace and persist the selected display language without storing evidence automatically.
- Cloudflare D1 account adapter offers Google login, session logout, owner-scoped case/profile storage and explicit sync/import. Uses secure server session cookies, CSRF/origin checks, identity from trusted provider, optimistic concurrency, no service-role keys in client. Google OAuth/D1 setup remains unavailable until configured, accurately described by API status. No SMS cost introduced.
- Official browser takeover, monitoring, DigiLocker and real portal adapters need external access and live verification. Build only executable safe internal workflow primitives where useful; do not expose simulations as production or manufacture acknowledgements.

## Verification

Unit tests: case/store validation, provenance, persistence/expiry/conflict, service intake, disconnected accounts, auth/API ownership and origin checks. Browser: document -> prepared editable case -> save -> reload/resume -> report -> timeline; profile reuse; service/life event -> saved plan; expiry and shared-device behavior; mobile layout and Hindi. Run complete unit suite, typecheck, lint, build and relevant browser suites. Review security and privacy boundary changes independently.
