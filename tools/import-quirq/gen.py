"""Build quirq-orbit/js/research.js and js/writing.js from the downloaded pages."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import convert

OUT = sys.argv[1]
TOPIC = {'speed trials': 'speed-trials', 'from the desk': 'from-the-desk', 'proving grounds': 'proving-grounds'}


def tidy(h):
    h = re.sub(r'<h2>(\d\d)', r'<h2><span class="qnum">\1</span>', h)
    h = h.replace('<h2>·', '<h2>')
    return h


def cover(c):
    if not c:
        return None
    return 'assets/' + ('writing/' if '/writing/' in c else 'research/') + os.path.basename(c)


def study_link(companion):
    m = re.search(r'href="(#research/[a-z0-9-]+)"', companion or '')
    return m.group(1) if m else None


research = {}
for name in sorted(os.listdir(convert.PAGES)):
    if not name.startswith('research_'):
        continue
    a = convert.article(name[:-5])
    note, topic, rest = (a['meta'] + ['', '', ''])[:3]
    parts = [p.strip() for p in rest.split('·')]
    kind = parts[0].capitalize() if parts else ''
    read = next((p for p in parts if 'min read' in p), '')
    date = next((p for p in parts if re.search(r'\d{4}', p)), '')
    n = int(re.sub(r'\D', '', note) or 0)
    research[a['slug']] = {
        'slug': a['slug'], 'n': n, 'cat': TOPIC.get(topic.lower(), 'from-the-desk'),
        'tag': f'{note} · {kind}', 'title': a['title'], 'summary': a['sub'],
        'year': date or note, 'kind': read, 'image': cover(a['cover']),
        'source': f"https://www.quirq.ai/research/{a['slug']}", 'html': tidy(a['html']),
    }

order = sorted(research.values(), key=lambda r: (r['n'] != 17, r['n']))  # featured study first, then 01..16
for r in order:
    r.pop('n')

writing = []
# the paper
wp = convert.article('paper_whitepaper')
wp_html = tidy(wp['html'])
writing.append({
    'slug': 'whitepaper', 'cat': 'paper', 'tag': 'The paper · Whitepaper',
    'title': 'AI Token Spend Needs Its Horsepower Moment',
    'summary': 'The unit-of-work whitepaper, in short: the mint, the calculus, the ledger, and the environment that owns the ground truth. Readable in full, with every claim tiered against its evidence.',
    'year': 'Jul 15, 2026', 'kind': '27 min read', 'image': None,
    'source': 'https://www.quirq.ai/whitepaper',
    'lede': 'A unit of work for intelligence. ' + wp['sub'], 'html': wp_html,
})
# thoughts
for slug in ['the-orientation-tax', 'synthetic-data-never-beats-the-real-thing', 'your-ai-knows-when-its-being-tested', 'rtfm',
             'agents-look-a-lot-like-quiet-quitters', 'the-agent-she-told-you-not-to-worry-about', 'the-language-is-not-the-problem',
             'point-and-call', 'the-advantage-was-never-the-model', 'the-benchmark-that-did-not-finish']:
    a = convert.article('writing_' + slug)
    _, date, read = (a['meta'] + ['', '', ''])[:3]
    writing.append({
        'slug': slug, 'cat': 'thoughts', 'tag': 'Thoughts', 'title': a['title'], 'summary': a['sub'],
        'year': date, 'kind': read, 'image': cover(a['cover']), 'source': f'https://www.quirq.ai/writing/{slug}',
        'companion': a['companion'], 'study': study_link(a['companion']), 'html': tidy(a['html']),
    })
# future of work (a research note, listed under Thoughts on the site)
rs = research['research-series']
writing.append({**rs, 'slug': 'future-of-work', 'cat': 'thoughts', 'tag': 'Thoughts · The future of work',
                'title': 'How Future Companies Will Measure Work in AI',
                'summary': "The three-phase thesis (agentic workforce, collaboration, self-evolving systems) with the evidence map underneath: what held, what moved, and what we still can't claim.",
                'year': 'Jul 24, 2026', 'kind': '12 min read', 'study': '#research/research-series'})


def wp_section(num):
    parts = re.split(r'(?=<h2>)', wp_html)
    for p in parts:
        if p.startswith(f'<h2><span class="qnum">{num}</span>'):
            return p
    return ''


guides = [
    ('why-quirq', 'Why quirq', 'Start here', research['the-quirq'], None),
    ('guide-unit-of-work', 'Unit of work', None, research['unit-of-work'], None),
    ('guide-quirq-calculus', 'The quirq calculus', None, research['the-quirq-calculus'], None),
    ('company-observatory', 'The Company Observatory', None, research['the-company-dashboard'], None),
    ('environment-is-key', 'The environment is the key part', None, None, '03'),
    ('gaming-the-quirq', 'Gaming the quirq', None, None, '06'),
    ('practitioner-playbook', 'Practitioner playbook', None, None, '05'),
    ('guide-validation', 'Validation', None, research['validation'], None),
    ('why-the-environment-matters', 'Why the Environment Matters', None, research['unit-of-work'], None),
]
GUIDE_SUBS = {
    'environment-is-key': ('The environment owns the ground truth: it is the specification, the scorekeeper, and the only witness that matters.', '3 min read'),
    'gaming-the-quirq': ('The attack surface of a unit of account, in order of severity, and the structural answers to each.', '3 min read'),
    'practitioner-playbook': ("How to write definitions of done, set budgets, and read the ledger schema: the operator's side of the unit.", '3 min read'),
    'why-the-environment-matters': ('The research note behind the unit of work: what it argues, and where the full quirq treatment lives.', '3 min read'),
}
for i, (slug, title, extra, src, sec) in enumerate(guides, 1):
    tag = f'Guide {i:02d}' + (f' · {extra}' if extra else '')
    if src:
        sub, read = GUIDE_SUBS.get(slug, (src['summary'], src['kind']))
        writing.append({**src, 'slug': slug, 'cat': 'guides', 'tag': tag, 'title': title, 'summary': sub,
                        'year': f'Guide {i:02d}', 'kind': read, 'study': '#research/' + src['slug']})
    else:
        sub, read = GUIDE_SUBS[slug]
        writing.append({'slug': slug, 'cat': 'guides', 'tag': tag, 'title': title, 'summary': sub, 'year': f'Guide {i:02d}',
                        'kind': read, 'image': None, 'source': 'https://www.quirq.ai/whitepaper', 'html': wp_section(sec),
                        'study': '#notes/whitepaper'})

news = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'news.json')))
for n in news:
    writing.append({'slug': n['slug'], 'cat': 'news', 'tag': 'News', 'title': n['title'], 'summary': n['summary'],
                    'year': 'News', 'kind': 'xo.builders', 'image': None, 'url': n['url']})

hdr = '// Generated from quirq.ai by tools/import-quirq (fetch.sh, then python3 gen.py ../../js). Do not edit by hand.\n'
with open(os.path.join(OUT, 'research.js'), 'w') as f:
    f.write(hdr + 'export const RESEARCH = ' + json.dumps(order, ensure_ascii=False, indent=1) + ';\n')
with open(os.path.join(OUT, 'writing.js'), 'w') as f:
    f.write(hdr + 'export const WRITING = ' + json.dumps(writing, ensure_ascii=False, indent=1) + ';\n')
print(len(order), 'research,', len(writing), 'writing')
from collections import Counter
print(Counter(w['cat'] for w in writing))
