#!/usr/bin/env python3
"""Publish independently validated SEC disclosure batches and explicit failures.

Only immutable normalized SEC objects are public. Original downloads, parser
work and receipts belong in the caller's private work directory / CI artifact.
"""
import argparse
import copy
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re

PREFIX = 'https://raw.githubusercontent.com/rickyinbc-tech/tickerlantern-public-data/main/data/fund-disclosures/objects/'
TYPES = {'SEC_NMFP': 'sec_nmfp.py', 'SEC_NCEN': 'sec_ncen.py'}
MAX_RAW, MAX_PACKED = 32_000_000, 12_000_000


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def digest(body):
    return hashlib.sha256(body).hexdigest()


def stamp():
    return datetime.now(timezone.utc).isoformat()


def atomic(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_bytes(body)
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


def official(value):
    from urllib.parse import urlsplit
    u = urlsplit(value or '')
    return u.scheme == 'https' and u.netloc == 'www.sec.gov' and not u.username and not u.password


def read_json(path):
    body = path.read_bytes()
    if len(body) > MAX_RAW:
        raise ValueError('Disclosure JSON exceeds the expanded source budget')
    return json.loads(body)


def normalized(value):
    """Check-time changes alone do not create new public financial objects."""
    if isinstance(value, dict):
        return {k: normalized(v) for k, v in value.items() if k not in {
            'retrievedAt', 'checkedAt', 'builtAt', 'sourcePageEvidence', 'discovery'}}
    if isinstance(value, list):
        return [normalized(v) for v in value]
    return value


def validate_extension(extension, kind):
    if (extension.get('schemaVersion') != 1 or extension.get('sourceType') != kind
            or not extension.get('funds') or not extension.get('sources') or not isinstance(extension.get('issues'), list)):
        raise ValueError('Invalid or empty disclosure source extension')
    funds, seen, classes = extension['funds'], set(), {}
    for fund in funds:
        identity = fund.get('id', '')
        if (not re.fullmatch(r'[a-z0-9-]{1,60}', identity) or identity in seen
                or fund.get('sourceType') != kind or not fund.get('name') or not fund.get('registrant')
                or not re.fullmatch(r'\d{10}', fund.get('cik', '')) or int(fund['cik']) == 0
                or fund.get('domicile') is not None or not official(fund.get('sourceURL'))
                or not isinstance(fund.get('classes'), list) or not isinstance(fund.get('reports'), list)):
            raise ValueError('Invalid or duplicate disclosure fund identity/source')
        seen.add(identity)
        for item in fund['classes']:
            cid = item.get('id', '')
            if not re.fullmatch(r'C\d{9}', cid) or cid == 'C000000000' or cid in classes:
                raise ValueError('Invalid or conflicting exact disclosure class identity')
            classes[cid] = identity
    for source in extension['sources']:
        if not official(source.get('url')) or not re.fullmatch(r'[a-f0-9]{64}', source.get('sha256', '')):
            raise ValueError('Disclosure source lacks original official provenance')
        if not source.get('retrievedAt'):
            raise ValueError('Disclosure source retrieval date is missing')
    m = extension['manifest']
    if kind == 'SEC_NMFP':
        reports = [row for fund in funds for row in fund['reports']]
        facts = [c for fund in funds for rows in fund['moneyMarketFacts']['classFactsByAccession'].values() for c in rows]
        if (len(funds) != m['unique_funds'] or len(reports) != m['snapshot_versions']
                or len({r[2] for r in reports}) != len(reports)
                or sum(r[4] for r in reports) != m['source_holdings_rows'] or len(facts) != m['source_class_rows']
                or m['scope_complete_for_all_us_money_market_funds'] is not False
                or m['provider_product_denominator'] is not None or m['global_product_denominator'] is not None):
            raise ValueError('Money market complete source counts/scope do not reconcile')
    else:
        observations = [o for fund in funds for o in fund['censusFacts']['observations']]
        if (len(funds) != m['catalog_records'] or len(observations) != m['source_fund_rows']
                or len({o['id'] for o in observations}) != len(observations)
                or sum(len(o['classes']) for o in observations) != m['source_class_rows']
                or sum(len(o['advisers']) for o in observations) != m['source_adviser_rows']
                or len(extension['unjoinable']) != m['filing_scoped_records']
                or m['complete_current_us_fund_universe'] is not False or m['parse_failed'] != 0
                or m['financial_values_normalized'] != 0):
            raise ValueError('Census complete source counts/scope do not reconcile')
    return extension


def prepare(path, kind):
    extension = validate_extension(read_json(path), kind)
    objects, accessions = {}, set()
    if kind == 'SEC_NMFP':
        reports = {row[2]: (fund, row) for fund in extension['funds'] for row in fund['reports']}
        for key, meta in extension['packs'].items():
            if not re.fullmatch(r'e[a-f0-9]{2}', key) or meta['path'] != '/institutional/funds/packs/' + key + '.json.bin':
                raise ValueError('Unexpected money market source pack identity')
            body = (path.parent / 'packs' / (key + '.json.bin')).read_bytes()
            if len(body) != meta['bytes'] or len(body) > MAX_PACKED or digest(body) != meta['sha256']:
                raise ValueError('Money market source pack bytes/hash mismatch')
            raw = gzip.decompress(body)
            if len(raw) > 100_000_000:
                raise ValueError('Money market expanded holdings exceed source budget')
            pack = json.loads(raw)
            if pack.get('schemaVersion') != 1 or len(pack['reports']) != meta['reports']:
                raise ValueError('Money market pack report count mismatch')
            for report in pack['reports']:
                pair = reports.get(report['id'])
                if not pair or report['id'] in accessions:
                    raise ValueError('Missing/duplicate money market source accession')
                fund, ref = pair
                if (fund['pack'] != key or report['fundId'] != fund['id'] or report['currency'] != 'USD'
                        or report['sourceType'] != kind or report['reportingDate'] != ref[0]
                        or report['filingDate'] != ref[1] or report['form'] != ref[3]
                        or len(report['positions']) != ref[4]
                        or report['classFacts'] != fund['moneyMarketFacts']['classFactsByAccession'][report['id']]):
                    raise ValueError('Money market pack parent/date/class facts mismatch')
                accessions.add(report['id'])
            objects[meta['sha256']] = body
            meta['remoteURL'] = PREFIX + meta['sha256'] + '.json.bin'
        if accessions != set(reports):
            raise ValueError('Money market source reports are not completely covered')
    raw = encoded(extension)
    if len(raw) > MAX_RAW:
        raise ValueError('Expanded disclosure extension exceeds client budget')
    body = gzip.compress(raw, mtime=0)
    if len(body) > MAX_PACKED:
        raise ValueError('Packed disclosure extension exceeds client budget')
    sha = digest(body)
    objects[sha] = body
    fingerprint = digest(encoded(normalized({k: extension[k] for k in ['sourceType', 'manifest', 'sources']})))
    return extension, {'url': PREFIX + sha + '.json.bin', 'sha256': sha, 'bytes': len(body), 'sourceFingerprint': fingerprint}, objects


def previous_valid(meta, output):
    if not meta or not re.fullmatch(r'[a-f0-9]{64}', meta.get('sha256') or ''):
        return False
    if meta.get('url') != PREFIX + meta['sha256'] + '.json.bin':
        return False
    path = output / 'objects' / (meta['sha256'] + '.json.bin')
    try:
        if not path.is_file() or path.stat().st_size != meta.get('bytes') or path.stat().st_size > MAX_PACKED:
            return False
        body = path.read_bytes()
        if digest(body) != meta['sha256']:
            return False
        with gzip.GzipFile(fileobj=io.BytesIO(body)) as stream:
            raw = stream.read(MAX_RAW + 1)
        if len(raw) > MAX_RAW:
            return False
        extension = json.loads(raw)
        validate_extension(extension, extension['sourceType'])
        for pack in extension.get('packs', {}).values():
            if (not re.fullmatch(r'[a-f0-9]{64}', pack.get('sha256') or '')
                    or pack.get('remoteURL') != PREFIX + pack['sha256'] + '.json.bin'):
                return False
            packed = output / 'objects' / (pack['sha256'] + '.json.bin')
            if not packed.is_file() or packed.stat().st_size != pack['bytes'] or digest(packed.read_bytes()) != pack['sha256']:
                return False
        return True
    except (ValueError, KeyError, TypeError, OSError):
        return False


def publish(output, inputs, checked_at=None, errors=None, code_fingerprint=None, check_meanings=None):
    checked_at, errors = checked_at or stamp(), errors or {}
    check_meanings = check_meanings or {}
    index_path = output / 'index.json'
    prior = read_json(index_path) if index_path.exists() else {}
    result = {'schemaVersion': 1, 'sourceType': 'SEC_FUND_DISCLOSURES', 'checkedAt': checked_at,
        'sources': {}, 'scope': 'Latest independently checked N-MFP and N-CEN source batches; not full US/global coverage. N-PORT is separate.'}
    for kind in TYPES:
        old = prior.get('sources', {}).get(kind)
        try:
            if kind in errors:
                raise ValueError(errors[kind])
            extension, meta, objects = prepare(inputs[kind], kind)
            if (previous_valid(old, output) and old.get('sourceFingerprint') == meta['sourceFingerprint']
                    and old.get('codeFingerprint') == code_fingerprint):
                meta = {k: copy.deepcopy(v) for k, v in old.items() if k != 'sync'}
            else:
                for sha, body in objects.items():
                    target = output / 'objects' / (sha + '.json.bin')
                    if target.exists() and digest(target.read_bytes()) != sha:
                        raise ValueError('Immutable disclosure object collision')
                    if not target.exists():
                        atomic(target, body)
            meta['codeFingerprint'] = code_fingerprint
            meta['counts'] = {key: extension['manifest'][key] for key in (
                ['unique_funds', 'snapshot_versions', 'source_holdings_rows', 'source_class_rows'] if kind == 'SEC_NMFP'
                else ['catalog_records', 'source_fund_rows', 'source_class_rows', 'source_adviser_rows', 'filing_scoped_records'])}
            meta['sync'] = {'status': 'ready', 'checkedAt': checked_at, 'lastSuccessAt': checked_at, 'error': None,
                'checkMeaning': check_meanings.get(kind, 'Validated supplied source snapshot; no new official retrieval is asserted.')}
            result['sources'][kind] = meta
        except Exception as error:
            if previous_valid(old, output):
                kept = copy.deepcopy(old)
                kept['sync'] = {**old['sync'], 'status': 'error', 'checkedAt': checked_at, 'error': str(error)}
            else:
                kept = {'url': None, 'sha256': None, 'bytes': None, 'counts': None,
                    'sync': {'status': 'unavailable', 'checkedAt': checked_at, 'lastSuccessAt': None, 'error': str(error)}}
            result['sources'][kind] = kept
    atomic(index_path, encoded(result))
    return result


def load_adapter(filename):
    path = Path(__file__).resolve().parents[1] / 'fund-adapters' / filename
    spec = importlib.util.spec_from_file_location('disclosure_' + path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def download(kind, work):
    adapter = load_adapter(TYPES[kind])
    # A new source-check directory fetches the complete ZIP, including changes
    # made at an existing dated URL; parser caches never imply a fresh download.
    directory = work / kind.lower()
    archive, page_path, metadata = adapter.download_latest(directory / 'raw')
    page = page_path.read_bytes()
    page_evidence = read_json(page_path.with_suffix('.html.meta.json'))
    if page_evidence.get('url') != adapter.SOURCE_PAGE or page_evidence.get('sha256') != digest(page) or page_evidence.get('bytes') != len(page):
        raise ValueError('Original discovery page evidence mismatch')
    batch = adapter.discover(page)
    batch['sourcePageEvidence'] = page_evidence
    evidence = read_json(metadata)
    catalog = adapter.parse_archive(archive, evidence, batch)
    extension = directory / 'research-extension.json'
    adapter.stage_extension(catalog, extension)
    return extension


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--work', required=True, type=Path)
    parser.add_argument('--nmfp-extension', type=Path)
    parser.add_argument('--ncen-extension', type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    work = args.work / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    work.mkdir(parents=True)
    inputs, errors, meanings = {}, {}, {}
    for kind, locked in [('SEC_NMFP', args.nmfp_extension), ('SEC_NCEN', args.ncen_extension)]:
        try:
            inputs[kind] = locked or download(kind, work)
            meanings[kind] = ('Validated supplied source snapshot; no new official retrieval is asserted.' if locked else
                'Fresh official ZIP and source-page check; unchanged financial bytes preserve their original retrieval dates.')
        except Exception as error:
            errors[kind] = str(error)
    code = [Path(__file__), Path(__file__).with_name('refresh.py')]
    code += [Path(__file__).resolve().parents[1] / 'fund-adapters' / name for name in TYPES.values()]
    fingerprint = digest(b''.join(path.read_bytes() for path in code))
    result = publish(args.output, inputs, errors=errors, code_fingerprint=fingerprint, check_meanings=meanings)
    atomic(work / 'receipt.json', encoded(result))
    print(json.dumps({'checkedAt': result['checkedAt'], 'sources': {key: {'sync': value['sync'], 'counts': value.get('counts')} for key, value in result['sources'].items()}}))


if __name__ == '__main__':
    main()
