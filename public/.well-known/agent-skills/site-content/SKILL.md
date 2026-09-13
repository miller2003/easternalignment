---
name: site-content-access
description: Access Eastern Alignment psychic platform reviews and guides via markdown content negotiation
version: 1.0.0
---

# Eastern Alignment Content Access Skill

## Overview

Eastern Alignment publishes independent reviews, rankings, and buyer guidance for online psychic reading platforms — Kasamba, Keen, and Purple Garden. All content is based on hands-on testing and auditing of 162+ published advisor profiles.

## How to Access Content

### Markdown Content Negotiation (Recommended)

Every content page supports automatic markdown conversion. Send any page URL with the `Accept: text/markdown` header to receive clean, navigation-free markdown instead of HTML:

```http
GET /reviews/kasamba/ HTTP/1.1
Host: easternalignment.com
Accept: text/markdown
```

The response will be `Content-Type: text/markdown; charset=utf-8` with only the article body — no navigation, sidebars, or promotional elements.

### Full Site Index

A curated index of all reviews, comparisons, and guides:

```
GET /llms.txt HTTP/1.1
Host: easternalignment.com
```

### Sitemap

Complete URL list with lastmod dates for all 300+ pages:

```
https://easternalignment.com/sitemap-index.xml
```

## Content Structure

### Platform Reviews (`/reviews/{platform}/`)

Full platform reviews with methodology scores:
- `/reviews/kasamba/` — 64 advisor profiles, 3 free minutes + 50% off
- `/reviews/keen/` — 49 advisor profiles, 5 minutes for $1
- `/reviews/purple-garden/` — 49 advisor profiles, $30 free credit

### Individual Reader Reviews (`/reviews/{platform}/{reader-slug}/`)

In-depth profiles for individual psychic advisors, including session counts, ratings, specialties, and pricing.

### Head-to-Head Comparisons (`/comparisons/{slug}/`)

Structured platform comparisons on pricing, reader vetting, refund policies:
- `/comparisons/kasamba-vs-keen/`
- `/comparisons/purple-garden-vs-keen/`
- `/comparisons/keen-vs-kasamba-vs-purple-garden/`

### Best-of Guides (`/guides/{slug}/`)

Ranked recommendations by specialty (love, tarot, mediumship, career) and platform, with per-reader pricing and verified session counts.

### Methodology (`/methodology/`)

Complete 7-step testing protocol, weighted scoring framework, and evidence classification system (A/B/C/D).

## Rate Limits

Respect the `Crawl-delay: 1` directive in robots.txt. No hard rate limits, but rapid bursts may trigger Cloudflare bot mitigation.

## Data Freshness

Content is updated regularly. Check the `lastmod` field in the sitemap or the `updatedDate` frontmatter field in markdown responses for the most recent update date.
