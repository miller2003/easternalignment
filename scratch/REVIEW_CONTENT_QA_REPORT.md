# Reader-Review Content QA Audit — easternalignment.com

**Scope:** Every individual reader-review page across the 3 platforms.
**Total audited:** 87 articles (Keen 47 · Kasamba 20 · Purple Garden 20)
**Date:** 2026-08-13
**Method:** Automated scan of all 87 Markdown sources (frontmatter integrity, canonical/affiliate URL correctness, internal-link validity, duplicate/templated-body detection, thin-content, non-English text, unverified/admission language) + qualitative read of a representative sample per platform.

---

## Executive Summary

| Platform | Articles | Clean | Problematic | Worst issue |
|---|---|---|---|---|
| Keen | 47 | 43 | 4 | Canonical URL → wrong (non-self) URL |
| Kasamba | 20 | 20 | 0 | — (clean) |
| Purple Garden | 20 | 0* | 20 | 1 critical credibility defect + systemic thin/templated content |

\* Purple Garden has no *mechanical* field errors except Ayla, but **all 20** fail on content quality (thin + boilerplate) and 1 has a critical defect.

**Headline:** The article you flagged, **Ayla (Purple Garden)**, is genuinely broken — it asserts a "4.8-star" rating in its title/description while the body admits that number is an unverified placeholder. That is a self-contradiction, not just weak prose. Separately, **4 Keen pages emit a canonical tag pointing to the wrong URL**, and the **entire Purple Garden set is thin, templated "spun" content** that poses an SEO/thin-content risk.

---

## A. CRITICAL — fabricated / unverified rating presented as fact (self-contradiction)

### 1. `purple-garden / ayla-love-resolution`  ⚠️ this is the one you found
The page simultaneously claims a verified rating and admits it is made up:

- **Title / description / frontmatter `rating: 4.8`** state a confident "4.8-star … 17,715 readings since 2021".
- The **meta description** literally says: *"(Rating approximate — verify on profile.)"* — undermining the "4.8-star" claim in the same sentence.
- The **body repeatedly admits the data was not captured**:
  - *"we've used a representative 4.8 as a placeholder pending confirmation"*
  - *"her precise star rating wasn't capturable at publish time"*
  - *"The exact rating should be verified live"*

**Why it's a problem:** The article tells Google and readers a specific rating that it itself says is a guess. This is both a credibility/factual-accuracy problem and a liability risk (publishing specific, unsupported statistics about a real person). It also contradicts itself on the same page.

**Fix:** Either (a) verify the live rating/read-count on Ayla's profile and state the real numbers, or (b) rewrite to clearly frame the rating as "not individually verified — check the live profile" *consistently* (don't assert 4.8 in the title while denying it in the body).

---

## B. SEO / TECHNICAL — canonical URL points to a non-self URL

Four Keen pages have a `canonicalUrl` that does **not** match the page's own slug (likely a slug rename that left the canonical stale). A canonical tag telling Google the "real" page is a different/likely-nonexistent URL is a duplicate-content and indexing risk.

| # | File | Current canonicalUrl | Actual page URL |
|---|---|---|---|
| 2 | `keen/flora-knows-all-keen-review-2026` | `…/reviews/flora-knows-all-keen-review` | `…/reviews/keen/flora-knows-all-keen-review-2026/` |
| 3 | `keen/love-psychic-victoria-sands-keen-review-2026` | `…/reviews/love-psychic-victoria-sands-keen-review` | `…/reviews/keen/love-psychic-victoria-sands-keen-review-2026/` |
| 4 | `keen/psychic-suzen-on-keen-review-2026` | `…/reviews/psychic-suzen-keen-review` | `…/reviews/keen/psychic-suzen-on-keen-review-2026/` |
| 5 | `keen/psychicreader19622-raymond-keen-review-2026` | `…/reviews/psychicreader19622-raymond-keen-review` | `…/reviews/keen/psychicreader19622-raymond-keen-review-2026/` |

**Fix:** Set each `canonicalUrl` to the page's real URL (add the `-2026` suffix; for psychic-suzen restore `on-`). All other Keen/Kasamba/PG canonicals are correct.

---

## C. QUALITY / SEO RISK — Purple Garden set is thin & heavily templated (all 20)

This is the broadest problem and the likely root cause of why Ayla read as "off."

**Length:** Purple Garden articles run **428–1,163 words (median 519)** — far shorter than Keen (median 1,095) and Kasamba (median 1,817). Several are near the thin-content floor.

**Templating:** Every PG article uses the identical 5-section skeleton (`Who Is…`, `How … Reads`, `What Clients Experience`, `Pricing`, `Is … Right for You?`) with boilerplate clauses swapped only by name/number. Verbatim/shared strings:

- *"New Purple Garden clients get a $30 credit — enough for a short [X] with [Name]. Use it to ask one [question]…"* → **15 / 20 files** (copy-pasted CTA)
- *"Confirm voice/video rates for your format."* → **13 / 20 files**
- *"Her volume is lower than trending leaders"* → **5 / 20 files** (identical sentence)
- Same `Best Fit / Not the Right Match If… / Starting with Purple Garden's New Client Offer` structure in **every** file.

**Why it matters:** Near-duplicate spun content is exactly what Google's helpful-content / thin-content systems demote. It also reads as low-effort to a human (which is what made Ayla feel wrong to you).

**Unverified stats (data-pipeline concern):** Like Ayla, every PG article states precise figures (*"X,XXX readings since 20XX at a perfect 5.0"*) as fact. Ayla admitted its numbers weren't verified; the other 19 present the same kind of number confidently. The inconsistency suggests the PG dataset was **not uniformly sourced/verified**. Recommend spot-checking all 20 PG stats (readings count, star rating, tenure, price) against the live Purple Garden profiles.

**Fix:** De-template — rewrite each PG article with reader-specific substance (real methodology differences, actual review themes, distinct verdicts). At minimum, remove the identical CTA/boilerplate and differentiate the "Not the Right Match" sections. Verify all stated stats.

---

## D. MINOR — grammar / naming slips

| # | File | Issue |
|---|---|---|
| 6 | `purple-garden/nuwatarot` | H2 reads **"1 Years on Purple Garden"** (should be "1 Year") |
| 7 | `purple-garden/psychic-jeanne` | H2 reads **"Who Is Psychicjeanne?"** (missing space; title is "Psychic Jeanne") |

(Also note: `adam-africa` line 113 uses lowercase "if you book through our links" vs capital "If" elsewhere — cosmetic inconsistency, low priority.)

---

## What is already clean (no action needed)

- **Kasamba (20/20):** substantive, unique, no field or link errors.
- **Keen (43/47):** genuinely high-quality — real statistics, platform-specific reasoning, even independent Reddit/anecdotal verification (e.g., Krys Britton, Eli Casey, Spirit Answers). Only the 4 canonical URLs in section B need fixing.
- **Internal links:** All "More reviews" cross-links resolve to existing slugs; no broken or wrong-platform links found.
- **Frontmatter completeness:** No missing required fields (title, description, rating, verdict, affiliateUrl, pricing, bestFor) in any of the 87 files.
- **Non-English text:** None detected in any body.

---

## Recommended action order

1. **Fix the 4 Keen canonical URLs** (5-minute mechanical fix, real SEO impact).
2. **Rewrite/fix Ayla** — remove the self-contradicting placeholder rating; verify or reframe (critical credibility fix).
3. **Audit all 20 Purple Garden stats** against live profiles; correct any unverified numbers.
4. **De-template the Purple Garden set** for thin-content/SEO safety.
5. **Fix the 2 minor grammar/naming slips** (nuwatarot, psychic-jeanne).

Want me to apply any of these fixes? The canonical URLs (B) and minor slips (D) are safe, mechanical edits I can do immediately; Ayla (A) and the PG rewrite (C) need a content pass I can draft.
