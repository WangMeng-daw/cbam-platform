"""Independent rational-arithmetic oracle for the supplied document method.

Run: python scripts/document-reference.py > scripts/fixtures/document-validation.json
Only synthetic inputs; no application engine or configuration is imported.
Python Fraction supplies exact arithmetic and explicit decimal half-up rounding.
"""
import json
import random
from copy import deepcopy
from fractions import Fraction as F


def q(value):
    return F(str(value))


def rounded(value, places=0):
    scaled = value * 10**places
    whole, remainder = divmod(scaled.numerator, scaled.denominator)
    return F(whole + (2 * remainder >= scaled.denominator), 10**places)


def reference(data):
    # A separate topological iteration, not the application's recursive graph walk.
    pending = deepcopy(data['products'])
    done = {}
    factor = q({2026: '.975', 2027: '.95', 2028: '.9', 2029: '.775', 2030: '.515'}[data['year']])
    price = q(data['priceOverride']) if data['priceOverride'] != '' else None
    while pending:
        ready = [p for p in pending if all(m['productId'] in done for m in p['precursors'])]
        if not ready:
            raise ValueError('Cycle or missing upstream')
        for p in ready:
            fuel = sum((rounded(q(f['quantity']) * q(f['ncv']) * q(f['ef']) * q(f['oxidation']) / 100000, 1) for f in p['fuels']), F(0))
            anode = cf4 = c2f6 = pfc = F(0)
            if p['kind'] == 'primary':
                a, f = p['anode'], p['pfc']
                anode = rounded(q(a['quantity']) * q(a['ef']) * (1 - q(a['lossRate']) / 100), 4)
                cf4 = rounded(q(f['production']) * q(f['frequency']) * q(f['duration']) * q(f['sef']) / 1000, 2)
                c2f6 = rounded(cf4 * q(f['ratio']), 2)
                pfc = rounded((cf4 * 6630 + c2f6 * 11100) * 100 / q(f['collection']))
            direct = rounded(fuel + anode + pfc)
            upstream = sum((done[m['productId']]['embeddedProduction'] * q(m['quantity']) / q(done[m['productId']]['production']) for m in p['precursors']), F(0))
            embedded = direct + upstream
            see = rounded(embedded / q(p['production']), 3)
            free = q(p['benchmark']) * factor
            net = max(F(0), (see - free) * q(p['exportQty']))
            cost = rounded(net * price, 2) if price is not None else None
            done[p['id']] = dict(production=q(p['production']), combustion=fuel, anode=anode, cf4=cf4, c2f6=c2f6, pfc=pfc,
                direct=direct, se=rounded(direct/q(p['production']), 3), precursor=rounded(upstream, 6), embeddedProduction=embedded,
                see=see, sefa=free, netEmissions=net, certificates=-(-net.numerator//net.denominator),
                total=rounded(see*q(p['exportQty'])), cost=cost, costWan=rounded(cost/10000, 2) if cost is not None else None)
            pending.remove(p)
    return dict(products={k:{field:float(value) if isinstance(value,F) else value for field,value in row.items()} for k,row in done.items()},
        totalCost=float(sum(row['cost'] for row in done.values())) if price is not None else None,
        totalExportEmissions=float(sum(row['total'] for row in done.values())))


def product(id, kind='forming', production=1000, exports=1000, fuels=None, links=None, **kwargs):
    return dict(id=id, name=id, kind=kind, cn='76011010' if kind!='forming' else '76041090', production=production, exportQty=exports,
        benchmark={'primary':1.423,'recycled':.091,'forming':.06}[kind], fuels=fuels or [], precursors=links or [], **kwargs)


def fuel(quantity, ncv=48, ef=56.1, oxidation=100):
    return dict(type='fuel-33', quantity=quantity, ncv=ncv, ef=ef, oxidation=oxidation)


def primary(id='upstream', production=100000, exports=40000):
    return product(id,'primary',production,exports,[fuel(5000)],anode=dict(quantity=30000,ef=3.66,lossRate=15.18),
        pfc=dict(technology='CWPB',production=production,frequency=.4,duration=.2,sef=.143,ratio=.121,collection=95))


cases=[]
def add(name, products, year=2026, price=80):
    data=dict(mode='professional',method='document',country='China',year=year,quarter=4,priceOverride=price,products=products,report={})
    cases.append(dict(name=name,input=data,expected=reference(data)))


add('single-forming-two-fuels',[product('forming',fuels=[fuel(400),fuel(20,42.3,73.3,98)])])
add('primary-loss-and-pfc',[primary()])
add('two-process-40-60',[primary(),product('forming',production=57000,exports=57000,fuels=[fuel(900)],links=[dict(productId='upstream',quantity=60000)])])
a=primary(exports=20000)
b=product('forming-A',production=38000,exports=38000,fuels=[fuel(700)],links=[dict(productId='upstream',quantity=40000)])
c=product('forming-B',production=38000,exports=38000,fuels=[fuel(1000)],links=[dict(productId='upstream',quantity=40000)])
add('one-upstream-two-downstreams',[a,b,c])
a=primary(exports=0)
b=product('intermediate',production=95000,exports=35000,fuels=[fuel(1400)],links=[dict(productId='upstream',quantity=100000)])
c=product('final',production=57000,exports=57000,fuels=[fuel(500)],links=[dict(productId='intermediate',quantity=60000)])
add('three-process-chain',[a,b,c],year=2028,price=90)
add('two-upstreams-mixed',[primary(exports=50000),product('recycled','recycled',40000,0,[fuel(800)]),product('mixed',production=85000,exports=85000,fuels=[fuel(1200)],links=[dict(productId='upstream',quantity=50000),dict(productId='recycled',quantity=40000)])])
add('below-free-allocation',[product('recycled','recycled',10000,10000,[fuel(100)])])
add('zero-export',[primary(exports=0)])
add('missing-quarter-price',[primary()],price='')
# Boundary values are intentional: half-up must not be changed by IEEE754 noise.
add('SEE-half-up',[product('round-see',production=2000,exports=1000,fuels=[fuel(1000,50,53.5)])])
add('SEE-below-half',[product('round-see',production='2000.00001',exports=1000,fuels=[fuel(1000,50,53.5)])])
add('fuel-half-up',[product('fuel-half',fuels=[fuel(10,50,56.1)])])
add('fuel-below-half',[product('fuel-half',fuels=[fuel(10,50,'56.0999999')])])
add('cost-half-cent',[product('round-cost',production=1000,exports=1,fuels=[fuel(500,40,50)])],price=80)
cases[-1]['input']['products'][0]['benchmark']=0
cases[-1]['input']['products'][0]['exportQty']=.5
cases[-1]['input']['priceOverride']=75.35
cases[-1]['expected']=reference(cases[-1]['input'])
edge=product('ceil-edge',production=1000,exports='1.000000001',fuels=[fuel(500,40,50)])
edge['benchmark']=0
add('certificate-just-above-integer',[edge])
p=primary(production=100000,exports=40000)
p['pfc'].update(frequency=.5,duration=.5,sef=.107,ratio=.1)
add('CF4-half-up',[p])
p=deepcopy(p);p['pfc']['sef']='.1069999999'
add('CF4-below-half',[p])
p=primary();p['pfc'].update(frequency=1,duration=1,sef=.05,ratio=.121)
add('C2F6-half-up',[p])
p=deepcopy(p);p['pfc']['ratio']='.1209999999'
add('C2F6-below-half',[p])
add('fractional-output-export',[product('decimal-quantity',production='1234.567',exports='12.345',fuels=[fuel('567.89')])])

rng=random.Random(20261111)
for index in range(250):
    production=rng.randint(10000,200000)
    source=primary(production=production,exports=0)
    source['fuels']=[fuel(rng.randint(100,20000)/10,48,56.1,rng.choice([95,98,100])),fuel(rng.randint(0,1000)/10,42.3,73.3)]
    source['anode']['quantity']=production*rng.randint(25,40)/100
    source['anode']['lossRate']=rng.choice([0,5,15.18])
    source['pfc'].update(frequency=rng.randint(0,10000)/10000,duration=rng.randint(1,100)/100,collection=rng.choice([90,95,98,100]))
    inp1=production*3//10;inp2=production*5//10
    source['exportQty']=production-inp1-inp2
    downstreams=[product('A',production=inp1*95//100,exports=inp1*90//100,fuels=[fuel(rng.randint(0,2000))],links=[dict(productId='upstream',quantity=inp1)]),
        product('B',production=inp2*94//100,exports=inp2*88//100,fuels=[fuel(rng.randint(0,2000))],links=[dict(productId='upstream',quantity=inp2)])]
    add(f'seeded-{index:03}',[source,*downstreams],year=rng.choice([2026,2027,2028,2029,2030]),price=rng.randint(5000,10000)/100)

print('{"description":"Independent Python Fraction half-up oracle; synthetic inputs; seed 20261111","cases":[')
print(',\n'.join(json.dumps(case,ensure_ascii=True,separators=(',',':')) for case in cases))
print(']}')
