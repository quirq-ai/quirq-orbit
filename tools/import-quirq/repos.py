"""Build quirq-orbit/js/repos.js from the public repositories in github.com/quirq-ai.

Mirrors how quirq.dev presents them: groups and one-line descriptions from
quirq-ai/website/quirq.projects.json, a phase read from each repo's shape
(Thought, Prototype, Built, Shipping, In use), links to open the app and the
code, and the README rendered by GitHub.

Needs an authenticated `gh` CLI. Usage: python3 repos.py ../../js
"""
import base64, json, os, re, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import convert

ORG = 'quirq-ai'
OUT = sys.argv[1] if len(sys.argv) > 1 else '../../js'

# Repos quirq.projects.json leaves ungrouped, placed by what their README says they are.
EXTRA_GROUPS = {
    'apps': ['heartwood', 'space-hub', 'fabric-chat', 'fabric-chat-node', 'vercel-activity', 'github-activity'],
    'tools': ['xo', 'liftoff', 'executor', 'control', 'launchpad', 'claude-code', 'library', 'lan', 'cli-console',
              'argus-code', 'experiments', 'quirq'],
}
GROUP_IDS = {'Products': 'products', 'Apps in progress': 'apps', 'qq infra': 'infra', 'Knowledge': 'knowledge', 'Other': 'other'}
PHASES = ['Thought', 'Prototype', 'Built', 'Shipping', 'In use']
CODE_EXT = re.compile(r'\.(py|js|mjs|cjs|ts|tsx|jsx|go|rs|sh|toml|ya?ml|json|html|css|scss|sql|rb|java|kt|swift|c|cc|cpp|h|vue|svelte|astro|mdx|dockerfile)$|(^|/)(Dockerfile|Makefile|Caddyfile)$', re.I)
DEPLOY = re.compile(r'(^|/)(vercel\.json|netlify\.toml|fly\.toml|Dockerfile|compose\.ya?ml|docker-compose\.ya?ml|render\.yaml|app\.yaml)$', re.I)


def gh(path, accept=None, jq=None):
    cmd = ['gh', 'api', path]
    if accept:
        cmd += ['-H', f'Accept: {accept}']
    if jq:
        cmd += ['--jq', jq]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return r.stdout if accept or jq else json.loads(r.stdout or 'null')


def projects_file():
    raw = gh(f'repos/{ORG}/website/contents/quirq.projects.json')
    return json.loads(base64.b64decode(raw['content'])) if raw else {'groups': [], 'repositories': {}}


def onboarded():
    raw = gh(f'repos/{ORG}/sync/contents/infra/repo.toml')
    return base64.b64decode(raw['content']).decode() if raw else ''


def readme_html(name, branch):
    h = gh(f'repos/{ORG}/{name}/readme', accept='application/vnd.github.html')
    if not h:
        return ''
    root = convert.TreeBuilder()
    root.feed(re.sub(r'<svg.*?</svg>', '', h, flags=re.S))
    base_blob = f'https://github.com/{ORG}/{name}/blob/{branch}/'
    base_raw = f'https://raw.githubusercontent.com/{ORG}/{name}/{branch}/'
    out = []

    def walk(n):
        if isinstance(n, str):
            out.append(convert.esc(n)); return
        t = n.tag
        if t in ('svg', 'script', 'style', 'button', 'source'):
            return
        if t == 'a' and 'anchor' in n.cls():
            return  # GitHub's heading permalink
        if t == 'img':
            src = n.attrs.get('data-canonical-src') or n.attrs.get('src') or ''
            if not src:
                return
            src = src if re.match(r'^https?://', src) else (urljoin('https://github.com', src) if src.startswith('/') else urljoin(base_raw, src))
            alt = convert.attr(n.attrs.get('alt', ''))
            out.append(f'<img src="{convert.attr(src)}" alt="{alt}" loading="lazy">'); return
        if t == 'a':
            href = n.attrs.get('href', '')
            if href.startswith('#') or not href:
                for c in n.children: walk(c)
                return  # in-page anchors would fight the site's hash routing
            if not re.match(r'^(https?:|mailto:)', href):
                href = urljoin('https://github.com', href) if href.startswith('/') else urljoin(base_blob, href)
            out.append(f'<a href="{convert.attr(href)}" target="_blank" rel="noopener">')
            for c in n.children: walk(c)
            out.append('</a>'); return
        mapped = {'h1': 'h2', 'h2': 'h3', 'h3': 'h4', 'h4': 'h4', 'h5': 'h4', 'h6': 'h4'}.get(t, t)
        keep = {'p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'code', 'pre', 'table', 'thead',
                'tbody', 'tr', 'th', 'td', 'br', 'hr', 'details', 'summary', 'kbd', 'del', 's', 'sup', 'sub', 'dl', 'dt', 'dd'}
        if mapped in keep:
            if mapped in ('br', 'hr'):
                out.append(f'<{mapped}>'); return
            if mapped == 'table':
                out.append('<div class="qtable">')
            out.append(f'<{mapped}>')
            for c in n.children: walk(c)
            out.append(f'</{mapped}>')
            if mapped == 'table':
                out.append('</div>')
            return
        for c in n.children: walk(c)

    for c in root.root.children:
        walk(c)
    html = ''.join(out).strip()
    html = re.sub(r'<p>\s*</p>', '', html)
    html = re.sub(r'\n{2,}', '\n', html)
    return html


def first_para(html):
    for m in re.finditer(r'<p>(.*?)</p>', html, re.S):
        t = re.sub(r'<[^>]+>', '', m.group(1))
        t = re.sub(r'\s+', ' ', convert.html.unescape(t)).strip()
        if len(t) > 20:
            return t if len(t) < 260 else t[:257].rsplit(' ', 1)[0] + '...'
    return ''


def info(meta, overrides, group_of, toml):
    name = meta['name']
    branch = meta['default_branch']
    tree = gh(f'repos/{ORG}/{name}/git/trees/{branch}?recursive=1') or {'tree': []}
    paths = [x['path'] for x in tree.get('tree', []) if x['type'] == 'blob']
    code = [p for p in paths if CODE_EXT.search(p) and not p.startswith('.github/')]
    workflows = gh(f'repos/{ORG}/{name}/actions/workflows', jq='.total_count')
    ci = int(workflows or 0) > 0
    people = gh(f'repos/{ORG}/{name}/contributors?per_page=100',
                jq='[.[] | select(.type=="User") | select(.login | test("bot|copilot|claude|cursor"; "i") | not)] | length')
    people = int(people or 0)
    stars = meta['stargazers_count']
    deploy = any(DEPLOY.search(p) for p in paths)
    qq = bool(re.search(r'(^|["/\s])' + re.escape(name) + r'(["\s]|$)', toml))
    homepage = (meta.get('homepage') or '').strip()
    if homepage and not homepage.startswith('http'):
        homepage = 'https://' + homepage
    if stars >= 10 or people >= 5:
        phase, why = 5, f'{stars} GitHub stars and {people} {"person" if people == 1 else "people"} committing.'
    elif ci and (qq or deploy or homepage):
        bits = ['CI on GitHub'] + (['onboarded to qq'] if qq else []) + (['a deploy config'] if deploy else []) + (['a live app'] if homepage and not deploy else [])
        phase, why = 4, ', '.join(bits) + '.'
    elif ci:
        phase, why = 3, f'{len(code)} code or config files with {workflows} CI workflow{"s" if int(workflows) != 1 else ""}.'
    elif code:
        phase, why = 2, f'{len(code)} code or config files, no CI yet.'
    else:
        phase, why = 1, 'Notes or a README only, no code yet.'
    readme = undash(readme_html(name, branch))
    # the page already shows the repo name as its title
    readme = re.sub(r'^<h2>[^<]*</h2>\s*', lambda m: '' if re.sub(r'[^a-z0-9]', '', m.group(0).lower()[4:-5]) == re.sub(r'[^a-z0-9]', '', name.lower()) else m.group(0), readme)
    desc = (overrides.get(name, {}).get('description') or '').strip()
    if not desc or ('placeholder' in desc.lower() and len(readme) > 2000):
        desc = (meta.get('description') or first_para(readme) or desc).strip()
    desc = undash(re.sub(r'^[a-z-]+:\s+', '', desc))
    lang = (meta.get('language') or '').strip()
    return {
        'slug': name, 'cat': group_of.get(name, 'other'), 'title': name,
        'tag': f'{PHASES[phase - 1]} · {lang}' if lang else PHASES[phase - 1],
        'summary': desc, 'year': 'Updated ' + fmt_date(meta['pushed_at']), 'kind': PHASES[phase - 1],
        'stack': [s for s in [lang, f'{stars} stars' if stars else ''] if s],
        'repo': meta['html_url'], 'demo': homepage or None,
        'phase': phase, 'phaseWhy': why, 'stars': stars, 'people': people, 'ci': ci, 'qq': qq, 'deploy': deploy,
        'fork': meta.get('fork', False), 'pushed': meta['pushed_at'][:10], 'language': lang,
        'readme': readme,
    }


WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'work')
SKIP_IMG = re.compile(r'shields\.io|badge|logo|icon|avatar|favicon|\.svg($|\?)', re.I)


def embeddable(url):
    """Can the live app be shown in an iframe on another site? (no X-Frame-Options, no restrictive frame-ancestors)"""
    import urllib.request
    try:
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            xfo = (r.headers.get('X-Frame-Options') or '').lower()
            csp = (r.headers.get('Content-Security-Policy') or '').lower()
    except Exception:
        return False
    fa = re.search(r'frame-ancestors([^;]*)', csp)
    return not xfo and (not fa or '*' in fa.group(1).split())


def media(x):
    """Screenshots from the README (saved locally), plus the captured poster/clip from capture.mjs."""
    import urllib.request
    os.makedirs(WORK, exist_ok=True)
    shots = []
    for src in re.findall(r'<img src="([^"]+)"', x['readme']):
        src = convert.html.unescape(src)
        if SKIP_IMG.search(src) or not re.search(r'\.(png|jpe?g|gif|webp)($|\?)', src, re.I) or len(shots) >= 6:
            continue
        ext = re.search(r'\.(png|jpe?g|gif|webp)', src, re.I).group(1).lower()
        name = f"{x['slug']}-shot{len(shots) + 1}.{ext}"
        dest = os.path.join(WORK, name)
        done = os.path.join(WORK, f"{x['slug']}-shot{len(shots) + 1}.jpg")
        if ext != 'gif' and os.path.exists(done):
            shots.append({'src': f'assets/work/{os.path.basename(done)}', 'alt': ''})
            continue
        try:
            if not os.path.exists(dest):
                req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=20) as r, open(dest, 'wb') as f:
                    f.write(r.read())
            if ext in ('png', 'jpg', 'jpeg', 'webp') and shutil.which('sips'):
                jpg = os.path.join(WORK, f"{x['slug']}-shot{len(shots) + 1}.jpg")
                if dest != jpg:
                    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1600', dest, '--out', jpg], capture_output=True)
                    if os.path.exists(jpg):
                        os.remove(dest)
                        name, dest = os.path.basename(jpg), jpg
            shots.append({'src': f'assets/work/{name}', 'alt': ''})
        except Exception:
            pass
    poster = f"assets/work/{x['slug']}.jpg"
    video = f"assets/work/{x['slug']}.mp4"
    x['poster'] = poster if os.path.exists(os.path.join(WORK, x['slug'] + '.jpg')) else (shots[0]['src'] if shots else None)
    x['video'] = video if os.path.exists(os.path.join(WORK, x['slug'] + '.mp4')) else None
    x['gallery'] = shots
    x['embed'] = bool(x['demo']) and embeddable(x['demo'])


def fmt_date(iso):
    y, m, d = iso[:10].split('-')
    return f"{int(d)} {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(m) - 1]} {y}"


def undash(t):
    # House style: no em or en dashes anywhere in the site.
    t = re.sub(r'(?<=\d)\s?\u2013\s?(?=\d)', '-', t)
    t = re.sub(r'\s*[\u2014\u2013]\s*', ', ', t)
    return t


def main():
    pf = projects_file()
    overrides = pf.get('repositories', {})
    group_of = {}
    for g in pf.get('groups', []):
        gid = GROUP_IDS.get(g['name'], 'other')
        for r in g['repos']:
            group_of[r] = gid
    for gid, names in EXTRA_GROUPS.items():
        for r in names:
            group_of.setdefault(r, gid)
    toml = onboarded()
    repos = gh(f'orgs/{ORG}/repos?per_page=100&type=public') or []
    repos = [r for r in repos if not r['private'] and not r['archived'] and not overrides.get(r['name'], {}).get('hidden')]
    with ThreadPoolExecutor(8) as ex:
        items = list(ex.map(lambda m: info(m, overrides, group_of, toml), repos))
    order = ['products', 'apps', 'tools', 'infra', 'knowledge', 'other']
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(media, items))
    items.sort(key=lambda x: (order.index(x['cat']), not (x.get('video') or x.get('poster')), -x['phase'], -x['stars']))
    # READMEs load on demand from assets/readmes/<slug>.html so the first paint stays light.
    rdir = os.path.join(OUT, '..', 'assets', 'readmes')
    os.makedirs(rdir, exist_ok=True)
    for x in items:
        with open(os.path.join(rdir, x['slug'] + '.html'), 'w') as f:
            f.write(x['readme'])
        x['readmeUrl'] = f"assets/readmes/{x['slug']}.html" if x['readme'] else None
    hdr = '// Generated from github.com/quirq-ai by tools/import-quirq/repos.py. Do not edit by hand.\n'
    with open(os.path.join(OUT, 'repos.js'), 'w') as f:
        f.write(hdr + 'export const REPOS = ' + json.dumps([{k: v for k, v in x.items() if k != 'readme'} for x in items],
                                                          ensure_ascii=False, indent=1) + ';\n')
    from collections import Counter
    print(len(items), 'repos', Counter(x['cat'] for x in items), Counter(PHASES[x['phase'] - 1] for x in items))
    for x in items:
        print(f"{x['cat']:9} {PHASES[x['phase']-1]:9} {x['stars']:>3}* {x['slug']:20} {len(x['readme']):>6}b  {x['summary'][:70]}")


if __name__ == '__main__':
    main()
