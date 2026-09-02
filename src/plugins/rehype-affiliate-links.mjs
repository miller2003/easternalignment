/**
 * rehype plugin — mark affiliate redirect links as sponsored.
 *
 * Google's link-spam policy requires affiliate / paid links to carry
 * `rel="sponsored"` (or `nofollow`). Every CTA *component* in this repo
 * already ships `rel="nofollow sponsored"`, but affiliate links written
 * directly in Markdown body copy (`[text](/go/kasamba-master-enigma/)`)
 * were rendered as plain dofollow anchors — 11 per article in some cases.
 *
 * This walks the hast tree and stamps every `/go/*` anchor, so the rule is
 * enforced project-wide regardless of who writes the content.
 *
 * Dependency-free: it does its own recursive walk so we don't pull in
 * unist-util-visit for ~30 lines of traversal.
 */
export default function rehypeAffiliateLinks(options = {}) {
  const prefixes = options.prefixes || ['/go/', '/out/', '/refer/'];

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }

    /* Markdown body copy also contains raw HTML blocks such as
     * <div class="cta-flex"><a href="/go/kasamba" class="btn btn--primary">.
     * remark-rehype keeps those as `raw` nodes instead of parsing them into
     * elements, so they never reach the element branch below — which is how a
     * dofollow affiliate link was surviving on every article. Patch the HTML
     * string directly for those. */
    if (node.type === 'raw' && typeof node.value === 'string') {
      node.value = node.value.replace(
        /<a\s+([^>]*href="\/go\/[^"]*"[^>]*)>/gi,
        (match, attrs) =>
          /rel\s*=/i.test(attrs) ? match : `<a ${attrs} rel="nofollow sponsored" target="_blank">`
      );
      return;
    }

    if (node.type !== 'element' || node.tagName !== 'a') return;
    if (!node.properties || typeof node.properties.href !== 'string') return;

    const href = node.properties.href;
    if (!prefixes.some((prefix) => href.startsWith(prefix))) return;

    // Preserve any rel already present, then guarantee both tokens.
    const existing = Array.isArray(node.properties.rel)
      ? node.properties.rel
      : typeof node.properties.rel === 'string'
        ? node.properties.rel.split(/\s+/)
        : [];

    const tokens = new Set(existing.filter(Boolean));
    tokens.add('nofollow');
    tokens.add('sponsored');

    node.properties.rel = [...tokens].join(' ');
    node.properties.target = '_blank';
  }

  return function transformer(tree) {
    walk(tree);
  };
}
