import os
import re

files_to_check = [
    r"c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen\mike-pace.md",
    r"c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen\lollie-ext-5555.md",
    r"c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen\serenity-stone.md",
    r"c:\Users\samja\Desktop\site\easternalignment\scratch\keen-reader-links.md",
    r"c:\Users\samja\Desktop\site\easternalignment\scratch\qa_review_report.json"
]

for filepath in files_to_check:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "mike-pace.md" in filepath:
        new_content = content.replace("19.99", "9.99")
    else:
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if "19.99" in line and re.search(r'mike pace', line, re.IGNORECASE):
                new_lines.append(line.replace("19.99", "9.99"))
            else:
                new_lines.append(line)
        new_content = '\n'.join(new_lines)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
