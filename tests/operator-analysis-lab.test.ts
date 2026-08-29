import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  new URL('../app/demo/test-lab/operator/page.tsx', import.meta.url),
  'utf8',
);
const componentSource = readFileSync(
  new URL('../components/test-lab/OperatorAnalysisLab.tsx', import.meta.url),
  'utf8',
);
const publicLabSource = readFileSync(
  new URL('../components/test-lab/SyntheticTestLabApp.tsx', import.meta.url),
  'utf8',
);

describe('controlled synthetic operator analysis lab', () => {
  it('renders upload controls only when both server-side feature flags are enabled', () => {
    expect(pageSource).toContain("process.env.ANALYSIS_ENABLED === 'true'");
    expect(pageSource).toContain("process.env.SYNTHETIC_UPLOADS_ENABLED === 'true'");
    expect(pageSource).toContain('Controlled model analysis is disabled');
  });

  it('requires an explicit synthetic-only attestation before a bounded request', () => {
    expect(componentSource).toContain('I confirm all three sources are wholly synthetic');
    expect(componentSource).toContain('I understand these supplied bytes will be sent to OpenAI');
    expect(componentSource).toContain("schema: 'challansakshi.synthetic-analysis-request.v2'");
    expect(componentSource).toContain('syntheticOnly: true');
    expect(componentSource).toContain('challanText');
    expect(componentSource).toContain('vehicleRecordText');
    expect(componentSource).toContain("fetch('/api/analyze'");
    expect(componentSource).toContain('2 * 1024 * 1024');
    expect(componentSource).toContain("['image/png', 'image/jpeg']");
  });

  it('validates the model extraction and routes it through the same human-confirmed workbench', () => {
    expect(componentSource).toContain('validateSyntheticEvidenceExtraction');
    expect(componentSource).toContain('<TestCaseWorkbench');
    expect(componentSource).toContain('The model returned observations only');
    expect(componentSource).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|console\./);
  });

  it('aborts and versions in-flight extraction so edits or Clear cannot restore stale results', () => {
    expect(componentSource).toContain('new AbortController()');
    expect(componentSource).toContain('requestIdRef');
    expect(componentSource).toContain('signal: controller.signal');
    expect(componentSource).toMatch(/requestId\s*!==\s*requestIdRef\.current/);
    expect(componentSource).toContain(".abort('operator-input-changed')");
  });

  it('is not linked from the public Test Lab', () => {
    expect(publicLabSource).not.toContain('/demo/test-lab/operator');
  });
});
