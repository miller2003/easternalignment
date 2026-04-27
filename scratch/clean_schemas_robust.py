import os
import re
import json

def clean_md_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Fix broken star character in metaDescription
    content = content.replace('â˜?', ' stars ')
    
    # Surgical replacement for customSchema
    # We want to remove the Review schema from customSchema but keep FAQPage
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return
    
    frontmatter = parts[1]
    body = parts[2]
    
    # Use regex to find customSchema block
    # It can be multi-line or single line
    schema_match = re.search(r'customSchema: (\|?\s*.*?)(?=\n\w+:|---|\n\n)', frontmatter, re.DOTALL)
    if schema_match:
        schema_raw = schema_match.group(1).strip()
        if schema_raw.startswith('|'):
            schema_json_str = schema_raw[1:].strip()
        else:
            schema_json_str = schema_raw
            
        try:
            # Try to parse as JSON or YAML-ish
            # Simple check for FAQPage
            if 'FAQPage' in schema_json_str:
                # If it's an array, extract the FAQPage object
                # This is tricky with regex. Let's try to find the FAQPage part.
                faq_match = re.search(r'\{\s*"@type":\s*"FAQPage".*?\}\s*(\n\s*\]|\n\s*\}|$)', schema_json_str, re.DOTALL)
                if faq_match:
                    faq_json = faq_match.group(0).strip()
                    # If it was in an array, it might have trailing comma or brackets
                    faq_json = faq_json.rstrip(',').rstrip(']')
                    
                    # Construct clean FAQ schema
                    clean_faq = '{\n    "@context": "https://schema.org",\n    "@type": "FAQPage",\n' + faq_json.split('"@type": "FAQPage",', 1)[1]
                    # Ensure context is there
                    if '"@context"' not in clean_faq:
                        clean_faq = '{\n    "@context": "https://schema.org",\n' + clean_faq[1:]
                    
                    new_schema_block = f'customSchema: |\n  {clean_faq}'
                    frontmatter = frontmatter.replace(schema_match.group(0), new_schema_block)
                else:
                    # No FAQ found, just remove Review if it was there
                    frontmatter = frontmatter.replace(schema_match.group(0), 'customSchema: ""')
            else:
                # No FAQPage, just remove the Review schema
                frontmatter = frontmatter.replace(schema_match.group(0), 'customSchema: ""')
        except:
            # Fallback: if it's too complex, just clear it to be safe
            frontmatter = frontmatter.replace(schema_match.group(0), 'customSchema: ""')

    # Also fix affiliate link placeholder in body just in case some were missed
    # (Though we already ran a command for this)
    aff_match = re.search(r'affiliateUrl: ["\']?(.*?)["\']?\n', frontmatter)
    if aff_match:
        url = aff_match.group(1).strip().strip('"').strip("'")
        body = body.replace('[AFFILIATE_URL]', url)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('---' + frontmatter + '---' + body)

dir_path = r'c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen'
for filename in os.listdir(dir_path):
    if filename.endswith('.md'):
        clean_md_file(os.path.join(dir_path, filename))
