import DecimalInteger from 'decimal.js-light';
// Rational arithmetic using arbitrary-size integers, including recurring
// allocation fractions. Works on iOS 13, which has no native BigInt.
// Precision grows with integer operand lengths so numerator and denominator
// remain exact; only the final JSON representation converts to JS numbers.
const Integer=DecimalInteger.clone({precision:40});
const integer=value=>new Integer(value);
function op(a,b,method){
 Integer.set({precision:Math.max(40,a.abs().exponent()+b.abs().exponent()+4,a.abs().exponent()+4,b.abs().exponent()+4)});
 return a[method](b);
}
const gcd=(a,b)=>{a=a.abs();while(!b.isZero()){[a,b]=[b,op(a,b,'mod')];}return a;};
class Decimal {
 constructor(n,den=integer(1)){
  if(den.isZero())throw Error('除数不能为0');
  if(den.isNegative()){n=n.neg();den=den.neg();}
  const g=gcd(n,den);this.n=op(n,g,'idiv');this.d=op(den,g,'idiv');
 }
 add(value){const b=decimal(value);return new Decimal(op(op(this.n,b.d,'mul'),op(b.n,this.d,'mul'),'add'),op(this.d,b.d,'mul'));}
 sub(value){const b=decimal(value);return this.add(new Decimal(b.n.neg(),b.d));}
 mul(value){const b=decimal(value);return new Decimal(op(this.n,b.n,'mul'),op(this.d,b.d,'mul'));}
 div(value){const b=decimal(value);return new Decimal(op(this.n,b.d,'mul'),op(this.d,b.n,'mul'));}
 round(places=0){
  const scale=integer('1e'+places),scaled=op(this.n.abs(),scale,'mul');let whole=op(scaled,this.d,'idiv');
  if(op(op(scaled,this.d,'mod'),integer(2),'mul').gte(this.d))whole=op(whole,integer(1),'add');
  return new Decimal(this.n.isNegative()?whole.neg():whole,scale);
 }
 ceil(){let whole=op(this.n,this.d,'idiv');if(this.n.isPositive()&&!op(this.n,this.d,'mod').isZero())whole=op(whole,integer(1),'add');return whole.toNumber();}
 isPositive(){return this.n.gt(0);}
 isNegative(){return this.n.lt(0);}
 number(){Integer.set({precision:40});return this.n.div(this.d).toNumber();}
}
export function decimal(value){
 if(value instanceof Decimal)return value;
 const match=String(value).match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
 if(!match)throw Error('无效十进制数');
 const [,sign,whole,fraction='',exponent='0']=match,scale=fraction.length-Number(exponent),n=integer((sign==='-'?'-':'')+whole+fraction);
 return scale>=0?new Decimal(n,integer('1e'+scale)):new Decimal(op(n,integer('1e'+(-scale)),'mul'));
}
