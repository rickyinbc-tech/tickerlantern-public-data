import copy
import datetime as dt
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('bank_refresh',Path(__file__).with_name('refresh.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
seed_path=Path(__file__).with_name('seed.json')
if not seed_path.exists():
    seed_path=Path(__file__).parents[2]/'src/bank-portfolios-data.json'
SEED=json.loads(seed_path.read_text())
NOW=dt.datetime(2027,3,1,tzinfo=dt.timezone.utc)

class FakeSources:
    def __init__(self,fail=None):self.fail=fail
    def read(self,url):
        if self.fail and self.fail in url:raise ValueError('Source identity changed')
        return b'Public test source'

def parsed(raw,row,now):
    r=copy.deepcopy(row)
    r.update(asOf='2026-12-31',page=2,allocationPage=1)
    r['returns']={**r['returns'],'1':r['returns']['1']+1}
    r['allocation']['asOf']='2026-12-31'
    # A newer allocation can publish even while a comparable return cohort waits.
    if row['bank']=='td' and row['profile']=='balanced':r['reference']={k:copy.deepcopy(SEED['reference'][k]['returns']) for k in ['equity','bonds']}
    if row['bank']=='bmo':
        r['calendar']={str(int(y)+1):v for y,v in r['calendar'].items()}
        r['calendar']['2026']=r['returns']['1']
    r.pop('mer',None)
    return r,3

class PublicationTests(unittest.TestCase):
    def run_refresh(self,fail=None):
        with patch.object(b,'annual',parsed),patch.object(b,'fund_facts',parsed),patch.object(b,'corra',return_value=SEED['reference']['cash']['returns']),patch.object(b,'outlook_url',side_effect=ValueError('Index unavailable')):
            return b.refresh(SEED,FakeSources(fail),NOW)

    def test_new_common_year_advances_all_returns_and_reference_together(self):
        d=self.run_refresh()
        self.assertEqual(d['returnAsOf'],'2026-12-31')
        self.assertEqual(d['reference']['asOf'],d['returnAsOf'])
        self.assertTrue(all(r['asOf']==d['returnAsOf'] for r in d['portfolios']))
        self.assertNotEqual(d['portfolios'][0]['returns']['1'],SEED['portfolios'][0]['returns']['1'])
        self.assertEqual(d['reviewedAt'],SEED['reviewedAt'])
        self.assertEqual(d['sync']['status'],'partial') # Outlooks are not falsely successful.
        self.assertTrue(all('source' in r['allocation'] for r in d['portfolios']))

    def test_one_missing_fund_retains_entire_return_cohort_and_ref_but_keeps_valid_allocations(self):
        url=SEED['sources'][SEED['portfolios'][0]['returnSource']['id']]['url']
        d=self.run_refresh(url)
        self.assertEqual(d['returnAsOf'],SEED['returnAsOf'])
        self.assertEqual(d['reference'],SEED['reference'])
        self.assertEqual([r['returns'] for r in d['portfolios']],[r['returns'] for r in SEED['portfolios']])
        self.assertEqual(d['portfolios'][0]['allocation'],SEED['portfolios'][0]['allocation'])
        self.assertEqual(d['portfolios'][1]['allocation']['asOf'],'2026-12-31')
        self.assertEqual(next(c for c in d['sync']['checks'] if c['id']=='cohort')['status'],'pending')

    def test_total_outage_preserves_original_figures_dates_and_last_content_update(self):
        d=b.refresh(SEED,FakeSources('https:'),NOW)
        self.assertEqual(d['portfolios'],SEED['portfolios'])
        self.assertEqual(d['banks'],SEED['banks'])
        self.assertEqual(d['sync']['updatedAt'],SEED['reviewedAt'])
        self.assertEqual(d['sync']['status'],'unavailable')
        self.assertNotEqual(d['sync']['checkedAt'],d['sync']['updatedAt'])

    def test_exact_return_row_handles_zero_negative_and_rejects_wrong_or_incomplete_series(self):
        t='Investor Series 0.0 -2.0 3.0 4.0 N/A\nF-Series 1.0 2.0 3.0 4.0 5.0'
        self.assertEqual(b.rate_row(t,'Investor Series'),{'1':0.,'3':-2.,'5':3.,'10':4.})
        for bad in ['Investor Series 1 2 3 N/A 6','F-Series 1 2 3 4 5',t+'\nInvestor Series 0 0 0 0']:
            with self.assertRaises(ValueError):b.rate_row(bad,'Investor Series')

    def test_benchmark_names_and_total_must_validate(self):
        old=[{'name':'Known Bond Index','role':'bonds','weight':40},{'name':'Known Equity Index','role':'equity','weight':60}]
        got=b.weighted_components('Benchmark: 45% Known Bond Index 55% Known Equity Index',old,'Benchmark:')
        self.assertEqual([c['weight'] for c in got],[45,55])
        for bad in ['Benchmark: 45% Unknown Bond Index 55% Known Equity Index','Benchmark: 45% Known Bond Index 60% Known Equity Index']:
            with self.assertRaises(ValueError):b.weighted_components(bad,old,'Benchmark:')

    def test_new_outlook_does_not_inherit_old_weights_or_an_invented_publication_date(self):
        old=copy.deepcopy(SEED['banks'][1]['outlook'])
        html=b'<h1>Monthly Portfolio Outlook</h1><p>Views as of February 2, 2027</p><p>Markets and portfolios face changing conditions. This is a sufficiently long official test paragraph describing diversification and market positioning for readers.</p>'
        new=b.outlook(html,'td',old,NOW)
        self.assertEqual(new['asOf'],'2027-02-02');self.assertIsNone(new['mix'])
        self.assertEqual(new['summaryKind'],'excerpt')
        self.assertLessEqual(len(new['summary'].split()),26)
        with self.assertRaises(ValueError):b.outlook(html.replace(b'February 2, 2027',b'undated'),'td',old,NOW)
        with self.assertRaises(ValueError):b.outlook(html.replace(b'February 2, 2027',b'April 2, 2027'),'td',old,NOW)

    def test_rbc_outlook_reads_current_weights_and_not_neutral_weights(self):
        old=SEED['banks'][0]['outlook']
        html=b'<meta name="description" content="Global Investment Outlook - Spring 2027"><p>Our current recommended asset mix for a global balanced investor is 62.0% equities (strategic "neutral": 60.0%), 36.0% bonds (strategic "neutral": 38.0%) and 2.0% cash. Note: As of February 1, 2027.</p>'
        got=b.outlook(html,'rbc',old,NOW)
        self.assertEqual([c['weight'] for c in got['mix']],[62,36,2])
        with self.assertRaises(ValueError):b.outlook(html.replace(b'36.0%',b'40.0%'),'rbc',old,NOW)

    def test_sources_are_fixed_https_hosts_and_credentials_are_rejected(self):
        b.allowed_url('https://www.td.com/public.pdf')
        for url in ['http://www.td.com/a','https://www.td.com.evil.test/a','https://user:secret@www.td.com/a','https://localhost/a']:
            with self.assertRaises(ValueError):b.allowed_url(url)

    def test_corra_requires_covered_business_day_gaps_not_arbitrary_endpoints(self):
        with self.assertRaises(ValueError):b.corra(json.dumps({'seriesDetail':{'AVG.INTWO':{'label':'Canadian Overnight Repo Rate Average (CORRA)','metadata':{'unit':'Percent'}}},'observations':[{'d':'2015-12-31','AVG.INTWO':{'v':'5'}},{'d':'2025-12-31','AVG.INTWO':{'v':'5'}}]}).encode(),'2025-12-31')

    def test_corra_compounds_actual_daily_series_and_day_count_for_all_periods(self):
        end=dt.date(2025,12,31);start=dt.date(2015,12,30)
        rows=[];day=start
        while day<=end:
            rows.append({'d':day.isoformat(),'AVG.INTWO':{'v':'5'}});day+=dt.timedelta(days=1)
        raw={'seriesDetail':{'AVG.INTWO':{'label':'Canadian Overnight Repo Rate Average (CORRA)','metadata':{'unit':'Percent'}}},'observations':rows}
        got=b.corra(json.dumps(raw).encode(),end.isoformat())
        for years in b.PERIODS:
            days=(end-end.replace(year=end.year-years)).days
            self.assertAlmostEqual(got[str(years)],((1+.05/365)**(days/years)-1)*100,places=9)
        raw['seriesDetail']['AVG.INTWO']['metadata']['unit']='Basis points'
        with self.assertRaises(ValueError):b.corra(json.dumps(raw).encode(),end.isoformat())

    def test_bmo_outlook_dates_ignore_invisible_separators_and_do_not_take_benchmark_weights(self):
        old=SEED['banks'][2]['outlook']
        html='<h1>BMO Macro Regime Model – Strategy Report (Q4 2026)</h1><p>All portfolio weights are as of market close on September 30,\u200b2026.</p><table><tr><th></th><th>Current Weight</th><th>Benchmark</th></tr><tr><td>Fixed Income</td><td>22%</td><td>30%</td></tr><tr><td>Equities</td><td>63%</td><td>60%</td></tr><tr><td>Alts/Hybrids</td><td>15%</td><td>10%</td></tr></table>'
        got=b.outlook(html.encode(),'bmo',old,NOW)
        self.assertEqual(got['asOf'],'2026-09-30')
        self.assertEqual([c['weight'] for c in got['mix']],[22,63,15])
        with self.assertRaises(ValueError):b.outlook(html.replace('22%','25%').encode(),'bmo',old,NOW)

if __name__=='__main__':unittest.main()
