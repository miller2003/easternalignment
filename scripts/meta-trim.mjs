#!/usr/bin/env node
// meta-trim.mjs — second-pass trims for the 15 out-of-range metas
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.cwd());
const BASE = 'src/content/readers';
const METAS = {
  'kasamba/immense-spark-n-au-kasamba-review.md': "Immense Spark on Kasamba: 66,152 readings since 2007, a 4.8, and clients who've returned for a decade. Chat $10.99/min promo (reg. $21.99).",
  'kasamba/invincible-insights-kasamba-review.md': "Invincible Insights on Kasamba: a $1.99/min clairvoyant with 70,081 readings since 2015 and a soulmate-reunion specialism. Pricing, method, caveats.",
  'kasamba/love-specialist-isabelle-kasamba-review.md': "Love Specialist Isabelle on Kasamba: 99,057 readings since 2005, a perfect 5.0, and clients returning years later to confirm predictions. $14.99/min promo.",
  'kasamba/psychic-satire-kasamba-review.md': "Psychic Satire on Kasamba: a 4.7-star medium with 20,000+ reviews at $2.99/min (promo $1.49). Tested firsthand — method, spirit-guide readings, honest fit.",
  'kasamba/psychic-yazmin-kasamba-review.md': "Psychic Yazmin on Kasamba: a perfect 5.0 across 119,836 readings since 2005 at $4.99/min. Clients stay for months through the hardest seasons — we traced why.",
  'kasamba/raven-franks-kasamba-review.md': "Raven Franks on Kasamba: 67,179 readings since 2003, a perfect 5.0, remote viewer and empath — 'the only reader I deal with.' $9.49/min promo (reg. $18.99).",
  'kasamba/seek-chelle-kasamba-review.md': "Seek Chelle on Kasamba: a 20-year intuitive with triple-clair gifts, 55,000+ readings, and a 5.0 — she surfaces the real question behind yours. $9.98/min.",
  'kasamba/truthful-visions-kasamba-review.md': "Truthful Visions on Kasamba: a 5.0-star intuitive with 55,271 readings since 2015, love and career specialist. Chat $4.99/min — real quotes and honest fit.",
  'kasamba/master-enigma-kasamba-review.md': "Master Enigma on Kasamba: 355,674 readings since 2007 and a perfect 5.0 — the platform's volume king. Chat $5.99/min promo (reg. $11.99). Who should book.",
  'kasamba/love-stefans-psychic-soul-kasamba-review.md': "Love Stefan on Kasamba: 138,003 readings since 2007, a 4.9, and a Top 3 experience tag. Third-generation psychic at $5.49/min promo + 3 free minutes.",
  'kasamba/cosmic-fusion-kasamba-review.md': "Cosmic Fusion on Kasamba: a perfect 5.0 across 70,360 readings since 2011. Chat $3.99/min but voice $39.99 — a 10x gap we explain before you book.",
  'kasamba/danielle-psychic-kasamba-review.md': "Danielle Psychic on Kasamba: 5.0 stars across 57,935 readings since 2008. Chat $4.99/min, voice $1.99/min. Her brutal-honesty love style, reviewed.",
  'kasamba/elizabeth-kasamba-review.md': "Elizabeth on Kasamba: a sixth-generation psychic and Reiki Master with 47,000+ readings since 2003, rated 4.8. $4.99/min (intro $2.49) — honest fit.",
  'kasamba/wisdom-and-love-kasamba-review.md': "Wisdom and Love on Kasamba: the No.2 psychic — 102,414 readings since 2004, a perfect 5.0, at $13.99/min chat promo. The priciest reader we cover.",
  'keen/arradaza.md': "Arradaza on Keen: a 4.93 across 26K ratings and a five-tool method refined over 25 years. $5.99/min — the '98% accuracy' claim and honest fit.",
};
let bad = 0;
for (const [rel, meta] of Object.entries(METAS)) {
  const fp = path.join(ROOT, BASE, rel);
  const raw = fs.readFileSync(fp, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const arr = raw.split(/\r?\n/);
  const mi = arr.findIndex(l => l.startsWith('metaDescription:'));
  if (mi === -1) { console.log('MISS ' + rel); bad++; continue; }
  arr[mi] = `metaDescription: "${meta.replace(/"/g, '\\"')}"`;
  fs.writeFileSync(fp, arr.join(eol));
  const ok = meta.length >= 120 && meta.length <= 155;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'LEN!'} ${meta.length} ${rel}`);
}
console.log(bad ? `\n${bad} still out of range` : '\nAll in range');
