"""Recreate descriptive policy tables from the bundled original PDF. No causal test."""
from pathlib import Path
import json, re, statistics, hashlib
import pdfplumber
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
pdf_path = ROOT / '03_data/raw/mnd_evaluation.pdf'
with pdfplumber.open(pdf_path) as doc:
    text = doc.pages[10].extract_text()
labels = [('간부와 소통','Officer communication'),('외부와 소통','Outside communication'),
          ('병사 간 소통','Peer communication'),('자기개발','Self-development'),
          ('심리적 안정','Psychological stability'),('군 생활 만족도','Service satisfaction')]
compact = re.sub(r'\s+', '', text)
rows = []
for label, english in labels:
    match = re.search(re.escape(label.replace(' ',''))+r'\([^)]*20\)([\d.]+)%.*?\([^)]*21\)([\d.]+)%', compact)
    if not match:
        raise ValueError(f'Missing source indicator: {label}')
    a,b=map(float,match.groups())
    if not all(0<=x<=100 for x in (a,b)): raise ValueError('Out of range percentage')
    rows.append(dict(indicator=label,label_en=english,year2020=a,year2021=b,
                     difference_pp=round(b-a,1),respondent_n=None,pdf_page=11,printed_page=8))
for folder in ['03_data/processed','05_results/tables','05_results/figures']:
    (ROOT/folder).mkdir(parents=True,exist_ok=True)
def write_json(path,value):
    (ROOT/path).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
write_json('03_data/processed/policy_indicators.json',rows)
stats = {'indicator_count':len(rows),'aggregate_value_count':len(rows)*2,
         'respondent_count':None,'source_sha256':hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
         'interpretation':'Descriptive percentages of policy perceptions; not stress scores or causal effects.'}
for year in [2020,2021]:
    values=[r[f'year{year}'] for r in rows]
    stats[str(year)]={'mean_across_different_indicators':round(statistics.mean(values),3),
                     'median':statistics.median(values),'min':min(values),'max':max(values)}
write_json('05_results/tables/descriptive_statistics.json',stats)
md=['# 정책 인식 지표','', '6개 지표의 2개 시점 집계값이다. 응답자 수와 표준오차는 해당 페이지에 미보고이며, 인과효과 검정은 하지 않는다.','',
    '|지표|2020년 %|2021년 %|차이 %p|','|---|---:|---:|---:|']
md += [f"|{r['indicator']}|{r['year2020']:.1f}|{r['year2021']:.1f}|{r['difference_pp']:+.1f}|" for r in rows]
md += ['', '출처: 국방부(2022), 성과관리 전략계획 2022~2026, 인쇄 8쪽(PDF 11쪽).',
       '서로 다른 지표의 평균은 지표 분포의 기술값이며 병사 평균이나 스트레스 감소량이 아니다.']
(ROOT/'05_results/tables/policy_indicators.md').write_text('\n'.join(md),encoding='utf-8')
fig, ax=plt.subplots(figsize=(9,4.7))
y=list(range(len(rows)))
ax.barh([i-.18 for i in y],[r['year2020'] for r in rows],height=.34,color='#9ab4c7',label='July 2020')
ax.barh([i+.18 for i in y],[r['year2021'] for r in rows],height=.34,color='#254b65',label='July 2021')
ax.set_yticks(y,[r['label_en'] for r in rows]); ax.invert_yaxis(); ax.set_xlim(0,105)
ax.set_xlabel('Reported positive perception (%) - not a stress score')
ax.set_title('Perceptions of mobile phone use after duty')
ax.legend(loc='lower left'); ax.spines[['top','right']].set_visible(False)
fig.tight_layout(); fig.savefig(ROOT/'05_results/figures/policy_perceptions.png',dpi=180); plt.close(fig)
print(json.dumps(stats,ensure_ascii=False,indent=2))
