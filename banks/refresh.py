"""Daily public bank-report publisher. No accounts, credentials, AI or quote API.

Download only fixed official sources, obey robots.txt, parse known document
layouts, and retain dated facts when a source/identity/layout cannot validate.
Raw documents live only in the runner's temporary directory, never data/.
"""
import copy
import datetime as dt
import hashlib
import io
import json
import re
import sys
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path

import pdfplumber
import certifi
from bs4 import BeautifulSoup

UTC = dt.timezone.utc
PROFILES = ['income', 'conservative', 'balanced', 'growth', 'equity']
PERIODS = [1, 3, 5, 10]
HOSTS = {'funds.rbcgam.com', 'www.rbcgam.com', 'www.td.com', 'www.scotiafunds.com', 'www.cibc.com', 'fundfacts.bmo.com', 'www.bmoetfs.ca', 'www.bankofcanada.ca'}
UA = 'TickerLanternBankData/1.0 (+https://tickerlantern.com)'
MONTHS = {m.lower(): i for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'], 1)}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
DATE = r'((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*|\s+)20\d\d)'
NUMBER = r'-?\d+(?:\.\d+)?'


def clean(s):
    return re.sub(r'\s+', ' ', s.translate({0x200B:None,0xFEFF:None,0x2060:None}).replace('\u2212', '-').replace('\u2011', '-').replace('\u00ad', '')).strip()


def norm(s):
    return re.sub(r'[^a-z0-9]', '', clean(s).lower())


def date(s):
    m = re.fullmatch(r'([A-Za-z]+)\.?\s+(\d{1,2})(?:,\s*|\s+)(20\d\d)', clean(s))
    if not m:
        raise ValueError('Publication date missing')
    return dt.date(int(m[3]), MONTHS[m[1].lower()], int(m[2])).isoformat()


def valid_date(s, now):
    if dt.date.fromisoformat(s) > now.date():
        raise ValueError('Future observation date')
    return s


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        allowed_url(newurl)
        # Do not follow an official source into an authentication/consent service.
        if urllib.parse.urlsplit(newurl).hostname != urllib.parse.urlsplit(req.full_url).hostname:
            raise ValueError('Source redirected to a different host')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def allowed_url(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or u.hostname not in HOSTS or u.username or u.password or u.port:
        raise ValueError('Source is outside the official allowlist')


class Sources:
    def __init__(self):
        self.robots = {}
        self.last = {}
        self.cache = {}
        self.opener = urllib.request.build_opener(SafeRedirect(),urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=certifi.where())))

    def read(self, url, robot=False):
        allowed_url(url)
        host = urllib.parse.urlsplit(url).hostname
        if not robot:
            if host not in self.robots:
                rp = urllib.robotparser.RobotFileParser()
                try:
                    raw = self.read('https://' + host + '/robots.txt', robot=True)
                    rp.parse(raw.decode('utf-8', 'replace').splitlines())
                except urllib.error.HTTPError as e:
                    if e.code not in (404, 410):
                        raise ValueError('Robots policy unavailable') from e
                    rp.parse([])
                self.robots[host] = rp
            rp = self.robots[host]
            if not rp.can_fetch(UA, url):
                raise ValueError('Source disallows automated access')
            delay = max(0.7, rp.crawl_delay(UA) or rp.crawl_delay('*') or 0)
            if delay > 60:
                raise ValueError('Source crawl delay exceeds the daily job budget')
            time.sleep(max(0, delay - (time.monotonic() - self.last.get(host, 0))))
        if url in self.cache:
            return self.cache[url]
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/pdf,text/html,application/json', 'Cache-Control': 'no-cache'})
        self.last[host] = time.monotonic()
        with self.opener.open(req, timeout=35) as r:
            if int(r.headers.get('Content-Length', 0)) > 14_000_000:
                raise ValueError('Source exceeds the document size limit')
            raw = r.read(14_000_001)
            if len(raw) > 14_000_000:
                raise ValueError('Source exceeds the document size limit')
        self.cache[url] = raw
        return raw


class Document:
    def __init__(self, raw, name):
        if not raw.startswith(b'%PDF'):
            raise ValueError('Expected a public PDF')
        self.pdf = pdfplumber.open(io.BytesIO(raw))
        if not 1 <= len(self.pdf.pages) <= 40:
            raise ValueError('Unexpected report page count')
        self.pages = [clean_lines(p.extract_text(x_tolerance=2, y_tolerance=3) or '') for p in self.pdf.pages]
        self.text = '\n'.join(self.pages)
        if norm(name) not in norm(self.text[:12000]):
            raise ValueError('Fund identity does not match')

    def column(self, n, side='left'):
        p = self.pdf.pages[n]
        x, y, r, b = p.bbox
        mid = x + (r - x) / 2
        box = (x, y, mid, b) if side == 'left' else (mid, y, r, b)
        return clean_lines(p.crop(box).extract_text(x_tolerance=2, y_tolerance=3) or '')


def clean_lines(s):
    return '\n'.join(clean(line) for line in s.splitlines())


def rate_row(text, label):
    pattern = r'^' + label + r'\s+%?\s*(' + NUMBER + r')\s+(' + NUMBER + r')\s+(' + NUMBER + r')\s+(' + NUMBER + r')(?:\s|$)'
    rows = re.findall(pattern, text, re.M | re.I)
    if len(rows) != 1:
        raise ValueError('Ambiguous or incomplete return row')
    values = [float(v) for v in rows[0]]
    if not all(-100 < v < 1000 for v in values):
        raise ValueError('Return outside validation bounds')
    return dict(zip(map(str, PERIODS), values))


def weighted_components(text, previous, prefix):
    # Known component identities only. A new benchmark constituent requires review.
    flat = clean(text)
    m = re.search(prefix, flat, re.I)
    if not m:
        raise ValueError('Benchmark definition missing')
    tail = flat[m.end():]
    weights = []
    for old in previous:
        name = old['name']
        # PDF line wraps and hyphen variants are normalised; names remain exact.
        m = re.search(r'(' + NUMBER + r')%\s*(?:of\s+)?' + re.escape(name).replace(r'\ ', r'\s+'), tail, re.I)
        if not m:
            raise ValueError('Benchmark component identity changed')
        weights.append({**old, 'weight': float(m[1])})
    if abs(sum(c['weight'] for c in weights) - 100) > .11:
        raise ValueError('Incomplete benchmark weights')
    # Do not silently accept an additional constituent omitted by the old schema.
    return weights


def annual(raw, old, now):
    d = Document(raw, old['name'])
    if 'annual' not in d.text[:2000].lower() or 'management report' not in d.text[:2000].lower():
        raise ValueError('Expected the annual management report')
    dates = re.findall(r'December\s+31,?\s+(20\d\d)', d.text[:4500])
    if not dates:
        raise ValueError('Annual reporting date missing')
    asof = valid_date(max(dates) + '-12-31', now)
    bank = old['bank']
    chosen = None
    for i, full in enumerate(d.pages):
        for t in ([full] if bank == 'cibc' else [d.column(i),d.column(i,'right')]):
            if not re.search(r'Annual Compound Returns|1 Year 3 Years 5 Years', t, re.I):
                continue
            try:
                # Class A may be on the next page of a CIBC table; use its actual page.
                actual = rate_row(t, {'rbc': 'Series A', 'td': 'Investor Series', 'scotia': 'Series A', 'cibc': 'Class A units'}[bank])
            except ValueError:
                continue
            label = {'rbc': 'Benchmark', 'td': 'Product Benchmark', 'scotia': r'Blended Benchmark\*', 'cibc': 'Blended Benchmark'}[bank]
            # Restrict the benchmark to the selected series block, never an inception column.
            start = re.search(r'^(Series A|Investor Series|Class A units)\s', t, re.M).start()
            block = t[start:]
            end = re.search(r'\n(?:Series (?!A\s)|[FDG]-Series|Class (?!A\s))', block)
            if end and bank != 'td':
                block = block[:end.start()]
            bench = rate_row(block, label)
            chosen = {'asOf': asof, 'returns': actual, 'benchmarkReturns': bench, 'page': i + 1}
            if bank == 'td' and old['profile']=='balanced':
                if 'MSCI World Index (Net Dividend, C$)' not in t or 'FTSE Canada Universe Bond Index' not in t:
                    raise ValueError('Common index variant changed')
                chosen['reference'] = {'equity': rate_row(block, 'General Market Index 3'), 'bonds': rate_row(block, 'General Market Index 1')}
            break
        if chosen:
            break
    if not chosen:
        raise ValueError('Selected series return table missing')
    if bank == 'rbc':
        t = d.column(chosen['page'] - 1)
        components = weighted_components(t, old['allocation']['components'], r'The benchmark is composed of:')
        chosen['allocation'] = {**old['allocation'], 'asOf': asof, 'components': components}
        chosen['allocationPage'] = chosen['page']
    elif bank == 'scotia':
        text = ' '.join(d.column(i, side) for i in range(len(d.pages)) for side in ['left','right'])
        components = weighted_components(text, old['allocation']['components'], r'The Blended Benchmark is composed of')
        chosen['allocation'] = {**old['allocation'], 'asOf': asof, 'components': components}
        chosen['allocationPage'] = chosen['page']
    else:
        text = clean(d.column(1 if bank == 'td' else 0))
        phrase = (r'neutral asset allocation will generally provide exposure to' if bank == 'td' else r'strategic asset mix weighting among the Underlying Funds of')
        m = re.search(phrase + r'\s*(' + NUMBER + r')%\s+(fixed income(?: securities)?|equit(?:y|ies)(?: securities)?)\s+and\s+(' + NUMBER + r')%\s+(fixed income(?: securities)?|equit(?:y|ies)(?: securities)?)', text, re.I)
        if not m and bank=='td' and re.search(phrase+r'\s+100% equities\.',text,re.I):
            roles={'equity':100.,'bonds':0.}
        elif not m or float(m[1]) + float(m[3]) != 100:
            raise ValueError('Policy target layout changed')
        else:
            roles = {('bonds' if 'fixed' in m[2].lower() else 'equity'): float(m[1]), ('bonds' if 'fixed' in m[4].lower() else 'equity'): float(m[3])}
        if set(roles) != {'bonds', 'equity'}:
            raise ValueError('Policy target roles missing')
        chosen['allocation'] = {**old['allocation'], 'asOf': asof, 'components': [{**c, 'weight': roles[c['role']]} for c in old['allocation']['components']]}
        chosen['allocationPage'] = 2 if bank == 'td' else 1
        if old.get('benchmarkComponents'):
            # Refuse changed blended definitions rather than attaching stale weights.
            # Table details can span the preceding page.
            definition = ' '.join(d.column(i, side) for i in range(len(d.pages)) for side in ['left','right']) if bank=='td' else d.text
            previous = old['benchmarkComponents']
            if bank == 'td':
                previous = [{**c, 'name': c['name'].replace('Net Dividend, CAD', 'Net Dividend, C$')} for c in previous]
            comps = weighted_components(definition, previous, r'(?:Product Benchmark is comprised of:|blended benchmark)')
            chosen['benchmarkComponents'] = [{**c, 'name': old['benchmarkComponents'][i]['name']} for i, c in enumerate(comps)]
    # MERs use a separate dated field. Failure never substitutes a management fee.
    for i, t in enumerate(d.pages):
        if not re.search(r'Ratios and Supplemental Data', t, re.I):
            continue
        if bank=='cibc' and re.search(r'Ratios and Supplemental Data[^\n]*Class A',t,re.I):
            m = re.search(r'Management Expense Ratio\d* \(.*?\)\s+('+NUMBER+r')',t,re.I)
            if m and asof[:4] in t:
                chosen['mer']={'value':float(m[1]),'asOf':asof};chosen['merPage']=i+1
                break
        m = re.search(r'Series A\nDec\.? 31,? ' + asof[:4] + r'\s+([^\n]+)', t[t.lower().index('ratios and supplemental data'):])
        if bank in ('rbc', 'scotia') and m:
            nums = re.findall(r'-?\d[\d,]*(?:\.\d+)?', m[1])
            index = 3 if bank == 'rbc' else 2
            if len(nums) >= 5:
                chosen['mer'] = {'value': float(nums[index]), 'asOf': asof}
                chosen['merPage'] = i + 1
                break
    return chosen, len(d.pages)


def fund_facts(raw, old, now):
    d = Document(raw, old['name'])
    t = d.pages[0]
    if old['fundCode'] not in t or (norm(old['series']) not in norm(t)):
        raise ValueError('Fund code or retail series mismatch')
    fee = re.search(r'Management expense ratio \(MER\)[: ]+(' + NUMBER + r')%', t)
    if not fee:
        raise ValueError('MER missing')
    result = {'mer': {'value': float(fee[1]), 'asOf': None}, 'merPage': 1}
    expense_page=next((i for i,t in enumerate(d.pages) if re.search(r'2\.? Fund expenses',t)),None)
    tail=clean(d.pages[expense_page].split('Fund expenses',1)[-1]) if expense_page is not None else ''
    m = re.search(r'(?:As of|year ended)\s+' + DATE, tail, re.I)
    if m:
        result['mer']['asOf'] = valid_date(date(m[1]), now)
        result['merPage']=expense_page+1
    risk = re.search(r'rated the volatility of this fund as (low to medium|medium to high|low|medium|high)', clean(t), re.I)
    if not risk:
        raise ValueError('Risk rating missing')
    result['riskLabel'] = risk[1].capitalize()
    if old['bank'] != 'bmo':
        return result, len(d.pages)
    # BMO year labels are rotated. Pair each bar's label by its physical x position,
    # not by text extraction order or chart height (which sorts by value).
    p = d.pdf.pages[1]
    words = p.extract_words(line_dir_rotated='ltr', char_dir_rotated='btt')
    years = [w for w in words if not w['upright'] and re.fullmatch(r'20\d\d', w['text'])]
    years.sort(key=lambda w: int(w['text']))
    if len(years) != 10 or [int(w['text']) for w in years] != list(range(int(years[0]['text']), int(years[0]['text']) + 10)):
        raise ValueError('Calendar chart years missing or nonconsecutive')
    calendar = {}
    for w in years:
        x = (w['x0'] + w['x1']) / 2
        values = [v for v in words if v['upright'] and re.fullmatch(r'-?\d+\.\d+', v['text']) and abs((v['x0']+v['x1'])/2-x) < 5 and w['top'] - 110 < v['top'] < w['top']]
        if len(values) != 1:
            raise ValueError('Calendar chart value has no unique year')
        calendar[w['text']] = float(values[0]['text'])
    year = max(calendar)
    result.update(asOf=valid_date(year + '-12-31', now), returns={'1': calendar[year]}, calendar=calendar, page=2, benchmarkReturns=None)
    right = d.column(0, 'right')
    block = right.split('Portfolio Allocation', 1)[1].split('Risk rating', 1)[0]
    parts = re.findall(r'(' + NUMBER + r')%\s+(.+?)(?=\s+' + NUMBER + r'%|$)', clean(block))
    components = []
    for value, name in parts:
        name = clean(name)
        role = 'equity' if 'Equity Fund' in name else 'bonds' if 'Fixed Income' in name else 'cash' if name.startswith('Cash/Receivables') else 'other' if re.search(r'Commodity|Option|Money Market Investments|^Other$', name) else None
        if role is None:
            raise ValueError('Unmapped BMO holdings category')
        components.append({'name': name, 'role': role, 'weight': float(value)})
    if not components or abs(sum(c['weight'] for c in components)-100) > .21:
        raise ValueError('Incomplete BMO holdings categories')
    m = re.search(r'investments on\s+' + DATE, clean(t))
    if not m:
        raise ValueError('Holdings observation date missing')
    result['allocation'] = {**old['allocation'], 'components': components, 'asOf': valid_date(date(m[1]), now)}
    result['allocationPage'] = 1
    result['returnNote'] = f'1Y is the published {year} calendar return. 3Y / 5Y / 10Y are approximate CAGRs compounded from rounded published calendar returns, marked ≈. The Fund Facts’ separate trailing average return is not substituted.'
    return result, len(d.pages)


def corra(raw, end):
    d = json.loads(raw)
    series=d.get('seriesDetail',{}).get('AVG.INTWO',{})
    if series.get('label')!='Canadian Overnight Repo Rate Average (CORRA)' or series.get('metadata',{}).get('unit')!='Percent':
        raise ValueError('CORRA series identity or units changed')
    rows = [(dt.date.fromisoformat(r['d']), float(r['AVG.INTWO']['v'])) for r in d['observations'] if 'AVG.INTWO' in r]
    rows.sort()
    result = {}
    b = dt.date.fromisoformat(end)
    for years in PERIODS:
        a = b.replace(year=b.year-years)
        growth, covered = 1., 0
        for i, (day, rate) in enumerate(rows):
            left = max(day, a)
            right = min(rows[i+1][0] if i+1 < len(rows) else b, b)
            days = (right-left).days
            if days <= 0:
                continue
            if days > 7 or not -100 < rate < 100:
                raise ValueError('Incomplete CORRA business-day coverage')
            growth *= 1+rate/100*days/365
            covered += days
        if covered != (b-a).days:
            raise ValueError('Incomplete CORRA period')
        result[str(years)] = (growth**(1/years)-1)*100
    return result


HUBS = {'rbc':'https://www.rbcgam.com/en/ca/insights/global-investment-outlook', 'scotia':'https://www.scotiafunds.com/en/home/news-insights.html', 'bmo':'https://www.bmoetfs.ca/view-all'}


def outlook_url(bank, old, sources):
    if bank not in HUBS:
        return old
    soup = BeautifulSoup(sources.read(HUBS[bank]), 'html.parser')
    pattern = {'rbc': r'/article/executive-summary-.*20\d\d/detail', 'scotia': r'/report\.mim-[a-z]+-20\d\d\.html', 'bmo': r'/articles/bmo-(?:macro-regime-model|etf-portfolio)-strategy-report-q[1-4]-20\d\d'}[bank]
    links = {urllib.parse.urljoin(HUBS[bank], a['href']) for a in soup.select('a[href]') if re.search(pattern, a['href'])}
    if not links:
        raise ValueError('Latest outlook link not found on official index')
    # Latest issue by year and season/month; never use DOM position as recency.
    def rank(url):
        year = int(re.search(r'(20\d\d)', url)[1])
        token = url.split('-')[-2]
        seasons = {'new-year':1, 'spring':3, 'summer':6, 'fall':9, 'q1':1, 'q2':4, 'q3':7, 'q4':10}
        month = next((v for k,v in MONTHS.items() if '-'+k+'-' in url), seasons.get(token, 1))
        return year, month
    return max(links, key=rank)


def outlook(raw, bank, previous, now, previous_sha=None):
    soup = BeautifulSoup(raw, 'html.parser')
    # Some official sites publish the article body as structured JSON while the
    # visible HTML is only a shell. Read plain Article JSON; never execute code.
    structured=[]
    for script in soup.select('script[type="application/ld+json"],script[type="application/json"]'):
        try:
            structured.append(json.loads(script.string or script.get_text()))
        except (ValueError,TypeError):
            pass
    for el in soup(['script', 'style', 'nav', 'header', 'footer']):
        el.decompose()
    text = clean(soup.get_text(' ', strip=True))
    if re.search(r'Access (?:blocked|denied)|Just a moment|verify you are human', text[:1000], re.I):
        raise ValueError('Official outlook access is blocked')
    title_el = soup.select_one('h1') or soup.select_one('meta[property="og:title"]')
    title = title_el.get('content') or title_el.get_text(' ', strip=True) if title_el else ''
    if bank == 'rbc':
        meta = soup.select_one('meta[name="description"]')
        title = meta.get('content', '') if meta else title
    if not title or not re.search({'rbc':'Global Investment Outlook', 'td':'Monthly Portfolio Outlook', 'scotia':'Monthly Investment Monitor', 'bmo':'Macro Regime Model', 'cibc':'Quarterly economic.*outlook'}[bank], title, re.I):
        raise ValueError('Outlook publication identity changed')
    def article_body(value):
        if isinstance(value,dict):
            headline=value.get('headline') or value.get('title') or value.get('name')
            body=value.get('articleBody')
            if isinstance(headline,str) and norm(headline)==norm(title) and isinstance(body,str):
                return body
            for child in value.values():
                found=article_body(child)
                if found:return found
        if isinstance(value,list):
            for child in value:
                found=article_body(child)
                if found:return found
        return ''
    for value in structured:
        body=article_body(value)
        if body:
            fragment=BeautifulSoup(body,'html.parser')
            text+=' '+clean(fragment.get_text(' ',strip=True))
            soup.append(fragment)
            break
    if bank == 'cibc':
        tag = soup.select_one('.publish-date')
        asof = date(tag.get_text(' ', strip=True)) if tag else None
    else:
        prefix = {'rbc':r'Note:\s*As of\s+', 'td':r'Views as of\s+', 'scotia':r'(?:Total Return,\s*)?as at\s+', 'bmo':r'(?:market close on|portfolio weights are as of(?: market close on)?)\s+'}[bank]
        m = re.search(prefix + DATE, text, re.I)
        asof = date(m[1]) if m else None
    if not asof:
        raise ValueError('Explicit outlook date missing')
    valid_date(asof, now)
    if asof < previous['asOf']:
        raise ValueError('Outlook observation regressed')
    # Stable publication: retain the reviewed summary/weights only if the visible
    # date and title still identify that same issue. New issues get a short source
    # excerpt, not an AI interpretation or inherited old allocation.
    if asof == previous['asOf'] and digest(raw)==previous_sha:
        return copy.deepcopy(previous)
    if bank=='rbc':
        m=re.search(r'current recommended asset mix for a global balanced investor is\s+('+NUMBER+r')% equities\s*(?:\([^)]*\))?[, ]+('+NUMBER+r')% bonds\s*(?:\([^)]*\))?\s*and\s+('+NUMBER+r')% cash',text,re.I)
        if not m or abs(sum(float(v) for v in m.groups())-100)>.01:
            raise ValueError('Balanced outlook allocation layout changed')
        values=[float(v) for v in m.groups()]
        return {**previous,'title':title,'asOf':asof,'stance':'Published global balanced reference','summary':f'Global balanced reference: {values[0]:g}% equities, {values[1]:g}% bonds and {values[2]:g}% cash. This outlook mix is separate from the retail portfolio holdings.','mix':[{'name':k,'weight':v} for k,v in zip(['Equity','Bonds','Cash'],values)]}
    if bank=='bmo':
        for table in soup.find_all('table'):
            if 'current weight' not in clean(table.get_text(' ',strip=True)).lower():
                continue
            values={}
            for tr in table.select('tr'):
                cells=[clean(c.get_text(' ',strip=True)) for c in tr.select('td,th')]
                if len(cells)>=2 and cells[0].lower() in ['fixed income','equities','alts/hybrids'] and re.fullmatch(NUMBER+'%',cells[1]):
                    values[cells[0]]=float(cells[1][:-1])
            if len(values)==3 and abs(sum(values.values())-100)<.01:
                return {**previous,'title':title,'asOf':asof,'stance':'Published Macro Regime model mix','summary':'Separate Macro Regime reference: '+', '.join(f'{v:g}% {k.lower()}' for k,v in values.items())+'. This is not the retail ETF Portfolio fund allocation.','mix':[{'name':k,'weight':v} for k,v in values.items()]}
        raise ValueError('Macro Regime current-weight table changed')
    paragraphs = [clean(p.get_text(' ', strip=True)) for p in soup.select('p')]
    useful = [p for p in paragraphs if len(p)>100 and not re.search(r'cookies|commissions|disclaimer|copyright|information purposes|contact us|Source:',p,re.I)]
    meta = soup.select_one('meta[name="description"]')
    excerpt = (meta.get('content', '') if bank=='cibc' and meta else useful[0] if useful else '')
    if len(excerpt.split()) < 8:
        raise ValueError('Outlook excerpt unavailable')
    excerpt = ' '.join(excerpt.split()[:24]) + '…'
    return {**previous, 'title':title, 'asOf':asof, 'stance':'Latest publisher outlook', 'summary':'Publisher excerpt: “'+excerpt+'”', 'summaryKind':'excerpt', 'scope':previous['scope'].split(' · ')[0]+' · publication date / observation date shown; open source for full positioning', 'mix':None}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def source_ref(data, old_ref, raw, checked, page=None, url=None, title=None, pages=None):
    old = data['sources'][old_ref['id']]
    sha = digest(raw)
    key = old_ref['id'].split('@')[0] + '@' + sha[:16]
    data['sources'][key] = {**old, 'url':url or old['url'], 'title':title or old['title'], 'sha256':sha, 'checkedAt':checked}
    data['sources'][key].pop('accessNote', None)
    if pages:
        data['sources'][key]['pages'] = pages
    return {'id':key, **({'page':page} if page else {})}


def refresh(seed, sources=None, now=None):
    sources, now = sources or Sources(), now or dt.datetime.now(UTC)
    stamp = now.isoformat().replace('+00:00','Z')
    data = copy.deepcopy(seed)
    checks, candidates = [], []
    previous_checks = {c['id']:c for c in seed.get('sync',{}).get('checks',[])}

    def check(id, label, status, message):
        c = {'id':id, 'label':label, 'status':status, 'message':message, 'checkedAt':stamp, 'lastSuccessAt':stamp if status=='ready' else previous_checks.get(id,{}).get('lastSuccessAt')}
        checks.append(c)

    for row in data['portfolios']:
        id = row['bank']+'-'+row['profile']
        ref = row['returnSource']
        src = data['sources'][ref['id']]
        try:
            raw = sources.read(src['url'])
            result, pages = fund_facts(raw,row,now) if row['bank']=='bmo' else annual(raw,row,now)
            if result['asOf'] < row['asOf'] or result['allocation']['asOf'] < row['allocation']['asOf']:
                raise ValueError('Report observation date regressed')
            for key in ['allocation','mer']:
                item=result.get(key)
                if item and row[key].get('asOf') and (not item.get('asOf') or item['asOf']<row[key]['asOf']):
                    raise ValueError('Field observation date regressed')
            if result.get('mer') and not 0<=result['mer']['value']<=10:
                raise ValueError('MER outside validation bounds')
            newref = source_ref(data,ref,raw,stamp,result['page'],pages=pages,title=row['name']+' · annual performance '+result['asOf'])
            candidates.append((row, result, newref))
            for key, pagekey in [('allocation','allocationPage'),('mer','merPage')]:
                if key not in result:
                    continue
                item = copy.deepcopy(result[key])
                item['source'] = {**newref,'page':result[pagekey]}
                if row[key].get('asOf') and (not item.get('asOf') or item['asOf']<row[key]['asOf']):
                    raise ValueError('Field observation date regressed')
                row[key] = item
            if row['bank']=='bmo':
                row['riskLabel'], row['riskSource'] = result['riskLabel'], {**newref,'page':1}
            check(id, row['name'], 'ready', 'Official annual returns validated at '+result['asOf']+'; graphs advance only with the complete common-date cohort.')
        except Exception as e:
            check(id, row['name'], 'retained', safe_error(e))
        # Separate monthly/FF source: no overwrite of annual return date.
        risk_ref = row.get('riskSource')
        if row['bank']=='rbc' and risk_ref:
            try:
                raw=sources.read(data['sources'][risk_ref['id']]['url'])
                doc=Document(raw,row['name'])
                risk=re.search(r'Risk rating\s+(Low to Medium|Medium to High|Low|Medium|High)',doc.pages[0],re.I)
                if not risk:
                    raise ValueError('Monthly risk label missing')
                row['riskLabel']=risk[1].capitalize()
                row['riskSource']=source_ref(data,risk_ref,raw,stamp,1,pages=len(doc.pages))
                check(id+'-risk',row['name']+' · risk','ready','Monthly profile identity and risk label validated; annual returns stay separate.')
            except Exception as e:
                check(id+'-risk',row['name']+' · risk','retained',safe_error(e))
        if row['bank']=='td' and risk_ref:
            try:
                raw = sources.read(data['sources'][risk_ref['id']]['url'])
                result, pages = fund_facts(raw,row,now)
                newref = source_ref(data,risk_ref,raw,stamp,1,pages=pages)
                item = {**result['mer'],'source':newref}
                if row['mer'].get('asOf') and (not item['asOf'] or item['asOf']<row['mer']['asOf']):
                    raise ValueError('MER observation date regressed')
                row['mer'] = item
                row['riskLabel'], row['riskSource'] = result['riskLabel'], newref
                check(id+'-facts',row['name']+' · fees / risk','ready','Retail Fund Facts identity, MER and risk validated.')
            except Exception as e:
                check(id+'-facts',row['name']+' · fees / risk','retained',safe_error(e))

    # Publish a new comparable cohort atomically; never compare mixed end dates.
    ends = {c[1]['asOf'] for c in candidates}
    try:
        if len(candidates)!=25 or len(ends)!=1:
            raise ValueError('Waiting for all 25 portfolios at one common annual end date')
        end = next(iter(ends))
        td = next(c[1] for c in candidates if c[0]['bank']=='td' and c[0]['profile']=='balanced')
        start = str(int(end[:4])-10)+'-12-30'
        url = 'https://www.bankofcanada.ca/valet/observations/group/CORRA/json?start_date='+start+'&end_date='+end
        raw = sources.read(url)
        cash = corra(raw,end)
        cashref = source_ref(data,data['reference']['cash']['source'],raw,stamp,url=url)
        reference = copy.deepcopy(data['reference'])
        reference['asOf'] = end
        for role in ['equity','bonds']:
            reference[role]['returns'] = td['reference'][role]
            reference[role]['source'] = next(c[2] for c in candidates if c[0]['bank']=='td' and c[0]['profile']=='balanced')
        reference['cash']['returns'], reference['cash']['source'] = cash,cashref
        reference['cash']['note']='Derived from daily CORRA using ACT/365 accrual across business-day gaps; not an investable deposit return or an official total-return index.'+(' The 10Y window spans the June 2020 methodology change.' if start<'2020-06-15' else '')
        for row,result,ref in candidates:
            for key in ['asOf','returns','benchmarkReturns','calendar','returnNote','benchmarkComponents']:
                if key in result:
                    row[key] = result[key]
            row['returnSource'] = ref
        data['reference'],data['returnAsOf'] = reference,end
        check('cohort','Comparable return cohort / common mix','ready','25 retail portfolios and common CAD reference validated at '+end+'.')
    except Exception as e:
        check('cohort','Comparable return cohort / common mix','pending',safe_error(e))

    for bank in data['banks']:
        old = bank['outlook']
        ref = old['source']
        try:
            url = outlook_url(bank['id'],data['sources'][ref['id']]['url'],sources)
            raw = sources.read(url)
            item = outlook(raw,bank['id'],old,now,data['sources'][ref['id']].get('sha256'))
            item['source'] = source_ref(data,ref,raw,stamp,url=url,title=bank['label']+' · '+item['title'])
            bank['outlook'] = item
            check(bank['id']+'-outlook',bank['label']+' · latest outlook','ready','Official index, publication identity and explicit date checked.')
        except Exception as e:
            check(bank['id']+'-outlook',bank['label']+' · latest outlook','retained',safe_error(e))

    # Remove no-longer-referenced provenance versions; this is a compact facts feed,
    # not a redistribution of bank documents or a growing source archive.
    refs = set()
    def walk(v):
        if isinstance(v,dict):
            if v.get('id') in data['sources']:
                refs.add(v['id'])
            for k,val in v.items():
                if k not in ('sources','sync'):
                    walk(val)
        elif isinstance(v,list):
            for val in v:
                walk(val)
    walk(data)
    data['sources'] = {k:v for k,v in data['sources'].items() if k in refs}
    before = {k:v for k,v in seed.items() if k not in ('sources','sync')}
    after = {k:v for k,v in data.items() if k not in ('sources','sync')}
    updated = stamp if before!=after else seed.get('sync',{}).get('updatedAt',seed['reviewedAt'])
    data['sync'] = {'schema':1,'cadenceHours':24,'status':'ready' if all(c['status']=='ready' for c in checks) else 'partial' if any(c['status']=='ready' for c in checks) else 'unavailable','checkedAt':stamp,'updatedAt':updated,'checks':checks}
    return data


def safe_error(e):
    if isinstance(e, urllib.error.HTTPError):
        return f'Official source returned HTTP {e.code}; last verified data retained.'
    if isinstance(e,(TimeoutError,urllib.error.URLError)):
        return 'Official source unavailable; last verified data retained.'
    if isinstance(e,ValueError):
        return str(e)[:400]+'. Last verified data retained.'
    return 'Source layout could not be validated; last verified data retained.'


if __name__=='__main__':
    previous = Path(sys.argv[1])
    output = Path(sys.argv[2])
    data = refresh(json.loads(previous.read_text()))
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':data['sync']['status'],'checkedAt':data['sync']['checkedAt'],'checks':len(data['sync']['checks']),'validated':sum(c['status']=='ready' for c in data['sync']['checks']),'returnAsOf':data['returnAsOf']}))
