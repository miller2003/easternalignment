const urls = [
  "https://www.kasamba.com/psychic/golden-eye/",
  "https://www.keen.com/love-relationships/arradaza/1086511",
];

function extractUrls(html) {
  const abs = [...html.matchAll(/https?:\/\/[^"'\\\s]+?\.(?:png|jpe?g|webp|avif)/gi)].map((m) => m[0]);
  const next = [...html.matchAll(/\/_next\/image\?url=([^&]+)&/gi)]
    .map((m) => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return { abs, next };
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

function walk(obj, visit, path = "$") {
  if (obj === null || obj === undefined) return;
  const t = typeof obj;
  if (t === "string" || t === "number" || t === "boolean") return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) walk(obj[i], visit, `${path}[${i}]`);
    return;
  }
  if (t === "object") {
    visit(obj, path);
    for (const [k, v] of Object.entries(obj)) walk(v, visit, `${path}.${k}`);
  }
}

for (const url of urls) {
  console.log("\n===", url, "===");
  const html = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", accept: "text/html" } }).then((r) => r.text());
  console.log("len", html.length);
  const { abs, next } = extractUrls(html);
  const all = [...abs, ...next];
  const interesting = all.filter(
    (u) =>
      /profile|avatar|advisor|portrait|headshot|photo|user|psychic/i.test(u) &&
      !/logo|favicon|sprite|icon|badge|google|doubleclick/i.test(u)
  );
  console.log("interesting", interesting.length);
  console.log(interesting.slice(0, 30).join("\n"));

  if (url.includes("kasamba.com")) {
    const imgTags = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
    console.log("img tag src count", imgTags.length);
    const imgAbs = imgTags.filter((s) => s.startsWith("http"));
    console.log("img tag abs", imgAbs.length);
    console.log(imgAbs.slice(0, 40).join("\n"));

    const dataSrc = [...html.matchAll(/data-src=["']([^"']+)["']/gi)].map((m) => m[1]);
    console.log("data-src count", dataSrc.length);
    console.log(dataSrc.slice(0, 40).join("\n"));
  }

  if (url.includes("keen.com")) {
    const nextData = extractNextDataJson(html);
    console.log("nextData parsed", Boolean(nextData));
    if (nextData) {
      const hits = [];
      walk(nextData, (node, p) => {
        for (const [k, v] of Object.entries(node)) {
          if (typeof v === "string" && v.includes("si.keen.com/memberphotos")) {
            hits.push({ path: `${p}.${k}`, url: v });
          }
        }
      });
      console.log("memberphoto hits in nextData", hits.length);
      console.log(hits.slice(0, 30).map((h) => `${h.path} => ${h.url}`).join("\n"));
    }
  }
}

