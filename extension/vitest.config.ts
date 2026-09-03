import { defineConfig } from 'vitest/config';
import { getExtensionBuildProfile } from './src/manifest';

const testProfile = getExtensionBuildProfile('synthetic-development');
if (!testProfile) throw new Error('Synthetic extension test profile is unavailable.');

export default defineConfig({
  define: {
    __CHALLANSAKSHI_EXTENSION_BUILD_PROFILE__: JSON.stringify(testProfile.id),
    __CHALLANSAKSHI_EXTENSION_SOURCE_AUTHORITY__: JSON.stringify({
      profileId: testProfile.id,
      envelopeMode: testProfile.envelopeMode,
      sourceRegistry: testProfile.sourceRegistry,
      envelopeValidationAuthority: testProfile.envelopeValidationAuthority,
    }),
    __CHALLANSAKSHI_EXTENSION_VISIBLE_ENVIRONMENT_LABEL__: JSON.stringify(testProfile.visibleEnvironmentLabel),
  },
  test: {
    environment: 'node',
    include: ['extension/tests/**/*.test.ts'],
    passWithNoTests: false,
  },
});
