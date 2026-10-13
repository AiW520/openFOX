export const PUBLISHER_CREDENTIAL_MARKER = 'opentu-publisher:shared';

export function isPublisherCredential(apiKey: string): boolean {
  return apiKey === PUBLISHER_CREDENTIAL_MARKER;
}

export function preparePublisherRequest(
  apiKey: string,
  url: string,
  init: RequestInit
): { url: string; init: RequestInit } {
  if (!isPublisherCredential(apiKey)) return { url, init };
  const parsed = new URL(url);
  parsed.searchParams.delete('key');
  parsed.searchParams.delete('api_key');
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  headers.delete('X-API-Key');
  headers.delete('x-goog-api-key');
  const path = `${parsed.pathname}${parsed.search}`;
  return {
    url: new URL(`/api/publisher/proxy?path=${encodeURIComponent(path)}`, globalThis.location.origin).href,
    init: { ...init, headers, credentials: 'same-origin' },
  };
}

export function publisherAwareFetch(apiKey: string, url: string, init: RequestInit): Promise<Response> {
  const request = preparePublisherRequest(apiKey, url, init);
  return fetch(request.url, request.init);
}
