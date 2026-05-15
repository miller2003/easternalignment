import re
import sys
import traceback

try:
    filepath = r"c:\Users\samja\Desktop\site\easternalignment\src\content\blog\best-love-psychics-keen-ex-recovery.md"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Front matter updates (Schema, platformName, avatarUrl, pros, cons)
    schema_replacement = """customSchema: |
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "5 Best Love Psychics on Keen for Ex-Recovery Readings (2026)",
    "description": "Navigating post-breakup uncertainty? We analyzed Keen's top-rated love psychics based on session volume, review patterns, and proven ex-recovery accuracy.",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "url": "https://easternalignment.com/reviews/keen/david7/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "url": "https://easternalignment.com/reviews/psychic-suzen-keen-review/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "url": "https://easternalignment.com/reviews/keen/readings-by-kelly777/"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "url": "https://easternalignment.com/reviews/keen/regina-jacks/"
      },
      {
        "@type": "ListItem",
        "position": 5,
        "url": "https://easternalignment.com/reviews/keen/arradaza/"
      }
    ]
  }"""

    old_schema = """customSchema: |
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Will He Come Back? 5 Best Love Psychics on Keen for Ex-Recovery Readings (2026)",
    "author": {
      "@type": "Organization",
      "name": "Eastern Alignment"
    },
    "about": [
      { "@type": "Thing", "name": "Keen Love Psychic Reading" },
      { "@type": "Thing", "name": "Ex Reconciliation Psychic" },
      { "@type": "Thing", "name": "Online Psychic Reading for Relationships" }
    ]
  }"""

    content = content.replace(old_schema, schema_replacement)

    # Adding missing front matter fields
    pros_cons_etc = """platformName: "Keen: Best Love Psychics"
avatarUrl: "/avatars/keen/best-love-psychics.jpg"
pros:
- Features only readers with 40,000+ verified sessions
- Focuses specifically on reconciliation and post-breakup dynamics
- Highlights readers with direct, honest communication styles
cons:
- Premium readers require a significant financial commitment
- Not suitable for clients seeking 100% guaranteed timelines
rating: 4.8"""

    content = content.replace("rating: 4.8", pros_cons_etc)

    # 2. YMYL issue #6
    old_ymyl = 'Her bio claims "98% accuracy"—a statistical impossibility in psychic readings that you should ignore.'
    new_ymyl = 'Her profile contains a numerical accuracy claim that no practitioner in this field can substantiate.'
    content = content.replace(old_ymyl, new_ymyl)

    # 3. Add internal links and diverse CTAs
    # David7
    content = content.replace(
        "[Get your first 5 minutes for $1 →](/go/keen-david7)",
        "For a deeper dive into his timeline accuracy, [read our full David7 review](/reviews/keen/david7/).\n\n[Start your session with David7 (5 mins for $1) →](/go/keen-david7)"
    )

    # Psychic SuZen
    content = content.replace(
        "[Get your first 5 minutes for $1 →](/go/keen-psychic-suzen)",
        "To understand her life coach methodology better, [read our full Psychic SuZen review](/reviews/psychic-suzen-keen-review/).\n\n[Get emotional clarity with SuZen (5 mins for $1) →](/go/keen-psychic-suzen)"
    )

    # Readings by Kelly777
    content = content.replace(
        "[Get your first 5 minutes for $1 →](/go/keen-readings-by-kelly777)",
        "Curious about her remote viewing? [Read our full Readings by Kelly777 review](/reviews/keen/readings-by-kelly777/).\n\n[Explore karmic connections with Kelly777 (5 mins for $1) →](/go/keen-readings-by-kelly777)"
    )

    # Regina Jacks
    content = content.replace(
        "[Get your first 5 minutes for $1 →](/go/keen-regina-jacks)",
        "Learn more about her direct style in our [full Regina Jacks review](/reviews/keen/regina-jacks/).\n\n[Get immediate impressions from Regina (5 mins for $1) →](/go/keen-regina-jacks)"
    )

    # Arradaza
    content = content.replace(
        "[Get your first 5 minutes for $1 →](/go/keen-arradaza)",
        "See how her 5-tool system works in our [full Arradaza review](/reviews/keen/arradaza/).\n\n[Untangle your dynamic with Arradaza (5 mins for $1) →](/go/keen-arradaza)"
    )

    # 4. Add roundup summary at the end
    summary_paragraph = """
### Final Thoughts: Which Reader Should You Choose?

Navigating a breakup is emotionally exhausting, and choosing the right guide shouldn't add to your stress. If you need strict timelines and male perspective, **David7** is unmatched. If you are overwhelmed and need actionable steps, **Psychic SuZen** provides the grounded coaching you need. **Kelly777** is the definitive choice for karmic cycles, **Regina Jacks** offers high-volume accuracy on a budget, and **Arradaza** is perfect for unraveling multi-layered, complex histories. Choose the reader whose communication style best matches your current emotional capacity, and use your introductory minutes to ensure their perception truly aligns with your situation."""

    content = content + summary_paragraph

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Modifications applied successfully.")
except Exception as e:
    print("Error:", e)
    traceback.print_exc()
