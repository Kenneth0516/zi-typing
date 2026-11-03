"""Rebuild lookup data from a fixed upstream revision. Python standard library only.
Raw upstream files and licenses remain available in public/data for attribution.
"""
import hashlib, json, pathlib, re, urllib.request

REVISION = 'fcb3d7dd94ac1304663d575727d24d8107f6b082'
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'data'
ROOT.mkdir(parents=True, exist_ok=True)
codes = {}
files = ['cangjie5.base.dict.yaml', 'cangjie5.extended.dict.yaml']
for name in files + ['LICENSE']:
    path = ROOT / name
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/rime/rime-cangjie/{REVISION}/{name}').read())
    if name not in files:
        continue
    for line in path.read_text(encoding='utf-8').splitlines():
        columns = line.split('\t')
        if len(columns) >= 2 and len(columns[0]) == 1 and re.fullmatch('[a-z]{1,5}', columns[1]):
            entries = codes.setdefault(columns[0], [])
            if columns[1] not in entries:
                entries.append(columns[1])
(ROOT / 'cangjie5.json').write_text(json.dumps(codes, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(codes)} characters; SHA256 {hashlib.sha256((ROOT / "cangjie5.json").read_bytes()).hexdigest()}')
