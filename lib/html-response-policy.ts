/** Prevent intermediary HTML injection without changing caching or consuming the stream. */
export function applyHtmlResponsePolicy(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api' || pathname.startsWith('/api/')) return response;

  const mediaType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'text/html') return response;

  const cacheControl = response.headers.get('cache-control') ?? '';
  // Quoted extension values can contain commas; they are not standalone directives.
  const directives = cacheControl.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g) ?? [];
  if (directives.some(directive => directive.trim().toLowerCase() === 'no-transform')) return response;

  // Copy response metadata and headers while passing the original streaming body through.
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set('cache-control', cacheControl ? `${cacheControl}, no-transform` : 'no-transform');
  return protectedResponse;
}
