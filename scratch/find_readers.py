import os
import yaml
import re

dir_path = r'c:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen'
readers = []

for filename in os.listdir(dir_path):
    if filename.endswith('.md'):
        file_path = os.path.join(dir_path, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if content.startswith('---'):
                try:
                    end_idx = content.find('---', 3)
                    front_matter = content[3:end_idx]
                    data = yaml.safe_load(front_matter)
                    data['filename'] = filename
                    data['content'] = content[end_idx+3:]
                    
                    sessions_match = re.search(r'([\d,]+)\+?\s*(sessions|readings|reviews)', data['content'], re.IGNORECASE)
                    if sessions_match:
                        sess_str = sessions_match.group(1).replace(',', '')
                        data['sessions'] = int(sess_str)
                    else:
                        highlights = data.get('highlights', [])
                        sess = 0
                        for h in highlights:
                            if 'session' in str(h).lower() or 'reading' in str(h).lower() or 'review' in str(h).lower():
                                m = re.search(r'([\d,]+)', str(h))
                                if m:
                                    sess = int(m.group(1).replace(',', ''))
                                    break
                        data['sessions'] = sess
                        
                    readers.append(data)
                except Exception as e:
                    pass

for r in readers:
    rating = r.get('rating', 0)
    sessions = r.get('sessions', 0)
    bestFor = r.get('bestFor', '')
    if float(rating) >= 4.8 and sessions >= 5000:
        print(f"{r['filename']} | Rating: {rating} | Sessions: {sessions} | Price: {r.get('pricing')} | BestFor: {bestFor}")
