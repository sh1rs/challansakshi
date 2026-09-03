import { describe, expect, it } from 'vitest';
import {
  buildSyntheticActionPack,
  compareSyntheticEvidence,
  createBlankSyntheticEvidenceExtraction,
  decideSyntheticResolutionPath,
  validateSyntheticEvidenceExtraction,
  type SyntheticEvidenceExtraction,
  type SyntheticObservation,
  type SyntheticSourceDocument,
} from '../lib/synthetic-evidence-pipeline';
import * as SyntheticPipeline from '../lib/synthetic-evidence-pipeline';
import {
  syntheticEvaluationCases,
  runSyntheticEvaluationCorpus,
} from '../lib/synthetic-evidence-corpus';

const observed = (
  value: string,
  sourceDocument: SyntheticSourceDocument,
  overrides: Partial<SyntheticObservation> = {},
) => ({
  value,
  source_document: sourceDocument,
  confidence: 'high' as const,
  visibility: 'clear' as const,
  evidence_reference: sourceDocument === 'challan_document'
    ? 'Challan · cited line'
    : sourceDocument === 'vehicle_record'
      ? 'Vehicle record · cited field'
      : 'Image · visible vehicle',
  limitation: '',
  user_confirmation_required: true as const,
  ...overrides,
});

const extraction = (changes: {
  challan?: Partial<SyntheticEvidenceExtraction['challan_document']>;
  vehicle?: Partial<SyntheticEvidenceExtraction['vehicle_record']>;
  enforcement?: Partial<SyntheticEvidenceExtraction['enforcement_image']>;
} = {}): SyntheticEvidenceExtraction => ({
  schema_version: '2.0',
  challan_document: {
    challan_number: observed('CS-SYNTH-001', 'challan_document'),
    issue_date: observed('2026-08-20', 'challan_document'),
    alleged_registration: observed('KA 01 AB 3317', 'challan_document'),
    alleged_offence: observed('Riding without a protective helmet', 'challan_document'),
    amount: observed('INR 1000', 'challan_document'),
    timestamp: observed('2026-08-20 11:08 IST', 'challan_document'),
    location: observed('Model Avenue, Pilot City', 'challan_document'),
    ...changes.challan,
  },
  vehicle_record: {
    registration: observed('KA 01 AB 3317', 'vehicle_record'),
    vehicle_category: observed('Scooter', 'vehicle_record'),
    colour: observed('Blue', 'vehicle_record'),
    make_model: observed('Honda Activa 6G', 'vehicle_record'),
    ...changes.vehicle,
  },
  enforcement_image: {
    registration: observed('KA01AB3317', 'enforcement_image'),
    vehicle_category: observed('Scooter', 'enforcement_image'),
    colour: observed('blue', 'enforcement_image'),
    make_model: observed('Honda Activa 6G', 'enforcement_image'),
    timestamp: observed('20 Aug 2026 11:08 IST', 'enforcement_image'),
    location: observed('Model Avenue Pilot City', 'enforcement_image'),
    offence_assessable: observed('yes', 'enforcement_image'),
    ...changes.enforcement,
  },
  limitations: [],
});

describe('synthetic evidence comparison engine', () => {
  it('normalizes formatting without turning harmless differences into discrepancies', () => {
    const result = compareSyntheticEvidence(extraction());

    expect(result.overall).toBe('appears-consistent');
    expect(result.counts).toEqual({ matches: 6, potentialMismatches: 0, inconclusive: 0 });
    expect(result.rows.every((row) => row.state === 'match')).toBe(true);
    expect(result.offenceAssessment.state).toBe('assessable');
  });

  it('reports a clear one-character registration conflict as a potential discrepancy, not a legal conclusion', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: { registration: observed('KA01AB3817', 'enforcement_image') },
    }));

    expect(result.overall).toBe('potential-evidence-discrepancy');
    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'potential-mismatch',
      sources: [
        { label: 'Challan document', value: 'KA 01 AB 3317' },
        { label: 'Vehicle record', value: 'KA 01 AB 3317' },
        { label: 'Enforcement image', value: 'KA01AB3817' },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/invalid|illegal|innocent|guilty/i);
  });

  it('keeps an unreadable image field inconclusive even when the model supplied a guessed value', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: {
        registration: observed('KA01AB3817', 'enforcement_image', {
          confidence: 'low',
          visibility: 'unclear',
          limitation: 'Motion blur obscures the plate.',
        }),
      },
    }));

    expect(result.overall).toBe('inconclusive');
    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'inconclusive',
      reasonCode: 'evidence-not-clear-enough',
    });
    expect(result.counts.potentialMismatches).toBe(0);
  });

  it('keeps a colour-only conflict contextual instead of opening a dispute path', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: { colour: observed('White', 'enforcement_image') },
    }));

    expect(result.rows.find((row) => row.field === 'colour')).toMatchObject({
      state: 'potential-mismatch',
      materiality: 'supporting',
    });
    expect(result.overall).toBe('inconclusive');
    expect(decideSyntheticResolutionPath(result).id).toBe('request-clarification');
  });

  it.each([
    'Not stated',
    'Not provided',
    'Not specified',
    'Not discernible',
    'Not stated in the bundled fixture',
  ])('treats the unavailable value "%s" as inconclusive instead of a concrete mismatch', (unavailableValue) => {
    const result = compareSyntheticEvidence(extraction({
      vehicle: { make_model: observed(unavailableValue, 'vehicle_record') },
    }));

    expect(result.rows.find((row) => row.field === 'make_model')).toMatchObject({
      state: 'inconclusive',
      reasonCode: 'reference-not-clear-enough',
    });
    expect(result.counts.potentialMismatches).toBe(0);
  });

  it('detects a clear conflict between the challan allegation and the vehicle record without collapsing either source', () => {
    const result = compareSyntheticEvidence(extraction({
      challan: { alleged_registration: observed('KA01AB3817', 'challan_document') },
    }));
    const registration = result.rows.find((row) => row.field === 'registration');

    expect(result.overall).toBe('potential-evidence-discrepancy');
    expect(registration?.state).toBe('potential-mismatch');
    expect(registration?.sources.map((source) => source.sourceDocument)).toEqual([
      'challan_document',
      'vehicle_record',
      'enforcement_image',
    ]);
  });

  it('preserves a clear challan-versus-vehicle conflict even when the image plate is unreadable', () => {
    const result = compareSyntheticEvidence(extraction({
      challan: { alleged_registration: observed('KA01AB3817', 'challan_document') },
      enforcement: {
        registration: observed('Unreadable', 'enforcement_image', {
          confidence: 'low',
          visibility: 'unclear',
          limitation: 'Motion blur obscures the plate.',
        }),
      },
    }));

    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'potential-mismatch',
      reasonCode: 'clear-values-conflict',
    });
    expect(result.overall).toBe('potential-evidence-discrepancy');
  });

  it('preserves a clear challan-versus-image conflict when the vehicle record registration is unreadable', () => {
    const result = compareSyntheticEvidence(extraction({
      vehicle: {
        registration: observed('Not readable', 'vehicle_record', {
          confidence: 'low',
          visibility: 'unclear',
          limitation: 'The vehicle record registration is obscured.',
        }),
      },
      enforcement: { registration: observed('KA01AB3817', 'enforcement_image') },
    }));

    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'potential-mismatch',
      reasonCode: 'clear-values-conflict',
    });
    expect(result.overall).toBe('potential-evidence-discrepancy');
  });

  it('preserves a clear vehicle-record-versus-image conflict when the challan registration is unreadable', () => {
    const result = compareSyntheticEvidence(extraction({
      challan: {
        alleged_registration: observed('Not readable', 'challan_document', {
          confidence: 'low',
          visibility: 'unclear',
          limitation: 'The challan registration is obscured.',
        }),
      },
      enforcement: { registration: observed('KA01AB3817', 'enforcement_image') },
    }));

    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'potential-mismatch',
      reasonCode: 'clear-values-conflict',
    });
    expect(result.overall).toBe('potential-evidence-discrepancy');
  });

  it('does not erase timezone or location-specificity differences during normalization', () => {
    const timezone = compareSyntheticEvidence(extraction({
      enforcement: { timestamp: observed('20 Aug 2026 11:08 UTC', 'enforcement_image') },
    }));
    const localityOnly = compareSyntheticEvidence(extraction({
      enforcement: { location: observed('Pilot City', 'enforcement_image') },
    }));

    expect(timezone.rows.find((row) => row.field === 'timestamp')?.state).toBe('potential-mismatch');
    expect(localityOnly.rows.find((row) => row.field === 'location')?.state).toBe('potential-mismatch');
    expect(timezone.overall).toBe('inconclusive');
    expect(localityOnly.overall).toBe('inconclusive');
  });

  it('does not treat a matching four-character suffix as full registration verification', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: {
        registration: observed('3317', 'enforcement_image', {
          visibility: 'partial',
          evidence_reference: 'Image · plate suffix only',
          limitation: 'Only the final four characters are visible.',
        }),
      },
    }));

    expect(result.rows.find((row) => row.field === 'registration')).toMatchObject({
      state: 'inconclusive',
      reasonCode: 'evidence-not-clear-enough',
    });
  });

  it('makes offence visibility a limitation instead of asking the model whether an offence occurred', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: {
        offence_assessable: observed('no', 'enforcement_image', {
          limitation: 'The rider head area is outside the frame.',
        }),
      },
    }));

    expect(result.overall).toBe('inconclusive');
    expect(result.offenceAssessment).toMatchObject({
      state: 'not-assessable',
      reason: 'The supplied image does not contain enough visible context to assess the alleged offence.',
    });
  });

  it('uses deterministic next paths for discrepancy, inconclusive, and consistent results', () => {
    const mismatch = compareSyntheticEvidence(extraction({
      enforcement: { vehicle_category: observed('Motorcycle', 'enforcement_image') },
    }));
    const unclear = compareSyntheticEvidence(extraction({
      enforcement: { colour: observed('Unclear', 'enforcement_image', { confidence: 'low', visibility: 'unclear' }) },
    }));
    const consistent = compareSyntheticEvidence(extraction());

    expect(decideSyntheticResolutionPath(mismatch).id).toBe('prepare-official-review');
    expect(decideSyntheticResolutionPath(unclear).id).toBe('request-clarification');
    expect(decideSyntheticResolutionPath(consistent).id).toBe('no-dispute-basis-found');
  });

  it('builds a source-linked, filename-free action pack from confirmed observations', () => {
    const result = compareSyntheticEvidence(extraction({
      enforcement: { vehicle_category: observed('Motorcycle', 'enforcement_image') },
    }));
    const pack = buildSyntheticActionPack(extraction(), result, decideSyntheticResolutionPath(result));

    expect(pack).toContain('CHALLANSAKSHI — SYNTHETIC EVIDENCE ACTION PACK');
    expect(pack).toContain('Vehicle record: Scooter');
    expect(pack).toContain('Enforcement image: Motorcycle');
    expect(pack).toContain('Vehicle record · cited field');
    expect(pack).toContain('LIMITATIONS');
    expect(pack).toContain('Potential evidence discrepancy');
    expect(pack).toContain('This is not a legal conclusion');
    expect(pack).not.toMatch(/\.png|\.jpe?g|blob:|data:/i);
  });
});

describe('synthetic extraction contract', () => {
  it('starts custom manual review blank and inconclusive instead of borrowing a bundled case', () => {
    const blank = createBlankSyntheticEvidenceExtraction();
    const result = compareSyntheticEvidence(blank);

    expect(validateSyntheticEvidenceExtraction(blank)).toBe(true);
    expect(result.overall).toBe('inconclusive');
    expect(result.rows.every((row) => row.state === 'inconclusive')).toBe(true);
    expect(JSON.stringify(blank)).not.toMatch(/3317|3817|Activa|Honda/i);
  });

  it('accepts the complete source-linked contract and rejects missing or wrong-source fields', () => {
    expect(validateSyntheticEvidenceExtraction(extraction())).toBe(true);

    const wrongSource = extraction();
    wrongSource.enforcement_image.registration.source_document = 'vehicle_record';
    expect(validateSyntheticEvidenceExtraction(wrongSource)).toBe(false);

    const missingField = extraction() as unknown as { vehicle_record: Record<string, unknown> };
    delete missingField.vehicle_record.colour;
    expect(validateSyntheticEvidenceExtraction(missingField)).toBe(false);
  });

  it('rejects observations that bypass human confirmation or exceed the bounded text contract', () => {
    const bypass = extraction();
    bypass.enforcement_image.colour.user_confirmation_required = false as true;
    expect(validateSyntheticEvidenceExtraction(bypass)).toBe(false);

    const oversized = extraction();
    oversized.enforcement_image.colour.value = 'x'.repeat(161);
    expect(validateSyntheticEvidenceExtraction(oversized)).toBe(false);
  });
});

describe('deterministic test laboratory corpus', () => {
  it('covers ten independent cases across all three possible outcomes', () => {
    expect(syntheticEvaluationCases).toHaveLength(10);
    expect(new Set(syntheticEvaluationCases.map((item) => item.expectedOverall))).toEqual(new Set([
      'appears-consistent',
      'potential-evidence-discrepancy',
      'inconclusive',
    ]));
    expect(Object.fromEntries(
      [...new Set(syntheticEvaluationCases.map((item) => item.expectedOverall))]
        .map((outcome) => [outcome, syntheticEvaluationCases.filter((item) => item.expectedOverall === outcome).length]),
    )).toEqual({
      'appears-consistent': 3,
      'potential-evidence-discrepancy': 4,
      inconclusive: 3,
    });
  });

  it('passes every hand-labelled case without consulting a model', () => {
    const report = runSyntheticEvaluationCorpus();

    expect(report).toMatchObject({ total: 10, passed: 10, failed: 0 });
    expect(report.cases.every((item) => item.passed)).toBe(true);
  });

  it('uses one coherent two-wheeler versus four-wheeler case with complete source limits', () => {
    const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');

    expect(flagship).toBeDefined();
    expect(flagship).toMatchObject({
      title: 'Two-wheeler versus four-wheeler',
      analysisProvenance: 'Pre-authored bundled synthetic observations · no model call in this proof.',
      expectedOverall: 'potential-evidence-discrepancy',
    });
    expect(flagship?.extraction.vehicle_record).toMatchObject({
      vehicle_category: {
        value: 'Two-wheeler',
        source_document: 'vehicle_record',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
      },
      colour: {
        value: 'Blue',
        source_document: 'vehicle_record',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
      },
      make_model: {
        value: 'Honda Activa 6G',
        source_document: 'vehicle_record',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
      },
    });
    expect(flagship?.extraction.enforcement_image).toMatchObject({
      vehicle_category: {
        value: 'Four-wheeler',
        source_document: 'enforcement_image',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional image observation; no live model or government request ran in this proof.',
      },
      colour: {
        value: 'White',
        source_document: 'enforcement_image',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional image observation; no live model or government request ran in this proof.',
      },
      make_model: {
        value: 'Maruti Swift',
        source_document: 'enforcement_image',
        confidence: 'high',
        visibility: 'clear',
        limitation: 'Bundled fictional image observation; no live model or government request ran in this proof.',
      },
      offence_assessable: {
        value: 'yes',
        evidence_reference: 'Image · marked stop-line area',
        limitation: 'The relevant scene area is visible; this does not decide whether an offence occurred.',
      },
    });
    expect(flagship?.extraction.challan_document.alleged_offence.value)
      .toBe('Stopping beyond the marked stop line');
  });

  it('preserves every source limitation in the public comparison trace and text pack', () => {
    const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
    expect(flagship).toBeDefined();
    if (!flagship) return;

    const result = compareSyntheticEvidence(flagship.extraction);
    const category = result.rows.find((row) => row.field === 'vehicle_category');
    expect(category?.sources).toEqual([
      expect.objectContaining({
        sourceDocument: 'vehicle_record',
        limitation: 'Bundled fictional vehicle-record observation; not independent or official verification.',
      }),
      expect.objectContaining({
        sourceDocument: 'enforcement_image',
        limitation: 'Bundled fictional image observation; no live model or government request ran in this proof.',
      }),
    ]);

    const pack = buildSyntheticActionPack(
      flagship.extraction,
      result,
      decideSyntheticResolutionPath(result),
    );
    expect(pack).toContain('Bundled fictional vehicle-record observation; not independent or official verification.');
    expect(pack).toContain('Bundled fictional image observation; no live model or government request ran in this proof.');
  });

  it('projects only a confirmed same-revision high-and-clear explicit class conflict', () => {
    const project = Reflect.get(SyntheticPipeline, 'projectSyntheticClassConflictFacts') as undefined | ((input: {
      extraction: SyntheticEvidenceExtraction;
      resultRevisionId: string;
      confirmation: { status: 'confirmed'; resultRevisionId: string };
    }) => { status: string; facts?: { supportedSignals: readonly string[] } });
    expect(project).toBeTypeOf('function');
    if (!project) return;

    const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
    expect(flagship).toBeDefined();
    if (!flagship) return;
    const resultRevisionId = '11111111111111111111111111111111';

    expect(project({
      extraction: flagship.extraction,
      resultRevisionId,
      confirmation: { status: 'confirmed', resultRevisionId },
    })).toMatchObject({
      status: 'eligible',
      facts: {
        reviewRevisionId: resultRevisionId,
        citizenVehicleClass: {
          value: 'two-wheeler',
          source: 'independent-vehicle-record',
          confidence: 'high',
          confirmation: 'citizen-confirmed',
          reviewRevisionId: resultRevisionId,
        },
        observedEvidenceVehicleClass: {
          value: 'four-wheeler',
          source: 'official-evidence-image',
          confidence: 'high',
          confirmation: 'citizen-confirmed',
          reviewRevisionId: resultRevisionId,
        },
        independentReadableVehicleRecord: {
          value: true,
          source: 'independent-vehicle-record',
          confidence: 'high',
          confirmation: 'citizen-confirmed',
          reviewRevisionId: resultRevisionId,
        },
        supportedSignals: ['vehicle-class-conflict'],
      },
    });

    const medium = structuredClone(flagship.extraction);
    medium.enforcement_image.vehicle_category.confidence = 'medium';
    expect(project({
      extraction: medium,
      resultRevisionId,
      confirmation: { status: 'confirmed', resultRevisionId },
    })).toEqual({ status: 'abstained', reason: 'class-facts-not-action-ready' });

    expect(project({
      extraction: flagship.extraction,
      resultRevisionId,
      confirmation: { status: 'confirmed', resultRevisionId: '22222222222222222222222222222222' },
    })).toEqual({ status: 'abstained', reason: 'confirmation-revision-mismatch' });
  });

  it('abstains when any class-conflict source, reference, limit, readability, or confirmation gate is weakened', () => {
    const project = Reflect.get(SyntheticPipeline, 'projectSyntheticClassConflictFacts') as undefined | ((input: {
      extraction: SyntheticEvidenceExtraction;
      resultRevisionId: string;
      confirmation: { status: 'confirmed'; resultRevisionId: string };
    }) => { status: string; reason?: string });
    expect(project).toBeTypeOf('function');
    if (!project) return;
    const flagship = syntheticEvaluationCases.find((item) => item.id === 'case-04-category-conflict');
    expect(flagship).toBeDefined();
    if (!flagship) return;
    const resultRevisionId = '11111111111111111111111111111111';
    const mutations: Array<(draft: SyntheticEvidenceExtraction) => void> = [
      (draft) => { draft.vehicle_record.vehicle_category.visibility = 'partial'; },
      (draft) => { draft.vehicle_record.vehicle_category.evidence_reference = ''; },
      (draft) => { draft.vehicle_record.vehicle_category.limitation = ''; },
      (draft) => { draft.vehicle_record.vehicle_category.source_document = 'enforcement_image'; },
      (draft) => { draft.vehicle_record.vehicle_category.user_confirmation_required = false as true; },
      (draft) => { draft.enforcement_image.vehicle_category.confidence = 'medium'; },
      (draft) => { draft.enforcement_image.vehicle_category.evidence_reference = ''; },
      (draft) => { draft.enforcement_image.vehicle_category.limitation = ''; },
      (draft) => { draft.vehicle_record.registration.value = 'Unreadable'; },
      (draft) => { draft.vehicle_record.registration.visibility = 'unclear'; },
      (draft) => { draft.vehicle_record.registration.confidence = 'medium'; },
      (draft) => { draft.vehicle_record.registration.evidence_reference = ''; },
      (draft) => { draft.vehicle_record.registration.limitation = ''; },
    ];

    for (const mutate of mutations) {
      const draft = structuredClone(flagship.extraction);
      mutate(draft);
      expect(project({
        extraction: draft,
        resultRevisionId,
        confirmation: { status: 'confirmed', resultRevisionId },
      })).toEqual({ status: 'abstained', reason: 'class-facts-not-action-ready' });
    }
  });
});
