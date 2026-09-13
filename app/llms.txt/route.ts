import { llmOverviewResponse } from '../../lib/site-discovery';

export function GET(): Response { return llmOverviewResponse(); }
