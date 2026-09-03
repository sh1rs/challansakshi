import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import playwrightConfig from '../playwright.config';
import {
  assessChromiumLane,
  CHROMIUM_FLOOR,
  createUserDataDirectory,
  DIAGNOSTIC_PROJECT,
  launchArgumentsFor,
  parseChromiumMajor,
  SKIP_BELOW_FLOOR,
  SKIP_NO_EXECUTABLE,
  STRICT_PROJECT,
  syntheticDistDirectory,
} from './browser/harness';

const extensionRoot = resolve(import.meta.dirname, '..');
const specSource = readFileSync(new URL('./browser/loaded-extension.spec.ts', import.meta.url), 'utf8');

describe('loaded-package harness contract', () => {
  it('keeps the two Playwright projects, serial workers, and the browser test directory exact', () => {
    const config = playwrightConfig as unknown as {
      testDir?: string;
      fullyParallel?: boolean;
      workers?: number;
      projects?: Array<{ name?: string; testMatch?: unknown }>;
    };
    expect(config.testDir).toBe('./tests/browser');
    expect(config.fullyParallel).toBe(false);
    expect(config.workers).toBe(1);
    expect(config.projects?.map((project) => project.name)).toEqual([
      DIAGNOSTIC_PROJECT,
      STRICT_PROJECT,
    ]);
    for (const project of config.projects ?? []) {
      expect(project.testMatch).toBe('**/loaded-extension.spec.ts');
    }
  });

  it('parses Chromium majors defensively', () => {
    expect(parseChromiumMajor('153.0.8010.12')).toBe(153);
    expect(parseChromiumMajor('152.0.0.0')).toBe(152);
    expect(parseChromiumMajor('151.0.7922.34')).toBe(151);
    expect(parseChromiumMajor('')).toBeNull();
    expect(parseChromiumMajor('HeadlessChrome')).toBeNull();
    expect(parseChromiumMajor('12abc.0')).toBeNull();
    expect(parseChromiumMajor('0.1.2.3')).toBeNull();
  });

  it('hard-fails the strict lane for absent, unparsable, or below-floor Chromium and never skips it', () => {
    expect(CHROMIUM_FLOOR).toBe(152);
    expect(assessChromiumLane({ projectName: STRICT_PROJECT, executableExists: false, version: null }))
      .toEqual({ mode: 'fail', message: SKIP_NO_EXECUTABLE });
    expect(assessChromiumLane({ projectName: STRICT_PROJECT, executableExists: true, version: 'garbage' }))
      .toEqual({ mode: 'fail', message: SKIP_BELOW_FLOOR });
    expect(assessChromiumLane({ projectName: STRICT_PROJECT, executableExists: true, version: '151.0.7922.34' }))
      .toEqual({ mode: 'fail', message: SKIP_BELOW_FLOOR });
    expect(assessChromiumLane({ projectName: STRICT_PROJECT, executableExists: true, version: '152.0.0.1' }))
      .toEqual({ mode: 'run' });
    expect(assessChromiumLane({ projectName: STRICT_PROJECT, executableExists: true, version: '153.0.8010.12' }))
      .toEqual({ mode: 'run' });
  });

  it('keeps the diagnostic lane a characterization skip with the exact structured messages', () => {
    expect(SKIP_BELOW_FLOOR).toBe('loaded-package lane skipped: Chromium < 152');
    expect(SKIP_NO_EXECUTABLE).toBe('loaded-package lane skipped: Chromium executable unavailable');
    expect(assessChromiumLane({ projectName: DIAGNOSTIC_PROJECT, executableExists: false, version: null }))
      .toEqual({ mode: 'skip', message: SKIP_NO_EXECUTABLE });
    expect(assessChromiumLane({ projectName: DIAGNOSTIC_PROJECT, executableExists: true, version: '151.0.7922.34' }))
      .toEqual({ mode: 'skip', message: SKIP_BELOW_FLOOR });
    expect(assessChromiumLane({ projectName: DIAGNOSTIC_PROJECT, executableExists: true, version: '153.0.8010.12' }))
      .toEqual({ mode: 'run' });
    expect(assessChromiumLane({ projectName: 'unknown-project', executableExists: true, version: '153.0.8010.12' }))
      .toEqual({ mode: 'fail', message: 'unknown loaded-package project' });
  });

  it('loads only the exact synthetic unpacked directory with matching load and disable flags', () => {
    const directory = syntheticDistDirectory(extensionRoot);
    expect(directory.endsWith(`${sep}dist${sep}synthetic-development`)).toBe(true);
    const flags = launchArgumentsFor(directory);
    expect(flags).toEqual([
      `--disable-extensions-except=${directory}`,
      `--load-extension=${directory}`,
    ]);
  });

  it('creates fresh ignored extension-only user-data directories and reuses one only on request', () => {
    const first = createUserDataDirectory('contract-check');
    const second = createUserDataDirectory('contract-check');
    expect(first).not.toBe(second);
    expect(first).toContain(`${sep}.playwright${sep}profiles${sep}`);
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);
    const reused = createUserDataDirectory('contract-check', first);
    expect(reused).toBe(first);
  });

  it('keeps the spec honest about what the automated lane cannot prove', () => {
    expect(specSource).toContain("from './harness'");
    expect(specSource).toContain('launchPersistentContext');
    expect(specSource).toContain('SKIP_BELOW_FLOOR');
    expect(specSource).toContain('SKIP_NO_EXECUTABLE');
    expect(specSource).not.toMatch(/test\.only|describe\.only|\.skip\(true\s*\)\s*;?\s*$/mu);
    expect(specSource).toContain('never claims action-icon invocation, temporary activeTab, or fixture mutation');
  });
});
