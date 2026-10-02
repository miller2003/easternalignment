import type { APIRoute } from 'astro';
import { auditStats } from '../../lib/auditStats';
import { SITE } from '../../lib/seo';

/**
 * Machine-readable copy of the numbers on the homepage "What our audits show"
 * section — the file the homepage Dataset JSON-LD points at.
 * Built from content at build time (see lib/auditStats.ts), so it can never
 * disagree with the page.
 */
export const GET: APIRoute = () => {
  const body = {
    name: 'Eastern Alignment online psychic platform audit',
    description:
      'Platform-level and advisor-level figures from Eastern Alignment’s audit of public advisor profiles on Kasamba, Purple Garden and Keen: listed per-minute rates, our audit scores, and each platform’s new-client welcome offer.',
    publisher: 'Eastern Alignment',
    publisherUrl: SITE,
    pageUrl: `${SITE}/`,
    methodologyUrl: `${SITE}/methodology/`,
    dateModified: auditStats.lastUpdated,
    currency: 'USD',
    definitions: {
      listedRate:
        'The lowest per-minute rate shown on an advisor’s public profile (chat, phone or video, whichever is lowest). Advisors set their own rates and can change them at any time.',
      auditScore:
        'Eastern Alignment’s editorial 1–5 score for the advisor, from our published scoring weights. It is an expert assessment, not an average of client reviews.',
      shareAtOrUnder5PerMin: 'Percent of audited advisors whose listed rate is $5.00/min or less.',
    },
    citation:
      `Eastern Alignment (${auditStats.lastUpdated.slice(0, 4)}). Online psychic platform audit. ${SITE}/ — data last updated ${auditStats.lastUpdated}.`,
    usage: 'Free to quote or cite with a link to https://easternalignment.com/.',
    overall: auditStats.overall,
    platforms: auditStats.platforms,
    advisors: auditStats.advisors,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
