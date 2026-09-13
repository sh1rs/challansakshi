import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../scripts/codex-deploy.sh', import.meta.url), 'utf8');
const originalConfig = '{\n  "name": "fixture-only",\n  "compatibility_date": "2026-05-22"\n}\n';

describe('deployment configuration recovery without network or real deployment', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'challansakshi-deploy-fixture-'));
    for (const path of ['scripts', 'node_modules/vinext/dist', 'node_modules/.bin']) mkdirSync(join(directory, path), { recursive: true });
    writeFileSync(join(directory, 'scripts/codex-deploy.sh'), source);
    writeFileSync(join(directory, 'wrangler.jsonc'), originalConfig);
    writeFileSync(join(directory, 'node_modules/vinext/dist/cli.js'), `const fs = require('node:fs');
      fs.copyFileSync('wrangler.jsonc', 'build-config.json');
      process.exit(Number(process.env.FIXTURE_BUILD_EXIT || 0));`);
    writeFileSync(join(directory, 'node_modules/.bin/wrangler'), '#!/bin/sh\nprintf \'%s\\n\' "$@" > deploy-args.txt\nexit "${FIXTURE_UPLOAD_EXIT:-0}"\n', { mode: 0o755 });
  });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  function run(args: string[] = [], env: Record<string, string> = {}) {
    return spawnSync('sh', [join(directory, 'scripts/codex-deploy.sh'), ...args], {
      cwd: directory, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 10_000,
    });
  }
  function restored() {
    expect(readFileSync(join(directory, 'wrangler.jsonc'), 'utf8')).toBe(originalConfig);
    expect(existsSync(join(directory, '.wrangler/codex-deploy.lock'))).toBe(false);
  }

  it('builds with the production date and restores local config after a dry run', () => {
    const result = run(['--dry-run']);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(join(directory, 'build-config.json'), 'utf8')).compatibility_date).toBe('2026-08-28');
    expect(readFileSync(join(directory, 'deploy-args.txt'), 'utf8')).toBe('deploy\n--dry-run\n--config\ndist/server/wrangler.json\n');
    restored();
  });

  it('restores config and skips upload after a failed build', () => {
    expect(run([], { FIXTURE_BUILD_EXIT: '7' }).status).toBe(7);
    expect(existsSync(join(directory, 'deploy-args.txt'))).toBe(false);
    restored();
  });

  it('restores config and preserves a failed upload exit code', () => {
    const result = run([], { FIXTURE_UPLOAD_EXIT: '9' });
    expect(result.status).toBe(9);
    expect(result.stdout).not.toContain('CODEX-DEPLOY OK');
    restored();
  });

  it('rejects unknown arguments before a typo can trigger a real deployment', () => {
    const result = run(['--dryrun']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage:');
    expect(existsSync(join(directory, 'build-config.json'))).toBe(false);
    restored();
  });

  it('does not overwrite the backup or config belonging to another deployment', () => {
    const lock = join(directory, '.wrangler/codex-deploy.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'wrangler.jsonc'), 'existing-recovery-copy');
    expect(run().status).toBe(1);
    expect(readFileSync(join(lock, 'wrangler.jsonc'), 'utf8')).toBe('existing-recovery-copy');
    expect(readFileSync(join(directory, 'wrangler.jsonc'), 'utf8')).toBe(originalConfig);
    expect(existsSync(join(directory, 'build-config.json'))).toBe(false);
  });

  it('also cleans up after the initial config validation fails', () => {
    const invalid = '{"name":"fixture-missing-date"}\n';
    writeFileSync(join(directory, 'wrangler.jsonc'), invalid);
    expect(run().status).toBe(1);
    expect(readFileSync(join(directory, 'wrangler.jsonc'), 'utf8')).toBe(invalid);
    expect(existsSync(join(directory, '.wrangler/codex-deploy.lock'))).toBe(false);
  });
});
