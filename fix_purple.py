import os
import re

css_path = 'css/styles.css'
with open(css_path, 'r') as f:
    css = f.read()

css = re.sub(r'79,\s*70,\s*229', '107, 125, 109', css)
css = re.sub(r'99,\s*102,\s*241', '163, 177, 138', css)

with open(css_path, 'w') as f:
    f.write(css)

html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for html_file in html_files:
    with open(html_file, 'r') as f:
        html = f.read()
    
    html = re.sub(r'<meta name="theme-color" content=".*?">', '<meta name="theme-color" content="#6B7D6D">', html)
    html = html.replace('#8B5CF6', '#6B7D6D')
    html = html.replace('4F46E5', '6B7D6D')
    html = html.replace('6366F1', 'A3B18A')
    
    with open(html_file, 'w') as f:
        f.write(html)

print("Fix completed.")
