import type { APIRoute } from 'astro';
import { clientReaders } from '../../lib/matchReaders';

// Static endpoint → dist/data/match-readers.json (fetched by the quiz on demand).
export const GET: APIRoute = () =>
  new Response(JSON.stringify(clientReaders), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
