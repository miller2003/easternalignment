#!/usr/bin/env python3
"""
strip_end_hook_and_disclosure.py
Remove two things from each reader .md:

  (a) the trailing italicised affiliate-disclosure line:
      "*Eastern Alignment is reader-supported. If you book through our
      links, we may earn a commission at no extra cost to you.*"

  (b) the bold "offer hook" paragraph that follows the LAST `---`
      separator at the end of the file. Pattern:

         ...body...\n\n---\n\n**bold hook that re-pitches the offer**\n\n
         *disclosure*\n

      The bold paragraph is the re-pitch (e.g. "**95,479 readings. ... the
      3 free minutes are waiting when she's back.**"). It duplicates the
      work now done by the auto-injected <ReaderEndCTA /> + <CTABox /> in
      the reader route, so it weakens the page (two competing offers).

What stays: frontmatter, all H2/H3 body, the "More <Platform> reviews:"
cross-link block (which lives BEFORE the `---` in some files and AFTER
in others — we explicitly do NOT touch it), trailing newline.

Safety: we only delete the bold paragraph immediately after the LAST
`---` at end of file, and only when it doesn't start with the literal
"**More" (i.e. it's not the cross-link block). Anything else is left
untouched.
"""
import re
import sys
from pathlib import Path

ROOT = Path(r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers")
DISCLOSURE_LINE = "*Eastern Alignment is reader-supported. If you book through our links, we may earn a commission at no extra cost to you.*"

# Match the disclosure line, preceded by one or more blank lines, at end
# of file. Replace with nothing (so we don't leave a dangling blank).
DISCLOSURE_RE = re.compile(
    r"\n+\*" + re.escape("Eastern Alignment is reader-supported. If you book through our links, we may earn a commission at no extra cost to you.") + r"\*\s*\Z",
)

# Match:  ---\n\n**bold paragraph (single line, ends with **)**\n*
# Only when preceded by end-of-file context (the disclosure step already
# removed the disclosure, so we look for this pattern just before EOF).
# We use a non-greedy match for the bold paragraph content. We
# deliberately allow *internal* single-asterisk emphasis (e.g. "*she*")
# so the regex doesn't reject paragraphs that contain italic runs.
#
# Note: many "bold hook" paragraphs actually start with **bold** then
# continue as plain text on the same line, e.g.
#   "**355,674 readings. ... that nobody could fake.** Master Enigma is
#    what happens when ..."
# So we accept the pattern \*\*[^\n]*\*\*[^\n]* (one bold span followed
# by optional plain text on the same line) rather than insisting the
# whole line is wrapped in **.
BOLD_AFTER_DASHES_RE = re.compile(
    r"\n---\n\n\*\*[^\n]*\*\*[^\n]*\s*\Z",
)

# Guard: do NOT strip a paragraph that starts with **More (cross-link).
def is_cross_link_paragraph(text: str) -> bool:
    return text.lstrip("\n").lstrip().startswith("**More ")
def process(path: Path) -> tuple[str, str]:
    """Return (status, info). status ∈ {touched, skipped, skipped_no_disclosure}."""
    src = path.read_text(encoding="utf-8")
    if "Eastern Alignment is reader-supported" not in src:
        return "skipped_no_disclosure", ""

    original = src

    # 1. Strip the disclosure line + its leading blank lines (so we don't
    #    leave a dangling blank gap).
    src, n_disclosure = DISCLOSURE_RE.subn("", src, count=1)
    if not n_disclosure:
        return "skipped_no_disclosure_match", ""

    # 2. If the file ends with a bold paragraph right after the last
    #    `---`, strip that paragraph. We strip the `---` line too if the
    #    paragraph that followed it is a re-pitch hook (not the cross-link
    #    block). Anything else is left untouched.
    m = BOLD_AFTER_DASHES_RE.search(src)
    if m:
        # The whole match is the "---" line + the bold hook paragraph
        # (single line). We drop both, since the body already has its
        # own H2/H3 separators earlier and the cross-link block (when
        # present) lives BEFORE this final `---` in the structure.
        whole = m.group(0)
        # Capture the paragraph portion (after `\n---\n\n`) to inspect
        # whether it's a cross-link block.
        para = whole.split("\n---\n\n", 1)[-1]
        if not is_cross_link_paragraph(para):
            src = src[:m.start()] + src[m.end():]
            # Tidy up trailing whitespace so the file ends with a
            # single newline.
            src = src.rstrip() + "\n"

    if src != original:
        path.write_text(src, encoding="utf-8")
        return "touched", ""
    return "skipped", ""


def main() -> int:
    targets = sorted(ROOT.glob("*/*.md"))
    stats = {"touched": 0, "skipped": 0, "skipped_no_disclosure": 0, "skipped_no_disclosure_match": 0}
    for p in targets:
        status, _ = process(p)
        stats[status] = stats.get(status, 0) + 1
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"  total: {len(targets)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
