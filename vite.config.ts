import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    // The local Worker does not inherit arbitrary Node environment variables.
    // Forward only these non-secret acceptance constants, and only while serving
    // tests. Production builds and ordinary previews keep the real server clock.
    define: command === 'serve' && process.env.CHALLANSAKSHI_BROWSER_ACCEPTANCE === '1'
      ? {
        'process.env.CHALLANSAKSHI_BROWSER_ACCEPTANCE': JSON.stringify('1'),
        'process.env.CHALLANSAKSHI_ACCEPTANCE_NOW_ISO': JSON.stringify(process.env.CHALLANSAKSHI_ACCEPTANCE_NOW_ISO ?? ''),
      }
      : {},
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      }),
    ],
  };
});
