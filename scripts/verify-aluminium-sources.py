"""Independent cell-by-cell source audit and Decimal calculation oracle."""
import sys,json,re
from pathlib import Path
from decimal import Decimal as D,ROUND_HALF_UP,ROUND_CEILING,getcontext
import openpyxl
getcontext().prec=60
root=Path(sys.argv[1]);repo=Path(__file__).resolve().parents[1]
c=json.loads((repo/'lib/config.json').read_text(encoding='utf8'))
default=openpyxl.load_workbook(root/'默认值（铝产品）V3.xlsx',data_only=True).worksheets[0]
benchmark=openpyxl.load_workbook(root/'基准值（铝产品V5）.xlsx',data_only=True).worksheets[0]
def code(v):return str(v).replace(' ','')
def value(v):return D(re.match(r'[0-9.]+',str(v)).group())
def rounded(v,n):return v.quantize(D(10)**(-n),rounding=ROUND_HALF_UP)
sources={};records=[];checked=0
for row in range(4,63):
 raw=default.cell(row,1).value
 if raw is None:continue
 cn=code(raw);records.append((cn,default.cell(row,2).value));sources[cn]=row
assert [(p['cn'],p['name']) for p in c['productOptions']]==records
assert len(records)==59 and len(sources)==58
assert len(c['products'])==58
assert set(sources)=={p['cn'] for p in c['products']}
bm={code(benchmark.cell(row,1).value):row for row in range(4,62)}
assert set(sources)==set(bm)
phase={2026:D('.975'),2027:D('.95'),2028:D('.9'),2029:D('.775'),2030:D('.515')}
cases=[]
for cn,row in sources.items():
 b=bm[cn]
 for year in range(2026,2031):
  see=value(default.cell(row,{2026:7,2027:8}.get(year,9)).value)
  dr=[r for r in c['defaults'] if r['cn']==cn and r['country']=='China' and r['year']==year]
  br=[r for r in c['benchmarks'] if r['cn']==cn and r['year']==year]
  assert len(dr)==len(br)==1
  assert D(str(dr[0]['value']))==see;checked+=1
  for route,acol,bcol in [('primary',4,6),('recycled',5,7)]:
   raw=benchmark.cell(b,acol).value
   if raw is None:
    assert any(str(r)==f'D{b}:E{b}' for r in benchmark.merged_cells.ranges)
    raw=benchmark.cell(b,4).value
   actual=value(raw);default_bm=value(benchmark.cell(b,bcol).value)
   assert D(str(br[0]['actualK' if route=='primary' else 'actualL']))==actual
   assert D(str(br[0]['K' if route=='primary' else 'L']))==default_bm;checked+=2
   qty=D('1234.567');price=D('83.21');see=rounded(see,5)
   free=rounded(default_bm,3)*phase[year];net=rounded(max(D(0),(see-free)*qty),5)
   certificates=net.to_integral_value(rounding=ROUND_CEILING)
   cases.append(dict(cn=cn,year=year,route=route,actualBenchmark=float(actual),input=dict(mode='simple',cn=cn,country='China',year=year,quarter=2,exportQty=float(qty),aluminium=route,priceOverride=float(price)),expected=dict(see=float(see),sefa=float(free),total=float(rounded(see*qty,5)),netEmissions=float(net),certificates=int(certificates),cost=float(rounded(certificates*price,2)))))
(repo/'scripts/fixtures/aluminium-library-validation.json').write_text(json.dumps(dict(sourceCellsChecked=checked,cases=cases),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(json.dumps(dict(records=len(records),uniqueCN=len(sources),sourceCellsChecked=checked,calculationCases=len(cases))))
