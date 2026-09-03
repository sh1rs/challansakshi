import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type InlineConfig, type Plugin } from 'vite';
import {
  getExtensionBuildProfile,
  type ExtensionBuildProfile,
  type ExtensionBuildProfileId,
} from './src/manifest';

export type ExtensionBuildTarget = 'popup' | 'worker';

const extensionRoot = fileURLToPath(new URL('.', import.meta.url));
const virtualPopupEntry = '\0challansakshi:popup.ts';
const virtualPopupStyle = '\0challansakshi:popup.css';
const virtualWorkerEntry = '\0challansakshi:service-worker.ts';

function optionalEntryPlugin(profile: ExtensionBuildProfile): Plugin {
  const popupEntry = resolve(extensionRoot, 'src/popup.ts');
  const popupStyle = resolve(extensionRoot, 'src/popup.css');
  const workerEntry = resolve(extensionRoot, 'src/service-worker.ts');
  return {
    name: 'challansakshi-optional-extension-entries',
    resolveId(source) {
      if (source === 'virtual:challansakshi-popup.ts') {
        return existsSync(popupEntry) ? popupEntry : virtualPopupEntry;
      }
      if (source === 'virtual:challansakshi-popup.css') {
        return existsSync(popupStyle) ? popupStyle : virtualPopupStyle;
      }
      if (source === 'virtual:challansakshi-service-worker.ts') {
        return existsSync(workerEntry) ? workerEntry : virtualWorkerEntry;
      }
      return null;
    },
    load(id) {
      if (id === virtualPopupEntry) {
        return `const environment = document.querySelector('#extension-environment');\nif (environment) environment.textContent = ${JSON.stringify(profile.visibleEnvironmentLabel)};`;
      }
      if (id === virtualPopupStyle) {
        return ':root { color-scheme: light; }\n';
      }
      if (id === virtualWorkerEntry) {
        return `export const extensionBuildProfile = Object.freeze(${JSON.stringify(profile)});`;
      }
      return null;
    },
  };
}

export function createExtensionViteConfig(
  profileId: ExtensionBuildProfileId,
  target: ExtensionBuildTarget,
): InlineConfig {
  const profile = getExtensionBuildProfile(profileId);
  if (!profile || (target !== 'popup' && target !== 'worker')) {
    throw new Error('Invalid extension Vite build selection.');
  }
  const outDir = resolve(extensionRoot, 'dist', profile.id);
  const popup = target === 'popup';
  const selectedSourceAuthority = {
    profileId: profile.id,
    envelopeMode: profile.envelopeMode,
    sourceRegistry: profile.sourceRegistry,
    envelopeValidationAuthority: profile.envelopeValidationAuthority,
  };
  return {
    configFile: false,
    base: './',
    root: extensionRoot,
    publicDir: false,
    plugins: [optionalEntryPlugin(profile)],
    define: {
      __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: JSON.stringify(profile.id),
      __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__: JSON.stringify(selectedSourceAuthority),
      __CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: JSON.stringify(profile.visibleEnvironmentLabel),
    },
    build: {
      target: `chrome${profile.minimumChromeVersion}`,
      outDir,
      emptyOutDir: popup,
      sourcemap: false,
      modulePreload: { polyfill: false },
      cssCodeSplit: false,
      rollupOptions: {
        input: popup ? resolve(extensionRoot, 'popup.html') : 'virtual:challansakshi-service-worker.ts',
        output: popup
          ? {
              entryFileNames: 'popup.js',
              chunkFileNames: 'chunks/[name].js',
              assetFileNames: (assetInfo) => assetInfo.names.some((name) => name.endsWith('.css'))
                ? 'popup.css'
                : '[name][extname]',
            }
          : {
              entryFileNames: 'service-worker.js',
              chunkFileNames: 'chunks/[name].js',
              assetFileNames: '[name][extname]',
              inlineDynamicImports: true,
            },
      },
    },
  };
}

export default defineConfig(() => {
  throw new Error('Use extension/scripts/build.mjs with one closed build profile.');
});
