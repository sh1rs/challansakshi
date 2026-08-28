const productionHostname = 'challansakshi.sh1rs.com';

export function buildProductionHttpsRedirect(request: Request): Response | null {
  const url = new URL(request.url);

  if (url.protocol !== 'http:' || url.hostname !== productionHostname) {
    return null;
  }

  url.protocol = 'https:';

  return new Response(null, {
    status: 308,
    headers: { Location: url.toString() },
  });
}
