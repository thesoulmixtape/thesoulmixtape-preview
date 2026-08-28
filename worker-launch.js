import baseWorker from './worker.js';

const PRODUCTION_ORIGINS = new Set([
  'https://thesoulmixtape.com',
  'https://www.thesoulmixtape.com'
]);

const INTERNAL_ALLOWED_ORIGIN =
  'https://thesoulmixtape-v44-preview.vercel.app';

export default {
  async fetch(request, env, ctx) {
    const originalOrigin = request.headers.get('Origin');

    if (!PRODUCTION_ORIGINS.has(originalOrigin)) {
      return baseWorker.fetch(request, env, ctx);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('Origin', INTERNAL_ALLOWED_ORIGIN);

    const adaptedRequest = new Request(request, {
      headers: requestHeaders
    });

    const response = await baseWorker.fetch(adaptedRequest, env, ctx);
    const responseHeaders = new Headers(response.headers);

    if (
      responseHeaders.get('Access-Control-Allow-Origin') ===
      INTERNAL_ALLOWED_ORIGIN
    ) {
      responseHeaders.set(
        'Access-Control-Allow-Origin',
        originalOrigin
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }
};
