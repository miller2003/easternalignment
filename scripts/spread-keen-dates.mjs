// Spread all Keen reader publishDate + updatedDate evenly across a 2-month window.
// Order: by rating descending (top-rated readers "published" first → establishes authority).
// Window: 2026-06-10 (start) → 2026-08-10 (end). 30 articles → 29 even intervals.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const DIR = path.join(ROOT, "src", "content", "readers", "keen");

const START = new Date("2026-06-10T00:00:00Z");
const END = new Date("2026-08-10T00:00:00Z");
const SPAN_DAYS = Math.round((END - START) / 86400000); // 61

function fmt(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getFmValue(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : null;
}

async function main() {
  const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".md"));
  const readers = [];
  for (const f of files) {
    const md = await fs.readFile(path.join(DIR, f), "utf8");
    const fm = md.split(/^---\r?$/m)[1] || "";
    const rating = parseFloat(getFmValue(fm, "rating") || "0");
    readers.push({ f, slug: f.replace(/\.md$/, ""), rating });
  }

  // Highest rating first → earliest date.
  readers.sort((a, b) => b.rating - a.rating || a.slug.localeCompare(b.slug));

  const n = readers.length;
  for (let i = 0; i < n; i++) {
    const offset = Math.round((i * SPAN_DAYS) / (n - 1));
    const d = new Date(START.getTime() + offset * 86400000);
    const date = fmt(d);

    const file = path.join(DIR, readers[i].f);
    let md = await fs.readFile(file, "utf8");
    md = md.replace(/^(publishDate:\s*)['"][^'"]*['"]/m, `$1'${date}'`);
    md = md.replace(/^(updatedDate:\s*)['"][^'"]*['"]/m, `$1'${date}'`);
    // Inline customSchema datePublished/dateModified if present
    md = md.replace(/"datePublished":\s*"[^"]*"/, `"datePublished": "${date}"`);
    md = md.replace(/"dateModified":\s*"[^"]*"/, `"dateModified": "${date}"`);
    await fs.writeFile(file, md, "utf8");
    console.log(`[${i + 1}/${n}] ${readers[i].slug} (${readers[i].rating}) -> ${date}`);
  }
  console.log(`\nDone. Spread ${n} readers from ${fmt(START)} to ${fmt(END)}.`);
}

await main();
