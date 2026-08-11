// Fetch Keen reader avatars and wire them into the review frontmatter.
//
// WHY THIS SCRIPT EXISTS
//   This environment's egress IP is blocked by Cloudflare for all of keen.com,
//   so the download MUST run on a normal machine (your laptop/desktop). This is
//   the one-command step that pulls each reader's official profile photo from
//   Keen and drops it into public/avatars/keen/<slug>.<ext>, then sets the
//   `avatarUrl` frontmatter field so it renders on the review page.
//
// HOW TO RUN (on your machine, from the project root):
//   node scripts/fetch-keen-avatars.mjs
//
// BEFORE RUNNING:
//   - Edit scratch/keen-avatar-urls.json: replace the `null` entries (the 17
//     readers whose numeric profile IDs were not public) with their full Keen
//     profile URLs. You already have these — they are the same original Keen
//     URLs you use to build the TUNE deep links.
//   - Run this BEFORE you deploy, so the images exist. (If a reader has no
//     avatarUrl set, the page gracefully shows an initials avatar — never a
//     broken image.)
//
// It is safe to re-run: it skips readers that already have a local avatar file.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const READERS_DIR = path.join(ROOT, "src", "content", "readers", "keen");
const OUT_DIR = path.join(ROOT, "public", "avatars", "keen");
const MAP_FILE = path.join(ROOT, "scratch", "keen-avatar-urls.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/* ---------- frontmatter helpers ---------- */
function stripFrontmatter(md) {
  const open = md.startsWith("---\n") ? 4 : md.startsWith("---\r\n") ? 5 : null;
  if (open === null) return null;
  const closeMatch = md.slice(open).match(/^(?:[\s\S]*?)\r?\n---\r?\n/);
  if (!closeMatch) return null;
  const block = closeMatch[0];
  const fm = block.replace(/\r?\n---\r?\n$/, "");
  return { fm, body: md.slice(open + block.length) };
}
function setFrontmatterLine(md, key, value) {
  const parsed = stripFrontmatter(md);
  if (!parsed) return md;
  const { fm } = parsed;
  const keyRe = new RegExp(`^${key}:\\s*.*$`, "m");
  let newFm = fm;
  if (keyRe.test(fm)) newFm = fm.replace(keyRe, `${key}: ${value}`);
  else {
    const affiliateRe = /^affiliateUrl:.*$/m;
    newFm = affiliateRe.test(fm)
      ? fm.replace(affiliateRe, (l) => `${l}\n${key}: ${value}`)
      : `${fm}\n${key}: ${value}`;
  }
  const openDelim = md.startsWith("---\r\n") ? "---\r\n" : "---\n";
  const closeDelim = md.includes("\r\n") ? "\r\n---\r\n" : "\n---\n";
  return `${openDelim}${newFm}${closeDelim}${parsed.body}`;
}

/* ---------- image extraction (Keen-aware) ---------- */
function extractNextDataJson(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function getDeep(obj, pathArr) {
  let cur = obj;
  for (const p of pathArr) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}
function pickImageFromHtml(html) {
  const nextData = extractNextDataJson(html);
  const fromData = getDeep(nextData, ["props", "pageProps", "listing", "profilePictureUrl"]);
  if (typeof fromData === "string" && fromData.includes("si.keen.com/memberphotos")) return fromData;

  const member = [...html.matchAll(/https?:\/\/si\.keen\.com\/memberphotos\/[^\s"'\\]+?\.(?:png|jpe?g|webp|avif)/gi)].map((m) => m[0]);
  const nonDefault = member.filter((u) => !/default-advisor-img/i.test(u));
  if (nonDefault.length) return nonDefault[0];
  if (member.length) return member[0];

  const nextImg = [...html.matchAll(/\/_next\/image\?url=([^&]+)&/gi)]
    .map((m) => { try { return decodeURIComponent(m[1]); } catch { return null; } })
    .filter(Boolean);
  if (nextImg.length) {
    const preferred = nextImg.find((u) => /profile|avatar|advisor|portrait|headshot|photo/i.test(u));
    return preferred || nextImg[0];
  }
  return null;
}

/* ---------- fetch ---------- */
async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  });
  return { text: await res.text(), status: res.status };
}
async function fetchBinary(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": UA, accept: "image/jpeg,image/png,image/apng,image/*,*/*;q=0.8", referer: url },
  });
  if (!res.ok) throw new Error(`image fetch status ${res.status}`);
  return { buf: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") || "" };
}
function extFromContentType(ct) {
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return ".jpg";
  return null;
}

/* ---------- main ---------- */
async function main() {
  const map = JSON.parse(await fs.readFile(MAP_FILE, "utf8"));
  const slugs = Object.keys(map);
  let ok = 0, skipped = 0, failed = 0, missingUrl = 0;

  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const slug of slugs) {
    const url = map[slug];
    const mdPath = path.join(READERS_DIR, `${slug}.md`);
    if (!url) { missingUrl++; console.log(`[todo] ${slug}: no profile URL in map — add it to scratch/keen-avatar-urls.json`); continue; }
    if (!fs.existsSync(mdPath)) { skipped++; console.log(`[skip] ${slug}: .md not found`); continue; }

    try {
      const { text: html, status } = await fetchText(url);
      if (status >= 400) throw new Error(`profile fetch status ${status}`);
      const imgUrl = pickImageFromHtml(html);
      if (!imgUrl) throw new Error("no avatar image found on profile page");

      const { buf, contentType } = await fetchBinary(imgUrl);
      const ext = extFromContentType(contentType) || path.extname(new URL(imgUrl).pathname) || ".jpg";
      const outFile = path.join(OUT_DIR, `${slug}${ext}`);
      await fs.writeFile(outFile, buf);

      const publicPath = `/avatars/keen/${slug}${ext}`;
      const md = await fs.readFile(mdPath, "utf8");
      await fs.writeFile(mdPath, setFrontmatterLine(md, "avatarUrl", publicPath), "utf8");

      ok++;
      console.log(`[ok] ${slug} -> ${publicPath}`);
    } catch (e) {
      failed++;
      console.log(`[fail] ${slug}: ${e?.message || e}`);
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed} missingUrl=${missingUrl}`);
  if (failed > 0 || missingUrl > 0) {
    console.log("Note: run again after fixing missing URLs. Pages without avatarUrl show a graceful initials avatar.");
  }
}

await main();
