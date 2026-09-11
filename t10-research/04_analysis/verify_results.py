from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
rows=json.loads((R/'03_data/processed/policy_indicators.json').read_text(encoding='utf-8'))
expected=[(82.3,83.7,1.4),(97.7,97.9,.2),(85.9,88.9,3.0),(95.8,95.9,.1),(96.6,96.7,.1),(95.1,95.5,.4)]
assert len(rows)==6
for row,(a,b,d) in zip(rows,expected):
 assert (row['year2020'],row['year2021'],row['difference_pp'])==(a,b,d)
 assert row['respondent_n'] is None
manifest=json.loads((R/'02_references/source_manifest.json').read_text(encoding='utf-8'))
for s in manifest:
 assert hashlib.sha256((R/s['file']).read_bytes()).hexdigest()==s['sha256'],s['file']
print('PASS: 12 source values, 6 differences, unknown N preserved, all raw hashes match')
