import type { CaseFact, ServiceKind } from './cases';

export type HelperSnapshot = {
  title: string;
  service: ServiceKind;
  jurisdiction: string;
  facts: Pick<CaseFact, 'key' | 'label' | 'value' | 'source' | 'confirmed'>[];
  draft: string;
};
export type HelperInvitation = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseRevision: number;
  helperEmail: string;
  createdAt: string;
  expiresAt: string;
  status: 'invited' | 'accepted' | 'revoked' | 'expired' | 'case-changed' | 'applied';
  revision: number;
  proposal: { draft: string; at: string } | null;
};

export const HELPER_SCOPE_DESCRIPTION = 'One selected case snapshot. Preparation suggestions only. No account, payment or official-service access.';
