---
name: bulk-reader-batch-optimization
description: When bulk-adding a batch of reader-review articles (.md in src/content/readers/{kasamba,purple-garden,keen}/) to the easternalignment Astro site, run the internal-link rebalance + rich-media (Article customSchema) alignment so the new batch integrates cleanly and maximizes SERP rich results. Triggers: adding multiple reader articles at once, "内链优化", "富媒体优化" on reader pages, new reader batch publish.
---

# Bulk Reader-Batch Optimization (easternalignment)

Applies **after** a new batch of reader-review markdown files is dropped into
`src/content/readers/{kasamba,purple-garden,keen}/`. Two problems recur every
batch; fix both before the user builds locally.

## 1. Internal-link rebalance (the batch-starvation bug)

**Symptom**: with ~all reader ratings clustered 4.4–5.0, the legacy "top-N-by-rating"
cross-link selector collapses — a tiny elite hoards all internal link equity and
the new batch (and most existing pages) get ZERO links from the "Other Readers"
section. PG's old "first-3-in-file-order" was worse: batch added last never appeared.

**Already fixed in code**: `src/lib/relatedReaders.ts` exports
`pickRelatedReaders(current, all, count)` + `pickRelatedGuides(reader, guides, max)`.
The selector uses a **coprime-step rotated window** over a stable slug-sorted list
(STEP coprime to each platform's n) so every reader gets a uniform number of
inbound links (zero orphans), with niche-overlap display ordering. Niche keywords
are love/tarot/medium/career/astrology/dream/pet ONLY — `psychic/intuitive` are
deliberately excluded (they match ~everyone and break the discriminator).

The three `src/pages/reviews/{kasamba,keen,purple-garden}/[reader].astro` already
call `pickRelatedReaders`/`pickRelatedGuides`. **No component edit needed for a new
batch** — the glob picks up new .md files automatically.

**What you MUST run per batch**: regenerate the static markdown footer block on
EVERY reader article so the new batch is referenced and footers stay valid+topical:
```bash
python3 scratch/regen_footers.py     # rewrites the "**More X reviews:** ..." line on all reader .md
python3 scratch/il_audit.py          # verify: broken footer links == 0, new articles with 0 footer inbound == 0
```
If `scratch/regen_footers.py` doesn't exist, reconstruct it: per reader, pick 3
same-platform siblings via the coprime-step rotated window (step=11, complementary
to the in-page cards' step=5), drop self, display-order by niche overlap, append
hub link. Strip YAML quotes from frontmatter values when deriving display names.

**Do NOT** reintroduce a hash-`%n` rotation — it collapses to few buckets (gcd
artifacts) and creates false orphans. Coprime step only.

## 2. Rich-media (SERP Rich Results) alignment for the new batch

**Truth**: the layout (ReviewLayout+BaseLayout) already emits a compliant, uniform
schema set on EVERY reader page — Review(itemReviewed=Product → stars)+AggregateRating
+Brand+Breadcrumb+FAQ+WebSite/Organization/Person. New articles inherit it
automatically. The only per-article variable is the `customSchema` frontmatter field.

**The bug**: a `customSchema` that is a SECOND Review block (itemReviewed=Person or
Service — neither whitelisted) duplicates+conflicts with the layout's Product-Review
(the "种类问题" type conflict) and adds no new rich-result type.

**Fix per batch**: convert each new article's `customSchema` from Review → a rich
**Article** schema (Article rich result + layout's Review stars, no conflict):
```bash
python3 scratch/schema_article.py    # converts customSchema -> Article for publishDate==latest-batch articles
```
The Article schema fields: `headline` (seoTitle/title ≤110), `description`
(metaDescription/description), `image` (ogImage or avatar absolute URL),
`author` Person(Sarah, /about/), `publisher` Organization(EA + ImageObject logo
1024×817), `datePublished`/`dateModified`, `mainEntityOfPage` WebPage @id=canonical,
`articleSection` "<Platform> Reader Reviews", `wordCount`, `about` (entities→Thing).

If `scratch/schema_article.py` is missing, reconstruct: target the batch by
publishDate, replace the `customSchema: |` literal block, validate JSON parses.

**Known gaps (not blocking, note to user)**:
- Kasamba reader articles usually lack `ogImage` → Article.image falls back to the
  square avatar (not ideal 1200×630; needs real image-asset generation).
- layout Review's `itemReviewed.url` = `/go/` affiliate link (self-serving risk) —
  affects ALL pages, the RICH_MEDIA_IMPLEMENTATION_PLAN.md flags it "前序已上线不动";
  do not touch unless user explicitly asks.
- 114 older articles still carry the conflicting Review customSchema — offer to
  run the same Article conversion on them as a follow-up (don't auto-expand scope).

## 3. Build + verify (sandbox CANNOT build)

`astro build` deadlocks in the sandbox (since 2026-08-14). The user MUST build
locally (with `CODEBUDDY_SESSION_ID= CLAUDE_SESSION_ID=` to bypass the safe-delete
shim). After deploy, verify with Google Rich Results Test on: homepage, a platform
hub, one reader page, one guide, one tool page. Watch GSC → 增强功能 for error drop.

## Audit scripts (in scratch/, gitignored — local only)
- `il_audit.py` — footer link validity + "Other Readers" inbound distribution
- `il_sim.py` — simulate selector fairness (orphans / inbound min-avg-max)
- `regen_footers.py` — regenerate all reader footers (fair + topical)
- `schema_article.py` — convert batch customSchema Review → Article
- `schema_cmp.py` / `rm_audit.py` — compare customSchema structure / rich-media signals
