/* Verify the back-navigation scroll fix:
 *   A. history back  -> scroll restoration must be INSTANT (no slide from top)
 *   B. anchor click  -> must still scroll SMOOTHLY (feature preserved)
 * Usage: node scripts/scroll-back-verify.mjs [baseUrl]
 */
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/samja/.workbuddy/binaries/node/workspace/');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:4517';
const PAGE_A = '/guides/best-kasamba-psychics-2026/';
const PAGE_B = '/guides/best-kasamba-psychics-first-reading/';
const TOC_PAGE = '/comparisons/';
const TOC_ANCHOR = '#matrix';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function trajectory(log) {
  const runs = [];
  for (const [t, y] of log) {
    const last = runs[runs.length - 1];
    if (last && last.y === y) last.t1 = t;
    else runs.push({ y, t0: t, t1: t });
  }
  return runs;
}

async function newSampledPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.__log = [];
    const t0 = performance.now();
    const iv = setInterval(() => {
      window.__log.push([Math.round(performance.now() - t0), Math.round(window.scrollY)]);
      if (performance.now() - t0 > 8000) clearInterval(iv);
    }, 25);
  });
  return page;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-proxy-server', '--disable-gpu', '--no-sandbox'],
  });
  let failures = 0;

  // ── A. history back ────────────────────────────────────────────────────────
  {
    const page = await newSampledPage(browser);
    await page.goto(BASE + PAGE_A, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(500);

    const armedAtLoad = await page.evaluate(() =>
      document.documentElement.classList.contains('ea-scroll-instant')
    );
    await page.evaluate(() => window.scrollTo(0, 4200));
    await sleep(300);
    const before = await page.evaluate(() => window.scrollY);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      page.evaluate((h) => document.querySelector(`a[href="${h}"]`).click(), PAGE_B),
    ]);
    await sleep(700);
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);

    const log = await page.evaluate(() => window.__log || []);
    const finalY = await page.evaluate(() => window.scrollY);
    const runs = trajectory(log).filter((r) => r.y > 0);
    const mid = runs.filter((r) => r.y > 5 && r.y < finalY - 5).length;

    console.log('--- A. back navigation ---');
    console.log('armed (class on <html>) at load :', armedAtLoad);
    console.log('scrollY before leaving           :', before);
    console.log('scrollY after back               :', finalY);
    console.log('intermediate scroll positions    :', mid);
    if (finalY !== before) {
      console.log('  [FAIL] position not restored'); failures++;
    } else if (mid > 3) {
      console.log('  [FAIL] restoration is animated (' + mid + ' intermediate frames)'); failures++;
    } else {
      console.log('  [PASS] restored instantly, no slide');
    }
    await page.close();
  }

  // ── B. in-page anchor click ────────────────────────────────────────────────
  {
    const page = await newSampledPage(browser);
    await page.goto(BASE + TOC_PAGE, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(200);
    await page.evaluate(() => (window.__log.length = 0));

    const hasAnchor = await page.evaluate(
      (sel) => !!document.querySelector(`a[href="${sel}"]`),
      TOC_ANCHOR
    );
    if (!hasAnchor) {
      console.log('--- B. anchor click ---');
      console.log('  [SKIP] anchor not found:', TOC_ANCHOR);
    } else {
      await page.click(`a[href="${TOC_ANCHOR}"]`);
      await sleep(1600);
      const log = await page.evaluate(() => window.__log || []);
      const finalY = await page.evaluate(() => window.scrollY);
      const runs = trajectory(log).filter((r) => r.y > 5 && r.y < finalY - 5);
      console.log('--- B. anchor click ---');
      console.log('anchor                           :', TOC_ANCHOR);
      console.log('scrollY after click              :', finalY);
      console.log('intermediate scroll positions    :', runs.length);
      if (finalY < 100) {
        console.log('  [FAIL] did not scroll to the anchor'); failures++;
      } else if (runs.length < 5) {
        console.log('  [WARN] anchor jump looks instant — smooth scrolling lost'); failures++;
      } else {
        console.log('  [PASS] anchor still scrolls smoothly');
      }
    }
    await page.close();
  }

  // ── C. state machine (bfcache path) ────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(BASE + PAGE_A, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(400);
    const armedOnLoad = await page.evaluate(() =>
      document.documentElement.classList.contains('ea-scroll-instant')
    );
    const smoothOnLoad = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior
    );
    // simulate the user starting to interact
    await page.evaluate(() =>
      window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    );
    await sleep(50);
    const disarmed = await page.evaluate(
      () => !document.documentElement.classList.contains('ea-scroll-instant')
    );
    const smoothAfterIntent = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior
    );
    // simulate the page being parked in the back/forward cache
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await sleep(50);
    const rearmed = await page.evaluate(() =>
      document.documentElement.classList.contains('ea-scroll-instant')
    );

    console.log('--- C. state machine ---');
    console.log('armed on load (auto)              :', armedOnLoad, smoothOnLoad);
    console.log('disarmed on user intent (smooth)  :', disarmed, smoothAfterIntent);
    console.log('re-armed on pagehide (bfcache)    :', rearmed);
    if (armedOnLoad && disarmed && rearmed && smoothOnLoad === 'auto' && smoothAfterIntent === 'smooth') {
      console.log('  [PASS] instant on (re)entry, smooth after user intent');
    } else {
      console.log('  [FAIL] unexpected class/computed state'); failures++;
    }
    await page.close();
  }

  await browser.close();
  console.log('\nresult:', failures === 0 ? 'ALL PASS' : failures + ' check(s) failed');
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
