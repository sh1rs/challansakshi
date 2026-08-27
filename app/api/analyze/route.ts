const allowedFixtureIds = ['mismatch', 'inconclusive', 'consistent'] as const;
type AllowedFixtureId = (typeof allowedFixtureIds)[number];

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

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4_000_000) return Response.json({ error: 'Synthetic demo image is too large.', fallback: true }, { status: 413 });

  let body: { fixtureId?: unknown; imageDataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.', fallback: true }, { status: 400 });
  }

  if (typeof body.fixtureId !== 'string' || !allowedFixtureIds.includes(body.fixtureId as AllowedFixtureId)) {
    return Response.json({ error: 'Unknown synthetic fixture.', fallback: true }, { status: 400 });
  }
  if (typeof body.imageDataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(body.imageDataUrl) || body.imageDataUrl.length > 3_500_000) {
    return Response.json({ error: 'A valid synthetic demo image is required.', fallback: true }, { status: 400 });
  }

  const panel = body.fixtureId === 'mismatch' ? 'left' : body.fixtureId === 'inconclusive' ? 'middle' : 'right';
  const instructions = [
    'Read only the specified panel of this wholly synthetic three-panel evidence contact sheet.',
    `Analyse the ${panel} panel only. Ignore the other two panels.`,
    'Extract observations; do not decide guilt, innocence, legality, validity, strategy, deadline, or likely outcome.',
    'Never identify a person or infer identity from appearance. Do not describe a face.',
    'Never fabricate plate characters. If the plate is blank, absent, or unreadable, use value "Unreadable" and visibility "unclear" or "not-visible".',
    'For offence_assessable, describe only whether a helmet-related fact is visibly assessable; do not make a legal conclusion.',
    'Every observation requires user confirmation. State concrete visual limitations.',
  ].join(' ');

  try {
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
            { type: 'input_image', image_url: body.imageDataUrl, detail: 'high' },
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
