import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {xlsx,pdf} from '../browser/files.mjs';
const files=unzipSync(xlsx([{name:'核算摘要',rows:[['指标','数值'],['SEE',1.6981],['内容','<中文>&=1+1']]}]));
const sheet=strFromU8(files['xl/worksheets/sheet1.xml']);assert.ok(sheet.includes('<v>1.6981</v>'));assert.ok(sheet.includes('&lt;中文&gt;&amp;=1+1'));assert.ok(!sheet.includes('<f>'));
const bytes=pdf([{heading:true,text:'CBAM 碳核算报告'},...Array.from({length:100},(_,i)=>'排放数据 '+i)]);
const text=new TextDecoder().decode(bytes);assert.ok(text.startsWith('%PDF-1.4'));assert.ok(text.endsWith('%%EOF'));
const start=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(bytes.slice(start,start+4)),'xref');assert.ok(text.includes('/Count 3'));
console.log('PASS: browser XLSX ZIP/XML/numeric cells/formula safety and PDF pagination/xref.');
