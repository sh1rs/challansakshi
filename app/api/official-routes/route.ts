import { getPublicOfficialRoutes } from '../../../lib/public-official-routes';

export const dynamic = 'force-dynamic';

/** Read-only metadata. No record lookup, request payload, account or case database. */
export function GET() {
  return Response.json(getPublicOfficialRoutes(new Date().toISOString()), {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
