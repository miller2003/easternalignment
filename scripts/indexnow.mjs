// IndexNow submission — notifies Bing (feeds ChatGPT Search + Copilot), Yandex,
// Naver, Seznam of new/updated pages. Google does NOT consume IndexNow; for
// Google keep the sitemap + GSC.
//
// DESIGN (2026-10-01 rewrite)
//   The previous version kept a HAND-WRITTEN url list, which had to be edited on
//   every batch and silently drifted (9-21 pushed 83, 9-28 pushed 71 ES pages,
//   with different keys). Hand-written lists are exactly how URLs get missed.
//   This version reads the LIVE SITEMAP as the single source of truth, so a full
//   push can never omit a published page.
//
// USAGE
//   node scripts/indexnow.mjs                 # FULL push — every URL in the sitemap
//   node scripts/indexnow.mjs --dry           # list what would be sent, send nothing
//   node scripts/indexnow.mjs <url> [<url>…]  # push only the given URLs (subset)
//
//   Prereq: the site must be BUILT + DEPLOYED, and the key file must be reachable:
//   https://easternalignment.com/119e5df1ce0e4680b92809f9ad376edb.txt
//
// STATUS CODES
//   200 = accepted        202 = accepted, key validation pending
//   400 = bad request     403 = key file not valid / not reachable
//   422 = URLs don't belong to host, or key mismatch   429 = too many requests
//
// KEY (not a secret — it proves domain ownership because only the domain owner
// can host the file at the root): 119e5df1ce0e4680b92809f9ad376edb
// (issued by the Bing Webmaster Tools IndexNow setup flow, 2026-09-07)
//
// HISTORY
//   2026-09-20: 286 URLs (freshness refresh + verified stamp pass)
//   2026-09-21: 53 URLs (reader reviews batch 1-50 + 3 hubs)
//   2026-09-22: 83 URLs (batch 51-80 added, 1-50 kept as safety net)
//   2026-09-28: 71 ES URLs pushed via a one-off scratch script (key d3a06671…)
//   2026-10-01: rewritten to sitemap-driven full push.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'easternalignment.com';
const ORIGIN = `https://${HOST}`;
const KEY = '119e5df1ce0e4680b92809f9ad376edb';
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// IndexNow hard limit is 10,000 URLs per request. Batching keeps each request
// small enough to report per-batch status and to stay well clear of 429s.
const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 1500;

// Our own site sits behind Cloudflare, which answers 1010 to unknown/default
// user agents. Send a normal browser UA when reading our own sitemap.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(__dirname, '..', 'scratch', 'indexnow');

// --- URL filtering -----------------------------------------------------------
// The sitemap already excludes noindex / 404 pages (see astro.config.mjs), but
// apply a defence-in-depth filter so a future sitemap regression can't leak
// utility paths into IndexNow.
const BLOCKED_PATTERNS = [
  /\/go\//, // affiliate redirect gate — robots.txt Disallow
  /\/out\//,
  /\/refer\//,
  /\/404\/?$/,
  /\/api\//,
];

function isSubmittable(url) {
  if (!url.startsWith(`${ORIGIN}/`) && url !== ORIGIN) return false;
  if (url.includes('?')) return false; // query strings are never canonical
  if (url.includes('#')) return false;
  return !BLOCKED_PATTERNS.some((re) => re.test(url));
}

// --- Sitemap discovery ------------------------------------------------------
async function fetchText(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/xml,text/xml,*/*' },
  });
  if (res.status === 429 && attempt <= 3) {
    const wait = 3000 * attempt;
    console.warn(`  ! 429 on ${url} — retrying in ${wait}ms`);
    await sleep(wait);
    return fetchText(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

function extractLocs(xml) {
  const out = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

async function collectSitemapUrls() {
  const indexUrl = `${ORIGIN}/sitemap-index.xml`;
  console.log(`Reading ${indexUrl}`);
  const indexXml = await fetchText(indexUrl);
  const children = extractLocs(indexXml);

  // Accept both shapes: a sitemap index (children to recurse into) or a bare
  // urlset served directly at sitemap-index.xml.
  const looksLikeIndex = /<sitemapindex/i.test(indexXml);
  const sitemapUrls = looksLikeIndex ? children : [indexUrl];
  if (!looksLikeIndex) {
    console.log('  (not a sitemap index — reading it as a flat urlset)');
  } else {
    console.log(`  index lists ${sitemapUrls.length} child sitemap(s)`);
  }

  const all = [];
  for (const child of sitemapUrls) {
    const xml = await fetchText(child);
    const locs = extractLocs(xml);
    console.log(`  ${child} -> ${locs.length} URLs`);
    all.push(...locs);
  }
  return all;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submitBatch(urls, batchNo, batchTotal) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });

  const label = `batch ${batchNo}/${batchTotal} (${urls.length} URLs)`;
  if (res.status === 200 || res.status === 202) {
    console.log(`  ✅ ${label} -> HTTP ${res.status} accepted`);
  } else {
    const text = await res.text().catch(() => '');
    console.error(`  ❌ ${label} -> HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  return res.status;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const explicit = args.filter((a) => !a.startsWith('--'));

  let urls;
  if (explicit.length > 0) {
    urls = explicit;
    console.log(`\nSubset mode: ${urls.length} URL(s) supplied on the command line`);
  } else {
    urls = await collectSitemapUrls();
  }

  // Dedupe (sitemaps can repeat a URL across children) and apply filters.
  const seen = new Set();
  const unique = [];
  const dropped = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    if (isSubmittable(u)) unique.push(u);
    else dropped.push(u);
  }

  console.log(`\nCollected ${urls.length} loc(s) -> ${unique.length} unique submittable`);
  if (dropped.length) {
    console.log(`Filtered out ${dropped.length} non-submittable URL(s):`);
    dropped.slice(0, 20).forEach((u) => console.log(`  - ${u}`));
    if (dropped.length > 20) console.log(`  … and ${dropped.length - 20} more`);
  }

  if (unique.length === 0) {
    console.error('\nNothing to submit — aborting.');
    process.exitCode = 1;
    return;
  }

  if (dry) {
    console.log('\n--dry: no request sent. First 10 URLs:');
    unique.slice(0, 10).forEach((u) => console.log(`  ${u}`));
    return;
  }

  // --- Preflight: the key file must be live, or every batch will 403. -------
  console.log(`\nPreflight: ${KEY_LOCATION}`);
  const keyRes = await fetch(KEY_LOCATION, { headers: { 'User-Agent': BROWSER_UA } });
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (!keyRes.ok || keyBody !== KEY) {
    console.error(
      `  ❌ key file check FAILED (HTTP ${keyRes.status}, body="${keyBody.slice(0, 60)}") — aborting before wasting the submit.`
    );
    process.exitCode = 1;
    return;
  }
  console.log('  ✅ key file live and matches');

  // --- Submit --------------------------------------------------------------
  const batches = [];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    batches.push(unique.slice(i, i + BATCH_SIZE));
  }

  const startedAt = new Date();
  console.log(`\nSubmitting ${unique.length} URLs in ${batches.length} batch(es) to ${ENDPOINT}`);
  const statuses = [];
  for (let i = 0; i < batches.length; i++) {
    statuses.push(await submitBatch(batches[i], i + 1, batches.length));
    if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
  }

  const ok = statuses.filter((s) => s === 200 || s === 202).length;

  // --- Report --------------------------------------------------------------
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = startedAt.toISOString().slice(0, 10);
  const reportPath = resolve(REPORT_DIR, `indexnow-run-${stamp}.json`);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        runAt: startedAt.toISOString(),
        endpoint: ENDPOINT,
        key: KEY,
        keyLocation: KEY_LOCATION,
        totalUnique: unique.length,
        batches: batches.length,
        batchSize: BATCH_SIZE,
        statuses,
        urls: unique,
        filteredOut: dropped,
      },
      null,
      2
    )
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Result: ${ok}/${batches.length} batch(es) accepted (HTTP 200/202)`);
  console.log(`URLs submitted: ${unique.length}`);
  console.log(`Report written: ${reportPath}`);
  if (ok !== batches.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exitCode = 1;
});
