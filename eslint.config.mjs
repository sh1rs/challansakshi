import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['extension/src/**/*.ts'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: 'readonly',
        __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__: 'readonly',
      },
    },
  },
  {
    files: [
      'extension/tests/**/*.ts',
      'extension/*.config.ts',
      'extension/scripts/**/*.mjs',
    ],
    languageOptions: {
      globals: {
        chrome: 'readonly',
      },
    },
  },
  globalIgnores([
    'public/document-assets/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'extension/dist/**',
    'extension/release/**',
    'extension/test-results/**',
    'extension/playwright-report/**',
    'extension/.playwright/**',
  ]),
]);

export default eslintConfig;
