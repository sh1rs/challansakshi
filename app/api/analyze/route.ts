const allowedFixtureIds = ['mismatch', 'inconclusive', 'consistent'] as const;
type AllowedFixtureId = (typeof allowedFixtureIds)[number];

const analysisTargets: Record<AllowedFixtureId, { panel: 'left' | 'middle' | 'right'; offenceCriterion: string }> = {
  mismatch: { panel: 'left', offenceCriterion: 'whether the rider head area and helmet presence are visible enough to assess' },
  inconclusive: { panel: 'middle', offenceCriterion: 'whether the signal phase, stop line, and vehicle position are visible enough to assess together' },
  consistent: { panel: 'right', offenceCriterion: 'whether the rider head area and helmet presence are visible enough to assess' },
};

interface StructuredFact {
  field: 'observed_registration' | 'observed_category' | 'observed_colour' | 'offence_assessable';
  value: string;
  source_document: 'synthetic_enforcement_image';
  confidence: 'high' | 'medium' | 'low';
  visibility: 'clear' | 'partial' | 'unclear' | 'not-visible';
  uncertainty: string;
  evidence_reference: string;
  user_confirmation_required: true;
}

interface StructuredAnalysis {
  facts: StructuredFact[];
  limitations: string[];
  analysis_notice: string;
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['facts', 'limitations', 'analysis_notice'],
  properties: {
    facts: {
      type: 'array', minItems: 4, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['field', 'value', 'source_document', 'confidence', 'visibility', 'uncertainty', 'evidence_reference', 'user_confirmation_required'],
        properties: {
          field: { type: 'string', enum: ['observed_registration', 'observed_category', 'observed_colour', 'offence_assessable'] },
          value: { type: 'string', maxLength: 160 },
          source_document: { type: 'string', enum: ['synthetic_enforcement_image'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          visibility: { type: 'string', enum: ['clear', 'partial', 'unclear', 'not-visible'] },
          uncertainty: { type: 'string', maxLength: 280 },
          evidence_reference: { type: 'string', maxLength: 120 },
          user_confirmation_required: { type: 'boolean', enum: [true] },
        },
      },
    },
    limitations: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 240 } },
    analysis_notice: { type: 'string', maxLength: 240 },
  },
} as const;

function isStructuredAnalysis(value: unknown): value is StructuredAnalysis {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StructuredAnalysis>;
  if (!Array.isArray(candidate.facts) || candidate.facts.length !== 4 || !Array.isArray(candidate.limitations) || typeof candidate.analysis_notice !== 'string') return false;
  const expectedFields = new Set(['observed_registration', 'observed_category', 'observed_colour', 'offence_assessable']);
  return candidate.facts.every((fact) => {
    if (!fact || typeof fact !== 'object') return false;
    const item = fact as StructuredFact;
    expectedFields.delete(item.field);
    return typeof item.value === 'string'
      && item.source_document === 'synthetic_enforcement_image'
      && ['high', 'medium', 'low'].includes(item.confidence)
      && ['clear', 'partial', 'unclear', 'not-visible'].includes(item.visibility)
      && typeof item.uncertainty === 'string'
      && typeof item.evidence_reference === 'string'
      && item.user_confirmation_required === true;
  }) && expectedFields.size === 0;
}

function extractOutputText(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const candidate = response as { output_text?: unknown; output?: unknown };
  if (typeof candidate.output_text === 'string') return candidate.output_text;
  if (!Array.isArray(candidate.output)) return null;
  for (const item of candidate.output) {
    if (!item || typeof item !== 'object' || !Array.isArray((item as { content?: unknown }).content)) continue;
    for (const content of (item as { content: unknown[] }).content) {
      if (content && typeof content === 'object' && (content as { type?: unknown }).type === 'output_text' && typeof (content as { text?: unknown }).text === 'string') {
        return (content as { text: string }).text;
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return Response.json({ error: 'Live analysis is not configured.', fallback: true }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin) {
    return Response.json({ error: 'This demo endpoint accepts same-origin requests only.', fallback: true }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2_000) return Response.json({ error: 'Invalid demo request.', fallback: true }, { status: 413 });

  let body: { fixtureId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.', fallback: true }, { status: 400 });
  }

  if (typeof body.fixtureId !== 'string' || !allowedFixtureIds.includes(body.fixtureId as AllowedFixtureId)) {
    return Response.json({ error: 'Unknown synthetic fixture.', fallback: true }, { status: 400 });
  }
  const target = analysisTargets[body.fixtureId as AllowedFixtureId];
  const panel = target.panel;
  const instructions = [
    'Read only the specified panel of this wholly synthetic three-panel evidence contact sheet.',
    `Analyse the ${panel} panel only. Ignore the other two panels.`,
    'Extract observations; do not decide guilt, innocence, legality, validity, strategy, deadline, or likely outcome.',
    'Never identify a person or infer identity from appearance. Do not describe a face.',
    'Never fabricate plate characters. If the plate is blank, absent, or unreadable, use value "Unreadable" and visibility "unclear" or "not-visible".',
    `For offence_assessable, assess only ${target.offenceCriterion}; do not make a legal conclusion.`,
    'The offence_assessable value must begin with exactly "Yes", "No", or "Unclear", followed by a short visual observation.',
    'Every observation requires user confirmation. State concrete visual limitations.',
  ].join(' ');

  try {
    const syntheticAsset = await fetch(new URL('/evidence-contact-sheet.png', requestUrl));
    if (!syntheticAsset.ok || syntheticAsset.headers.get('content-type')?.startsWith('image/') !== true) {
      return Response.json({ error: 'Synthetic demo image is unavailable.', fallback: true }, { status: 503 });
    }
    const bytes = new Uint8Array(await syntheticAsset.arrayBuffer());
    if (bytes.byteLength > 3_000_000) return Response.json({ error: 'Synthetic demo image is unavailable.', fallback: true }, { status: 503 });
    let binary = '';
    for (let index = 0; index < bytes.length; index += 32_768) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 32_768));
    }
    const imageDataUrl = `data:${syntheticAsset.headers.get('content-type')};base64,${btoa(binary)}`;
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: `Synthetic fixture: ${body.fixtureId}. Return four source-linked observations for the ${panel} image panel.` },
            { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
          ],
        }],
        text: { format: { type: 'json_schema', name: 'challansakshi_evidence_analysis', strict: true, schema: responseSchema } },
        max_output_tokens: 900,
      }),
    });

    if (!openAIResponse.ok) return Response.json({ error: 'Live analysis failed; using the demo fixture.', fallback: true }, { status: 502 });
    const raw = await openAIResponse.json() as unknown;
    const outputText = extractOutputText(raw);
    if (!outputText) return Response.json({ error: 'Live analysis returned no usable output.', fallback: true }, { status: 502 });
    const parsed = JSON.parse(outputText) as unknown;
    if (!isStructuredAnalysis(parsed)) return Response.json({ error: 'Live analysis did not match the required structure.', fallback: true }, { status: 502 });
    return Response.json({ analysis: parsed, mode: 'live', model });
  } catch {
    return Response.json({ error: 'Live analysis is unavailable; using the demo fixture.', fallback: true }, { status: 502 });
  }
}
