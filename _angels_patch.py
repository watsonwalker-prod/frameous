#!/usr/bin/env python3
"""Idempotent: Angels nav link on every page sharing the primary nav; notify.js data-done support. Run from site root."""
import os,re
n=0
for root,ds,fs in os.walk('.'):
    ds[:]=[d for d in ds if d not in ('node_modules','.vercel','.git','library') and not d.startswith('_backup') and not d.startswith('_fraimous')]
    for f in fs:
        if not f.endswith('.html'): continue
        p=os.path.join(root,f)
        try: s=open(p,encoding='utf-8').read()
        except UnicodeDecodeError: print('skip',p); continue
        i=s.find('<nav class="nav-links"')
        if i<0: continue
        j=s.find('</nav>',i)
        if '/angels"' in s[i:j]: continue
        m=re.search(r'(\n(\s*)<a href="[^"]*"[^>]*>Works</a>)',s[i:j])
        if not m: print('NO WORKS LINK',p); continue
        continue  # 2026-10-15: Angelic Intelligence is NOT in the main nav (footer link only)
print('nav patched',n)
js=open('notify.js').read()
a='form.innerHTML = `<p class="notify-done">You\'re on the list.</p>`;'
b='form.innerHTML = `<p class="notify-done">${form.dataset.done || "You\'re on the list."}</p>`;'
if a in js: open('notify.js','w').write(js.replace(a,b)); print('notify.js patched')
elif b in js: print('notify.js already')
else: print('notify.js PATTERN MISSING')
