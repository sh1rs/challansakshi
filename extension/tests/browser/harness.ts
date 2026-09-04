// Version gate and launch plumbing for the loaded-package Playwright lanes.
// Pure and mockable: the contract suite exercises every branch without a
// Chromium installation.
import { existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

export const CHROMIUM_FLOOR = 152;
export const DIAGNOSTIC_PROJECT = 'loaded-package-standalone';
export const STRICT_PROJECT = 'loaded-package-chromium-152-required';
export const SKIP_BELOW_FLOOR = 'loaded-package lane skipped: Chromium < 152';
export const SKIP_NO_EXECUTABLE = 'loaded-package lane skipped: Chromium executable unavailable';

export function parseChromiumMajor(version: string | null | undefined): number | null {
  if (typeof version !== 'string') return null;
  const match = /^(\d{1,4})\.\d+\.\d+(?:\.\d+)?$/u.exec(version.trim());
  if (!match) return null;
  const major = Number.parseInt(match[1]!, 10);
  if (!Number.isSafeInteger(major) || major <= 0) return null;
  return major;
}

export type LaneAssessment =
  | Readonly<{ mode: 'run' }>
  | Readonly<{ mode: 'skip'; message: string }>
  | Readonly<{ mode: 'fail'; message: string }>;

export function assessChromiumLane(input: Readonly<{
  projectName: string;
  executableExists: boolean;
  version: string | null;
}>): LaneAssessment {
  const strict = input.projectName === STRICT_PROJECT;
  const diagnostic = input.projectName === DIAGNOSTIC_PROJECT;
  if (!strict && !diagnostic) return { mode: 'fail', message: 'unknown loaded-package project' };
  if (!input.executableExists) {
    return strict
      ? { mode: 'fail', message: SKIP_NO_EXECUTABLE }
      : { mode: 'skip', message: SKIP_NO_EXECUTABLE };
  }
  const major = parseChromiumMajor(input.version);
  if (major === null || major < CHROMIUM_FLOOR) {
    return strict
      ? { mode: 'fail', message: SKIP_BELOW_FLOOR }
      : { mode: 'skip', message: SKIP_BELOW_FLOOR };
  }
  return { mode: 'run' };
}

export function syntheticDistDirectory(extensionRoot: string): string {
  const directory = resolve(extensionRoot, 'dist/synthetic-development');
  if (!existsSync(directory) || !existsSync(resolve(directory, 'manifest.json'))) {
    throw new Error('synthetic unpacked directory is not built');
  }
  return realpathSync(directory);
}

export function launchArgumentsFor(directory: string): readonly string[] {
  return [
    `--disable-extensions-except=${directory}`,
    `--load-extension=${directory}`,
  ];
}

/**
 * Fresh ignored extension-only user-data directory per test. Passing an
 * existing directory back reuses it, which only the explicit restart
 * assertion may do.
 */
export function createUserDataDirectory(label: string, reuse?: string): string {
  if (reuse) return reuse;
  const extensionRoot = resolve(import.meta.dirname, '../..');
  const profileRoot = resolve(extensionRoot, '.playwright/profiles');
  mkdirSync(profileRoot, { recursive: true });
  const directory = resolve(profileRoot, `${label}-${randomBytes(8).toString('hex')}`);
  mkdirSync(directory);
  return directory;
}

/** Remove a user-data directory created by createUserDataDirectory. */
export function removeUserDataDirectory(directory: string): void {
  const extensionRoot = resolve(import.meta.dirname, '../..');
  const profileRoot = resolve(extensionRoot, '.playwright/profiles');
  if (!directory.startsWith(profileRoot)) return;
  rmSync(directory, { recursive: true, force: true });
}
