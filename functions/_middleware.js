/**
 * Cloudflare Pages Functions middleware — host canonicalization.
 *
 * GSC shows both www.easternalignment.com and easternalignment.com URLs being
 * indexed, which splits link equity across two hosts. Cloudflare's _redirects
 * file cannot match on hostname, so the 301 has to happen here at the edge.
 *
 * Behaviour:
 *  - Any request to www.<apex> (or any non-apex host serving this project)
 *    is 301-redirected to https://easternalignment.com, preserving path+query.
 *  - Requests already on the apex pass through untouched.
 *  - Pages preview URLs (*.easternalignment.pages.dev) are left alone so
 *    preview deployments keep working.
 */
const APEX = 'easternalignment.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  const isApex = host === APEX;
  const isPreview = host.endsWith('.pages.dev') || host === 'localhost' || host === '127.0.0.1';

  if (!isApex && !isPreview) {
    url.hostname = APEX;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
