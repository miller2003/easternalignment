import os
import re
import yaml

def fix_md_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split frontmatter and body
    parts = content.split('---', 2)
    if len(parts) < 3:
        return
    
    frontmatter_raw = parts[1]
    body = parts[2]
    
    try:
        frontmatter = yaml.safe_load(frontmatter_raw)
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return

    slug = os.path.basename(filepath).replace('.md', '')
    title = frontmatter.get('title', '')
    publish_date = frontmatter.get('publishDate', '')
    updated_date = frontmatter.get('updatedDate', publish_date)
    rating = frontmatter.get('rating', 5.0)
    platform_name = frontmatter.get('platformName', '').replace('Keen: ', '')
    affiliate_url = frontmatter.get('affiliateUrl', '')
    
    # Extract existing FAQ if present in customSchema
    faq_part = None
    custom_schema_str = frontmatter.get('customSchema', '')
    if custom_schema_str:
        try:
            # Handle both string and list
            schema_data = yaml.safe_load(custom_schema_str)
            if isinstance(schema_data, list):
                for item in schema_data:
                    if item.get('@type') == 'FAQPage':
                        faq_part = item
            elif isinstance(schema_data, dict):
                if schema_data.get('@type') == 'FAQPage':
                    faq_part = schema_data
        except:
            pass

    # Build standardized Review Schema
    review_schema = {
        "@context": "https://schema.org",
        "@type": "Review",
        "headline": title,
        "datePublished": publish_date,
        "dateModified": updated_date,
        "author": {
            "@type": "Person",
            "name": "Sarah",
            "url": "https://easternalignment.com/about/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "EasternAlignment",
            "url": "https://easternalignment.com",
            "logo": "https://easternalignment.com/logo.jpg"
        },
        "reviewRating": {
            "@type": "Rating",
            "ratingValue": str(rating),
            "bestRating": "5",
            "worstRating": "1"
        },
        "itemReviewed": {
            "@type": "Product",
            "name": platform_name,
            "url": affiliate_url.split('url=')[-1].split('&')[0] if 'url=' in affiliate_url else affiliate_url,
            "provider": {
                "@type": "Organization",
                "name": "Keen",
                "url": "https://www.keen.com"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"https://easternalignment.com/reviews/keen/{slug}/"
        }
    }
    
    # Add reviewBody if possible
    description = frontmatter.get('description', '')
    if description:
        review_schema["reviewBody"] = description

    # Final Schema
    final_schema = review_schema
    if faq_part:
        final_schema = [review_schema, faq_part]
    
    # Update frontmatter
    import json
    frontmatter['customSchema'] = json.dumps(final_schema, indent=2, ensure_ascii=False)
    
    # Also fix affiliate link placeholder in body
    new_body = body.replace('[AFFILIATE_URL]', affiliate_url)
    
    # Write back
    new_frontmatter_raw = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('---\n' + new_frontmatter_raw + '---\n' + new_body)

dir_path = r'c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen'
for filename in os.listdir(dir_path):
    if filename.endswith('.md'):
        fix_md_file(os.path.join(dir_path, filename))
