import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const READERS_DIR = path.join(ROOT, "src", "content", "readers");
const OUT_DIR = path.join(ROOT, "public", "avatars");

function stripFrontmatter(md) {
  const open = md.startsWith("---\n") ? 4 : md.startsWith("---\r\n") ? 5 : null;
  if (open === null) return null;
  const closeMatch = md.slice(open).match(/^(?:[\s\S]*?)\r?\n---\r?\n/);
  if (!closeMatch) return null;
  const block = closeMatch[0]; // frontmatter + closing delimiter
  const fm = block.replace(/\r?\n---\r?\n$/, "");
  const bodyStart = open + block.length;
  return { fm, body: md.slice(bodyStart), bodyStart, open };
}

function getFrontmatterValue(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+)\\s*$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

function hasFrontmatterKey(fm, key) {
  const re = new RegExp(`^${key}:\\s*`, "m");
  return re.test(fm);
}

function setFrontmatterLine(md, key, value) {
  const parsed = stripFrontmatter(md);
  if (!parsed) return md;
  const { fm } = parsed;

  const keyRe = new RegExp(`^${key}:\\s*.*$`, "m");
  let newFm = fm;
  if (keyRe.test(fm)) {
    newFm = fm.replace(keyRe, `${key}: ${value}`);
  } else {
    // Insert after affiliateUrl if present, otherwise append
    const affiliateRe = /^affiliateUrl:.*$/m;
    if (affiliateRe.test(fm)) newFm = fm.replace(affiliateRe, (line) => `${line}\n${key}: ${value}`);
    else newFm = `${fm}\n${key}: ${value}`;
  }

  const openDelim = md.startsWith("---\r\n") ? "---\r\n" : "---\n";
  const closeDelim = md.includes("\r\n") ? "\r\n---\r\n" : "\n---\n";
  return `${openDelim}${newFm}${closeDelim}${parsed.body}`;
}

function injectFrontmatterLine(md, key, value) {
  const parsed = stripFrontmatter(md);
  if (!parsed) return md;
  const { fm } = parsed;
  if (hasFrontmatterKey(fm, key)) return md;

  // Insert after affiliateUrl if present, otherwise before closing ---
  const affiliateRe = /^affiliateUrl:.*$/m;
  let newFm = fm;
  if (affiliateRe.test(fm)) {
    newFm = fm.replace(affiliateRe, (line) => `${line}\n${key}: ${value}`);
  } else {
    newFm = `${fm}\n${key}: ${value}`;
  }

  const openDelim = md.startsWith("---\r\n") ? "---\r\n" : "---\n";
  const closeDelim = md.includes("\r\n") ? "\r\n---\r\n" : "\n---\n";
  // Reconstruct exactly: openDelim + newFm + closeDelim + body
  return `${openDelim}${newFm}${closeDelim}${parsed.body}`;
}

async function listMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listMarkdownFiles(p)));
    else if (e.isFile() && (p.endsWith(".md") || p.endsWith(".mdx"))) out.push(p);
  }
  return out;
}

function extractNextDataJson(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function getDeep(obj, pathArr) {
  let cur = obj;
  for (const p of pathArr) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function pickImageFromHtml(html, pageUrl = "") {
  const isKasamba = /kasamba\.com/i.test(pageUrl) || /kassrv\.com/i.test(html);
  const isKeen = /keen\.com/i.test(pageUrl) || /si\.keen\.com/i.test(html);
  const isPurpleGarden = /purplegarden\.co/i.test(pageUrl) || /purple\.brgsrv\.com/i.test(html);

  // 1) Platform-specific strongest signals FIRST (avoid platform og:image logos)
  if (isKasamba) {
    const kasambaCdn = [...html.matchAll(/https?:\/\/k3cdn\.kassrv\.com\/[^\s"'\\]+/gi)].map((m) => m[0]);
    // The path is base64-encoded JSON (e.g. {"key":"advisors/14935/profile_image_....jpg", ...})
    const decoded = kasambaCdn
      .map((u) => {
        const token = u.replace(/^https?:\/\/k3cdn\.kassrv\.com\//i, "");
        try {
          const json = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
          return { u, key: String(json?.key || "") };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const profile = decoded.find((x) => /advisors\/\d+\/profile_image_/i.test(x.key));
    if (profile?.u) return profile.u;
  }

  if (isPurpleGarden) {
    const pgCdn = [...html.matchAll(/https?:\/\/purple\.brgsrv\.com\/[^\s"'\\]+/gi)].map((m) => m[0]);
    const decoded = pgCdn
      .map((u) => {
        const token = u.replace(/^https?:\/\/purple\.brgsrv\.com\//i, "");
        try {
          const json = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
          return { u, key: String(json?.key || "") };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const profile = decoded.find((x) => /advisors\/\d+\/profile_image_/i.test(x.key));
    if (profile?.u) return profile.u;
  }

  if (isKeen) {
    // Keen: prefer the actual profile image from Next.js payload
    const nextData = extractNextDataJson(html);
    const profileFromData = getDeep(nextData, ["props", "pageProps", "listing", "profilePictureUrl"]);
    if (typeof profileFromData === "string" && 
       (profileFromData.includes("si.keen.com") || profileFromData.includes("images.keen.com")) && 
       !/default_v3|default-advisor-img/i.test(profileFromData)) {
         return profileFromData;
    }

    const keenMember = [
      ...html.matchAll(/https?:\/\/(si|images)\.keen\.com\/member(?:photos|3x2)\/[^\s"'\\]+?\.(?:png|jpe?g|webp|avif)/gi),
    ].map((m) => m[0]);
    const nonDefault = keenMember.filter((u) => !/default_v3|default-advisor-img/i.test(u));
    if (nonDefault.length) return nonDefault[0];

    const nextImg = [...html.matchAll(/\/_next\/image\?url=([^&]+)&/gi)]
      .map((m) => {
        try {
          return decodeURIComponent(m[1]);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((u) => !/logo|favicon|icon|badge|promo/i.test(u));

    if (nextImg.length) {
      const preferred = nextImg.find((u) => /profile|avatar|advisor|portrait|headshot|photo/i.test(u));
      if (preferred) return preferred;
    }
  }

  // 2) Skip social metas for known platforms (they use brand logos as og:image)
  if (isKasamba || isKeen || isPurpleGarden) {
    return null;
  }

  // 3) Social metas as a fallback for unknown platforms
  const metas = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];
  for (const re of metas) {
    const m = html.match(re);
    if (m?.[1] && !/logo|favicon|icon/i.test(m[1])) return m[1];
  }

  // 3) Generic fallback: any absolute image URL embedded in HTML/JSON
  const urls = [...html.matchAll(/https?:\/\/[^"'\\\s]+?\.(?:png|jpe?g|webp|avif)/gi)].map((m) => m[0]);
  if (urls.length) {
    const filtered = urls.filter((u) => !/favicon|sprite|logo|icon|badge|category|categories|promo/i.test(u));
    const preferred =
      filtered.find((u) => /profile|avatar|advisor|portrait|headshot|photo|user/i.test(u)) ||
      filtered[0] ||
      urls[0];
    return preferred;
  }

  return null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const text = await res.text();
  return { finalUrl: res.url, status: res.status, text };
}

// We read affiliateLinks to map /go/slug to actual URL
const linksTs = await fs.readFile(path.join(ROOT, "src", "data", "affiliateLinks.ts"), "utf8");
function extractTargetUrl(affiliateUrl) {
  let slug = affiliateUrl;
  if (affiliateUrl.startsWith('/go/')) {
    slug = affiliateUrl.replace(/^\/go\//, '').replace(/\/$/, '');
  }
  const regex = new RegExp("['\"]" + slug + "['\"]:\\s*['\"]([^'\"]+)['\"]");
  const match = linksTs.match(regex);
  let finalUrl = affiliateUrl;
  if (match) {
      finalUrl = match[1];
  }
  
  try {
    const u = new URL(finalUrl);
    const target = u.searchParams.get("url");
    if (target) return decodeURIComponent(target);
  } catch {
    // ignore
  }
  return finalUrl;
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      // Prefer universally supported formats for the site.
      // (Avoid AVIF so the downloaded files are easily previewable and compatible.)
      accept: "image/jpeg,image/png,image/apng,image/*,*/*;q=0.8",
      referer: url,
    },
  });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "";
  return { buf, contentType, finalUrl: res.url };
}

function extFromContentType(contentType) {
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/jpg")) return ".jpg";
  return null;
}

function safeSlugFromFile(filePath) {
  return path.basename(filePath).replace(/\.(md|mdx)$/i, "");
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const filter = process.argv[2];
  const files = await listMarkdownFiles(READERS_DIR);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    if (filter && !file.includes(filter)) continue;
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    const platform = rel.split("/").at(-2); // .../readers/<platform>/<slug>.md
    const slug = safeSlugFromFile(file);
    const md = await fs.readFile(file, "utf8");
    const parsed = stripFrontmatter(md);
    if (!parsed) {
      skipped++;
      console.log(`[skip] no frontmatter: ${rel}`);
      continue;
    }

    const affiliateUrl = getFrontmatterValue(parsed.fm, "affiliateUrl");
    if (!affiliateUrl) {
      skipped++;
      console.log(`[skip] no affiliateUrl: ${rel}`);
      continue;
    }

    try {
      const targetUrl = extractTargetUrl(affiliateUrl);
      const { text: html, status } = await fetchText(targetUrl);
      if (status >= 400) throw new Error(`affiliate fetch status ${status}`);

      const imgUrl = pickImageFromHtml(html, targetUrl);
      if (!imgUrl) {
        console.log(`[no-image] ${rel}`);
        const updated = setFrontmatterLine(md, "avatarUrl", '""');
        await fs.writeFile(file, updated, "utf8");
        continue;
      }

      const { buf, contentType } = await fetchBinary(imgUrl);
      const ext = extFromContentType(contentType) || path.extname(new URL(imgUrl).pathname) || ".jpg";

      const outDir = path.join(OUT_DIR, platform);
      await ensureDir(outDir);
      const outFile = path.join(outDir, `${slug}${ext}`);
      await fs.writeFile(outFile, buf);

      const publicPath = `/avatars/${platform}/${slug}${ext}`;
      const updated = setFrontmatterLine(md, "avatarUrl", publicPath);
      await fs.writeFile(file, updated, "utf8");

      ok++;
      console.log(`[ok] ${rel} -> ${publicPath}`);
    } catch (e) {
      failed++;
      console.log(`[fail] ${rel}: ${e?.message || e}`);
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 2;
}

await main();

