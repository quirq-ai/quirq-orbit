"""Convert downloaded quirq.ai research + writing pages into data for quirq-orbit."""
import html, json, os, re, sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(HERE, 'pages')
VOID = {'br', 'img', 'hr', 'source', 'meta', 'link', 'input', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'stop', 'use'}
PALETTE = ['#4d8dff', '#ffb547', '#3ddbd9', '#a78bfa', '#ff7aa8', '#9fb3d1']


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def cls(self):
        return self.attrs.get('class') or ''

    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return ''.join(out)

    def find_all(self, pred):
        for c in self.children:
            if isinstance(c, Node):
                if pred(c):
                    yield c
                yield from c.find_all(pred)

    def find(self, pred):
        return next(self.find_all(pred), None)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('root', {})
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def parse(path):
    s = open(path, encoding='utf-8').read()
    s = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    b = TreeBuilder()
    b.feed(s)
    return b.root


esc = lambda t: html.escape(t, quote=False)
attr = lambda t: html.escape(t, quote=True)

PASS = {'p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'dl', 'dt', 'dd', 'br', 'sup', 'sub', 'figcaption', 'hr'}
DROP = {'svg', 'button', 'nav', 'footer', 'img', 'script', 'style', 'source', 'noscript'}
STOP_TEXT = ('Adapted from the XO research program', 'Keep reading')

notes = {'media': [], 'links': set()}


def link(href):
    m = re.match(r'^/research/([a-z0-9-]+)/?$', href)
    if m and '/topic/' not in href:
        return '#research/' + m.group(1), False
    m = re.match(r'^/writing/([a-z0-9-]+)/?$', href)
    if m:
        return '#notes/' + m.group(1), False
    if href.startswith('/whitepaper'):
        return '#notes/whitepaper', False
    if href.startswith('/'):
        return 'https://www.quirq.ai' + href, True
    return href, href.startswith('http')


def chart(fig):
    colors = []

    def k(c):
        c = c.strip().lower()
        if c not in colors:
            colors.append(c)
        return colors.index(c)

    def style_val(n, key):
        m = re.search(key + r'\s*:\s*([^;]+)', n.attrs.get('style', ''))
        return m.group(1).strip() if m else None

    divs = [c for c in fig.children if isinstance(c, Node)]
    head = divs[0] if divs and 'border-b' in divs[0].cls() else None
    legend, note = [], []
    if head:
        for sp in [c for c in head.children if isinstance(c, Node)]:
            sw = sp.find(lambda n: n.attrs.get('aria-hidden') == 'true' and style_val(n, 'background'))
            if sw:
                legend.append((k(style_val(sw, 'background')), sp.text().strip()))
            else:
                t = sp.text().strip()
                if t:
                    note.append(t)
    rows = []
    for r in fig.find_all(lambda n: n.tag == 'div' and re.search(r'(^|\s)gap-1\.5(\s|$)', n.cls()) and 'grid' in n.cls()):
        label_el = r.find(lambda n: n.tag == 'span')
        label = label_el.text().strip() if label_el else ''
        vals = [(k(style_val(v, 'color')), v.text().strip()) for v in r.find_all(lambda n: n.tag == 'span' and style_val(n, 'color'))]
        extra = [v.text().strip() for v in r.find_all(lambda n: n.tag == 'span' and 'numeric' in n.cls() and not style_val(n, 'color'))]
        bars = [(style_val(b, 'width'), k(style_val(b, 'background'))) for b in r.find_all(lambda n: n.tag == 'div' and style_val(n, 'width') and style_val(n, 'background'))]
        rows.append((label, vals, extra, bars))
    cap = fig.find(lambda n: n.tag == 'figcaption')
    if not rows:
        return None
    col = lambda i: PALETTE[i % len(PALETTE)]
    out = ['<figure class="qchart">']
    if legend or note:
        out.append('<div class="qchart-legend">')
        out += [f'<span class="qchart-key"><i style="--c:{col(i)}"></i>{esc(t)}</span>' for i, t in legend]
        out += [f'<span class="qchart-note">{esc(t)}</span>' for t in note]
        out.append('</div>')
    out.append('<div class="qchart-rows">')
    for label, vals, extra, bars in rows:
        v = ''.join(f'<b style="--c:{col(i)}">{esc(t)}</b>' for i, t in vals) + ''.join(f'<b>{esc(t)}</b>' for t in extra)
        b = ''.join(f'<span class="qchart-track"><i style="width:{attr(w)};--c:{col(i)}"></i></span>' for w, i in bars)
        out.append(f'<div class="qchart-row"><div class="qchart-head"><span>{esc(label)}</span><span class="qchart-vals">{v}</span></div>{b}</div>')
    out.append('</div>')
    if cap and cap.text().strip():
        out.append(f'<figcaption>{esc(cap.text().strip())}</figcaption>')
    out.append('</figure>')
    return ''.join(out)


class Stop(Exception):
    pass


OUT, STACK = [], []


def emit_open(t, a=''):
    OUT.append(f'<{t}{a}>'); STACK.append((t, len(OUT)))


def emit_close():
    t, start = STACK.pop()
    body = ''.join(OUT[start:])
    if t in ('p', 'li', 'h2', 'h3', 'h4', 'blockquote', 'figcaption') and not re.sub(r'<[^>]+>', '', body).strip():
        del OUT[start - 1:]
        return
    OUT.append(f'</{t}>')


def conv(n, slug):
    if isinstance(n, str):
        if any(t in n for t in STOP_TEXT):
            raise Stop
        OUT.append(esc(n)); return
    t = n.tag
    if t in DROP:
        if t == 'img':
            notes['media'].append((slug, n.attrs.get('src')))
        return
    if n.attrs.get('aria-hidden') == 'true' or 'sr-only' in n.cls():
        return
    if t == 'figure':
        v = n.find(lambda x: x.tag == 'video')
        if v:
            src = (n.find(lambda x: x.tag == 'source') or v).attrs.get('src', '')
            cap = n.find(lambda x: x.tag == 'figcaption')
            notes['media'].append((slug, src))
            OUT.append(f'<figure class="qvideo"><video controls playsinline preload="metadata" src="https://www.quirq.ai{attr(src)}"></video>'
                       + (f'<figcaption>{esc(cap.text().strip())}</figcaption>' if cap else '') + '</figure>')
            return
        c = chart(n)
        if c:
            OUT.append(c); return
        emit_open('figure'); [conv(c, slug) for c in n.children]; emit_close(); return
    if t == 'a':
        href, ext = link(n.attrs.get('href', ''))
        notes['links'].add(href)
        tgt = ' target="_blank" rel="noopener"' if ext else ''
        emit_open('a', f' href="{attr(href)}"{tgt}')
        for c in n.children: conv(c, slug)
        emit_close(); return
    if t in PASS:
        if t in ('br', 'hr'):
            OUT.append(f'<{t}>'); return
        a = ''
        for key in ('colspan', 'rowspan'):
            if key in n.attrs:
                a += f' {key}="{attr(n.attrs[key])}"'
        if t == 'table':
            OUT.append('<div class="qtable">')
        emit_open(t, a)
        for c in n.children: conv(c, slug)
        emit_close()
        if t == 'table':
            OUT.append('</div>')
        return
    for c in n.children:
        conv(c, slug)


def render(nodes, slug):
    OUT.clear(); STACK.clear()
    try:
        for c in nodes:
            conv(c, slug)
    except Stop:
        while STACK:
            emit_close()
        if OUT and OUT[-1] == '<div class="qtable">':
            OUT.pop()
    return ''.join(OUT)


def article(name):
    root = parse(os.path.join(PAGES, name + '.html'))
    h1 = root.find(lambda n: n.tag == 'h1')
    header = h1
    while header is not None and header.tag != 'header':
        header = header.parent
    slug = name.split('_', 1)[1]
    # header metadata
    meta_p = header.find(lambda n: n.tag == 'p' and 'uppercase' in n.cls() and 'font-mono' in n.cls())
    meta = [re.sub(r'\s+', ' ', s.text()).strip() for s in meta_p.children if isinstance(s, Node) and s.attrs.get('aria-hidden') != 'true'] if meta_p else []
    ps = [p for p in header.find_all(lambda n: n.tag == 'p') if p is not meta_p]
    sub = ps[0].text().strip() if ps else ''
    companion = ''
    for p in ps[1:]:
        if 'companion' in p.text().lower() or 'border-t' in p.cls():
            companion = render(p.children, slug)
    from urllib.parse import unquote
    img = header.find(lambda n: n.tag == 'img' and re.search(r'/(research|writing)/', unquote(n.attrs.get('src', ''))))
    cover = None
    if img:
        m = re.search(r'url=([^&]+)', html.unescape(img.attrs['src']))
        cover = unquote(m.group(1)) if m else None
    # body: siblings after header
    sibs = header.parent.children
    i = sibs.index(header)
    body = render(sibs[i + 1:], slug)
    body = re.sub(r'\s*\n\s*', '\n', body).strip()
    return {'slug': slug, 'title': h1.text().strip(), 'sub': sub, 'meta': meta, 'companion': companion, 'cover': cover, 'html': body}


def whitepaper():
    root = parse(os.path.join(PAGES, 'whitepaper.html'))
    h1 = root.find(lambda n: n.tag == 'h1')
    main = root.find(lambda n: n.tag == 'main') or root
    return main, h1


if __name__ == '__main__':
    names = [f[:-5] for f in sorted(os.listdir(PAGES)) if f.endswith('.html') and f != 'whitepaper.html']
    data = {}
    for n in names:
        a = article(n)
        data[n] = a
        print(n, '|', a['meta'], '|', a['title'][:50], '| cover', a['cover'], '| html', len(a['html']))
    json.dump(data, open(os.path.join(HERE, 'articles.json'), 'w'), indent=1, ensure_ascii=False)
    print('media', notes['media'])
    print('links', sorted(notes['links']))
