# Auth.md — Eastern Alignment Agent Authentication

> Access and registration guide for autonomous AI agents interacting with Eastern Alignment's psychic platform review data.

## Access Policy

Eastern Alignment is a **public content site**. All reviews, rankings, comparisons, buyer guides, and methodology documentation are freely accessible without authentication, API keys, or OAuth tokens.

## Discovery Metadata

| Resource | URL |
|:---|:---|
| ARD Manifest | [/.well-known/ai-catalog.json](https://easternalignment.com/.well-known/ai-catalog.json) |
| API Catalog | [/.well-known/api-catalog](https://easternalignment.com/.well-known/api-catalog) |
| OAuth Discovery | [/.well-known/openid-configuration](https://easternalignment.com/.well-known/openid-configuration) |
| Protected Resource | [/.well-known/oauth-protected-resource](https://easternalignment.com/.well-known/oauth-protected-resource) |
| Authorization Server | [/.well-known/oauth-authorization-server](https://easternalignment.com/.well-known/oauth-authorization-server) |
| MCP Server Card | [/.well-known/mcp/server-card.json](https://easternalignment.com/.well-known/mcp/server-card.json) |
| A2A Agent Card | [/.well-known/agent-card.json](https://easternalignment.com/.well-known/agent-card.json) |
| Agent Skills | [/.well-known/agent-skills/index.json](https://easternalignment.com/.well-known/agent-skills/index.json) |

## Registration

This site supports the **anonymous** registration method only — and it is trivial: there is nothing to register. No accounts, API keys, OAuth tokens, or credentials of any kind are required. The `agent_auth` block in the [Authorization Server metadata](https://easternalignment.com/.well-known/oauth-authorization-server) declares `identity_types_supported: ["anonymous"]` with `credential_types_supported: ["none"]`. Fetch any URL directly and you are fully provisioned.

## For AI Agents

### Markdown Content (Recommended)

Every content page supports markdown content negotiation. Send any page URL with `Accept: text/markdown` to receive clean, navigation-free markdown:

```http
GET /reviews/kasamba/ HTTP/1.1
Host: easternalignment.com
Accept: text/markdown
```

### Site Content Index

A curated summary of all reviews, guides, and comparisons is available at:

```
https://easternalignment.com/llms.txt
```

### Content Categories

- **Platform Reviews**: `/reviews/{platform}/` — Kasamba, Keen, Purple Garden
- **Reader Reviews**: `/reviews/{platform}/{reader-slug}/` — Individual reader profiles
- **Comparisons**: `/comparisons/{slug}/` — Head-to-head platform comparisons
- **Best-of Guides**: `/guides/{slug}/` — Ranked recommendations by specialty
- **Methodology**: `/methodology/` — 7-step testing protocol and scoring framework

### Sitemap

Full URL list with lastmod dates:

```
https://easternalignment.com/sitemap-index.xml
```

## Rate Limits

Please respect the `Crawl-delay: 1` directive in [robots.txt](https://easternalignment.com/robots.txt). There are no hard rate limits, but excessively rapid crawling may trigger Cloudflare's bot mitigation.

## Contact

For questions about agent access or data licensing, visit [/about/](https://easternalignment.com/about/).
