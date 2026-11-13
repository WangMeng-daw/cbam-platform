"""Read the supplied V3/V5 workbooks; preserve source cells and merged A columns."""
import sys,json,re,hashlib
from pathlib import Path
import openpyxl

root=Path(sys.argv[1]);dest=Path(__file__).resolve().parents[1]
names=['默认值（铝产品）V3.xlsx','基准值（铝产品V5）.xlsx']
books=[openpyxl.load_workbook(root/name,data_only=True) for name in names]
sources=[dict(file=name,sha256=hashlib.sha256((root/name).read_bytes()).hexdigest(),sheet=book.worksheets[0].title) for name,book in zip(names,books)]
def cn(v):return re.sub(r'\s+','',str(v))
def number(v):
 if isinstance(v,(float,int)):return v
 m=re.match(r'^\s*([0-9]+(?:\.[0-9]+)?)',str(v))
 if not m:raise ValueError(f'Invalid numeric value {v}')
 return float(m[1])
records=[]
for row in books[0].worksheets[0].iter_rows(min_row=4):
 values=[c.value for c in row]
 if values[0] is None:continue
 code=cn(values[0]);assert re.fullmatch(r'76\d{6}',code)
 records.append(dict(cn=code,name=values[1],en=values[2],values=[number(v) for v in values[6:9]],sourceRow=row[0].row,sourceDirect=values[3]))
benchmarks=[];sheet=books[1].worksheets[0]
for row in sheet.iter_rows(min_row=4):
 v=[c.value for c in row]
 if v[0] is None:continue
 merged=any(r.min_col==4 and r.max_col==5 and r.min_row==row[0].row and r.max_row==row[0].row for r in sheet.merged_cells.ranges)
 benchmarks.append(dict(cn=cn(v[0]),name=v[2],en=v[1],actualK=number(v[3]),actualL=number(v[3] if merged else v[4]),K=number(v[5]),L=number(v[6]),sourceRow=row[0].row,actualShared=merged))
codes={r['cn'] for r in records};assert len(records)==59 and len(codes)==58
assert len(benchmarks)==58 and codes=={r['cn'] for r in benchmarks}
for code in codes:
 rows=[r for r in records if r['cn']==code]
 assert all(r['values']==rows[0]['values'] for r in rows)
library=dict(version='V3-defaults-V5-benchmarks-2026-11-13',sources=sources,records=records,benchmarks=benchmarks,
 notes=['默认值表59条记录，76101000重复一次，共58个唯一CN；基准表58个唯一CN。','使用G/H/I年度含加价列，2028年以后使用I列；不重复加价。','D/F原始直接排放列部分数值为4148/4881等，保留作溯源，不用于年度默认值计算。','A列D:E合并单元格表示原铝与再生铝共用本工序基准；B列F/G分别为原铝/再生铝默认值基准。'])
(dest/'lib/aluminium-library.json').write_text(json.dumps(library,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
config=json.loads((dest/'lib/config.json').read_text(encoding='utf8'))
config['products']=[dict(cn=code,name=next(r['name'] for r in records if r['cn']==code),en=next(r['en'] for r in records if r['cn']==code)) for code in sorted(codes)]
config['productOptions']=[dict(cn=r['cn'],name=r['name'],en=r['en'],sourceRow=r['sourceRow']) for r in records]
config['defaults']=[r for r in config['defaults'] if not(r['country']=='China' and r['cn'] in codes)]
for code in sorted(codes):
 row=next(r for r in records if r['cn']==code)
 for year in range(2026,2031):
  config['defaults'].append(dict(cn=code,country='China',year=year,value=row['values'][min(year-2026,2)],route='K',source=f"{names[0]} / {sources[0]['sheet']}!{'GHI'[min(year-2026,2)]}{row['sourceRow']}",version=library['version'],effective=f'{year}-01-01'))
config['benchmarks']=[]
for row in benchmarks:
 for year in range(2026,2031):
  config['benchmarks'].append(dict(cn=row['cn'],year=year,process=row['actualK'],actualK=row['actualK'],actualL=row['actualL'],K=row['K'],L=row['L'],source=f"{names[1]} / {sources[1]['sheet']}!D{row['sourceRow']}:G{row['sourceRow']}",version=library['version'],effective=f'{year}-01-01'))
config['version']='2026.11.13-aluminium-v3-v5';config['updated']='2026-11-13T00:00:00.000Z'
config['rules']['precision']={'emissions':5,'specificEmissions':5,'emissionFactors':3,'certificates':'ceil','rounding':'half-up'}
(dest/'lib/config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(records=len(records),uniqueCN=len(codes),chinaDefaults=len(codes)*5,benchmarks=len(config['benchmarks']),duplicate='76101000'),ensure_ascii=False))
