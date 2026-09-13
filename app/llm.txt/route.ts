import { llmOverviewResponse } from '../../lib/site-discovery';

/** Compatibility spelling; maintained from the same public facts as /llms.txt. */
export function GET(): Response { return llmOverviewResponse(); }
