import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('disclosure_refresh', Path(__file__).with_name('disclosure_refresh.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

ACC, CID, SID, CIK = '0000123456-26-000001', 'C000000001', 'S000000001', '0000123456'
ID = 'nport-' + CIK + '-' + SID.lower()
TIME = '2026-10-19T12:00:00Z'


def fixture(directory):
    fund = {'id': ID, 'cik': CIK, 'seriesId': SID, 'name': 'Synthetic public-source fund', 'registrant': 'Fixture trust',
        'sourceURL': 'https://www.sec.gov/example/filing', 'sourceType': 'SEC_NMFP', 'domicile': None,
        'classes': [], 'reports': [['2026-09-30', '2026-10-01', ACC, 'N-MFP3', 1]], 'pack': 'e00',
        'moneyMarketFacts': {'classFactsByAccession': {ACC: []}}}
    report = {'id': ACC, 'fundId': ID, 'currency': 'USD', 'sourceType': 'SEC_NMFP', 'reportingDate': '2026-09-30',
        'filingDate': '2026-10-01', 'form': 'N-MFP3', 'positions': [['fixture']], 'classFacts': []}
    body = gzip.compress(m.encoded({'schemaVersion': 1, 'reports': [report]}), mtime=0)
    pack = directory / 'packs/e00.json.bin'
    pack.parent.mkdir(parents=True)
    pack.write_bytes(body)
    src = {'url': 'https://www.sec.gov/example/source.zip', 'sha256': 'a' * 64, 'retrievedAt': TIME}
    extension = {'schemaVersion': 1, 'sourceType': 'SEC_NMFP', 'funds': [fund], 'issues': [], 'sources': [src],
        'manifest': {'unique_funds': 1, 'snapshot_versions': 1, 'source_holdings_rows': 1, 'source_class_rows': 0,
            'scope_complete_for_all_us_money_market_funds': False, 'provider_product_denominator': None, 'global_product_denominator': None},
        'packs': {'e00': {'path': '/institutional/funds/packs/e00.json.bin', 'sha256': m.digest(body), 'bytes': len(body), 'reports': 1}}}
    path = directory / 'extension.json'
    path.write_bytes(m.encoded(extension))
    return path, extension


class DisclosurePublisherTest(unittest.TestCase):
    def test_complete_batch_writes_hash_addressed_objects(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);path, _ = fixture(root / 'source');out = root / 'public'
            index = m.publish(out, {'SEC_NMFP': path}, TIME, {'SEC_NCEN': 'Fixture unavailable'}, 'code')
            meta = index['sources']['SEC_NMFP'];self.assertEqual(meta['sync']['status'], 'ready')
            self.assertTrue(m.previous_valid(meta, out))
            published = json.loads(gzip.decompress((out / 'objects' / (meta['sha256'] + '.json.bin')).read_bytes()))
            pack = published['packs']['e00']
            self.assertEqual(pack['remoteURL'], m.PREFIX + pack['sha256'] + '.json.bin')
            self.assertEqual(index['sources']['SEC_NCEN']['counts'], None)
            self.assertEqual(index['sources']['SEC_NCEN']['sync']['status'], 'unavailable')

    def test_corrupt_pack_fails_before_public_source_replacement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);path, _ = fixture(root / 'source');out = root / 'public'
            before = m.publish(out, {'SEC_NMFP': path}, TIME, {'SEC_NCEN': 'Fixture unavailable'}, 'code')
            old = before['sources']['SEC_NMFP'];files = sorted((out / 'objects').iterdir())
            (path.parent / 'packs/e00.json.bin').write_bytes(b'bad')
            after = m.publish(out, {'SEC_NMFP': path}, '2026-10-19T13:00:00Z', {'SEC_NCEN': 'Fixture unavailable'}, 'code')
            meta = after['sources']['SEC_NMFP']
            self.assertEqual(meta['sha256'], old['sha256']);self.assertEqual(meta['sync']['status'], 'error')
            self.assertEqual(meta['sync']['lastSuccessAt'], TIME)
            self.assertEqual(files, sorted((out / 'objects').iterdir()))

    def test_source_failure_preserves_last_complete_immutable_data(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);path, _ = fixture(root / 'source');out = root / 'public'
            before = m.publish(out, {'SEC_NMFP': path}, TIME, {'SEC_NCEN': 'Fixture unavailable'})
            after = m.publish(out, {}, '2026-10-19T13:00:00Z', {'SEC_NMFP': 'SEC HTTP 403', 'SEC_NCEN': 'SEC HTTP 503'})
            self.assertEqual(after['sources']['SEC_NMFP']['sha256'], before['sources']['SEC_NMFP']['sha256'])
            self.assertEqual(after['sources']['SEC_NMFP']['sync']['error'], 'SEC HTTP 403')
            self.assertTrue(m.previous_valid(after['sources']['SEC_NMFP'], out))

    def test_changed_retrieval_instant_does_not_duplicate_unchanged_financial_objects(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);path, data = fixture(root / 'source');out = root / 'public'
            first = m.publish(out, {'SEC_NMFP': path}, TIME, {'SEC_NCEN': 'Fixture unavailable'}, 'same-code')
            data['sources'][0]['retrievedAt'] = '2026-10-19T13:00:00Z';path.write_bytes(m.encoded(data))
            second = m.publish(out, {'SEC_NMFP': path}, '2026-10-19T13:00:00Z', {'SEC_NCEN': 'Fixture unavailable'}, 'same-code')
            self.assertEqual(first['sources']['SEC_NMFP']['sha256'], second['sources']['SEC_NMFP']['sha256'])
            self.assertEqual(second['sources']['SEC_NMFP']['sync']['lastSuccessAt'], '2026-10-19T13:00:00Z')

    def test_invalid_counts_or_unofficial_provenance_cannot_publish(self):
        with tempfile.TemporaryDirectory() as tmp:
            path, original = fixture(Path(tmp) / 'source')
            for mutate in [lambda x: x['manifest'].update(unique_funds=0),
                           lambda x: x['sources'][0].update(url='https://example.com/private'),
                           lambda x: x['funds'][0].update(sourceType='CA_CURATED_BANK')]:
                data = copy.deepcopy(original);mutate(data);path.write_bytes(m.encoded(data))
                with self.assertRaises(ValueError):m.prepare(path, 'SEC_NMFP')

    def test_changed_immutable_bytes_are_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);path, _ = fixture(root / 'source');out = root / 'public'
            first = m.publish(out, {'SEC_NMFP': path}, TIME, {'SEC_NCEN': 'Fixture unavailable'})
            target = out / 'objects' / (first['sources']['SEC_NMFP']['sha256'] + '.json.bin');target.write_bytes(b'corruption')
            after = m.publish(out, {'SEC_NMFP': path}, '2026-10-19T13:00:00Z', {'SEC_NCEN': 'Fixture unavailable'})
            self.assertEqual(target.read_bytes(), b'corruption')
            self.assertEqual(after['sources']['SEC_NMFP']['sync']['status'], 'unavailable')


if __name__ == '__main__':
    unittest.main()
