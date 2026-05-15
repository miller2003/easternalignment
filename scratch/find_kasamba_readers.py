import os
import yaml
import re

directory = r"c:\Users\samja\Desktop\site\easternalignment\src\content\readers\kasamba"
readers = []

for filename in os.listdir(directory):
    if filename.endswith(".md"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Extract front matter
            parts = content.split('---')
            if len(parts) >= 3:
                front_matter = parts[1]
                try:
                    data = yaml.safe_load(front_matter)
                    # Extract sessions/reviews count by simple regex scan of content for numbers next to "reviews" or "sessions"
                    # But if we have it in data, use it. Usually they have a title, rating, pricing, bestFor.
                    readers.append({
                        'filename': filename,
                        'name': data.get('title', ''),
                        'platformName': data.get('platformName', ''),
                        'rating': data.get('rating', 0),
                        'pricing': data.get('pricing', ''),
                        'bestFor': data.get('bestFor', ''),
                        'affiliateUrl': data.get('affiliateUrl', ''),
                        'slug': filename.replace('.md', '')
                    })
                except Exception as e:
                    pass

# Sort by rating descending
readers.sort(key=lambda x: x['rating'], reverse=True)

for r in readers:
    print(f"Name: {r['platformName']} ({r['filename']})")
    print(f"Rating: {r['rating']}")
    print(f"Price: {r['pricing']}")
    print(f"Best For: {r['bestFor']}")
    print("-" * 40)
