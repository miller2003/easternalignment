#!/usr/bin/env node
// fix-proscons.mjs — final pros/cons + jenny meta patches (LF files now, regex works)
import fs from 'node:fs';
const B = 'src/content/readers/';

let t = fs.readFileSync(B + 'kasamba/advisor-by-jenny-kasamba-review.md', 'utf8');
t = t.replace(/^metaDescription:.*$/m, 'metaDescription: "Advisor by Jenny on Kasamba: an MBA-turned-psychic with 50,170 readings since 2008. Chat $3.99/min, promo from $1.99 — method, real quotes, and honest fit."');
t = t.replace(/^pros:\n(?:- .*\n?)+/m, 'pros:\n- "MBA + computer-science background brings structured, actionable advice to love readings"\n- "50,170 readings since 2008 at promo rates from $1.99/min — rare experience-per-dollar value"\n- "18 years on Kasamba with visibly loyal repeat clients"\n');
t = t.replace(/^cons:\n(?:- .*\n?)+/m, 'cons:\n- "4.7 rating sits below the perfect-5.0 tier if you sort strictly by score"\n- "Promo rates ($1.99–$2.99) are time-limited; standard $3.99 chat / $5.99 voice applies after"\n- "Love-centred focus; weaker fit for career or finance questions"\n');
fs.writeFileSync(B + 'kasamba/advisor-by-jenny-kasamba-review.md', t);

let s = fs.readFileSync(B + 'kasamba/supernormal-soul-kasamba-review.md', 'utf8');
s = s.replace(/^pros:\n(?:- .*\n?)+/m, 'pros:\n- "Perfect 5.0 across 54,000+ readings since 2017 — sustained at high volume, not a low-count fluke"\n- "Certified-coach background gives sessions structure and action orientation, not just impressions"\n- "Chat at $5.99/min is reasonable for a 5.0-rated veteran with eight years on the platform"\n');
s = s.replace(/^cons:\n(?:- .*\n?)+/m, 'cons:\n- "Voice at $39.99/min is among the highest on the platform — chat is the sane default"\n- "Love-and-soulmate focus; career and finance questions fit specialists better"\n- "Marketing leans on soulmate tropes (\\"Supreme Seer\\") — judge the readings, not the branding"\n');
fs.writeFileSync(B + 'kasamba/supernormal-soul-kasamba-review.md', s);

let v = fs.readFileSync(B + 'kasamba/invincible-insights-kasamba-review.md', 'utf8');
v = v.replace(/^pros:\n(?:- .*\n?)+/m, 'pros:\n- "$1.99/min chat is among the lowest rates on Kasamba for a reader with 70,081 readings since 2015"\n- "Born clairvoyant and clairaudient with a clear soulmate-reunion specialism"\n- "A 20-minute chat runs under $40 — exceptional value for the experience level"\n');
v = v.replace(/^cons:\n(?:- .*\n?)+/m, 'cons:\n- "Voice at $11.99/min is six times the chat rate — the value case is chat-only"\n- "4.7 rating sits slightly below the platform\'s 5.0 leaders"\n- "Reunion language should be held loosely, not treated as guarantees; love-focused over career"\n');
fs.writeFileSync(B + 'kasamba/invincible-insights-kasamba-review.md', v);
console.log('patched 3 files');
