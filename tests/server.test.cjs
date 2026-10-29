const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function server() {
  const properties = new Map([['SPREADSHEET_ID', 'test-only']]);
  const rows = [['SBD','Họ và tên','Điền đơn','Đậu'],
    ['X04','Phạm Minh Tuấn','Ban Tư vấn - Hỗ trợ','Ban Truyền thông, Ban Tổ chức sự kiện'],
    ['00123','Nguyễn Văn An','Ban Truyền thông','']];
  let reads = 0;
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => properties.get(k), setProperty: (k,v) => properties.set(k,v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { formatDate: date => date.toISOString().slice(0,10) },
    SpreadsheetApp: { openById: id => { assert.equal(id,'test-only'); return { getSheetByName: name => {
      assert.equal(name,'DanhSach');
      return { getLastRow: () => rows.length, getRange: (r,c,n,w) => {
        assert.deepEqual([r,c,n,w],[1,1,rows.length,4]);
        return { getDisplayValues: () => { reads++; return rows; } };
      } };
    } }; } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../Code.gs'),'utf8'),context);
  return {lookup:p=>JSON.parse(JSON.stringify(context.lookup(p))), rows,properties,reads:()=>reads};
}
const query = {sbd:'X04',name:'Phạm Minh Tuấn'};
test('returns every multi-select choice in D, never C or participant records',()=>{
  const s=server();
  assert.deepEqual(s.lookup(query),{ok:true,found:true,passed:true,departments:['Ban Truyền thông','Ban Tổ chức sự kiện']});
  s.rows[1][3]='Ban Tư vấn - Hỗ trợ';
  assert.deepEqual(s.lookup(query).departments,['Ban Tư vấn - Hỗ trợ']);
  s.rows[1][3]='Ban Truyền thông, Ban Tổ chức sự kiện, Ban Tư vấn - Hỗ trợ';
  assert.equal(s.lookup(query).departments.length,3);
});
test('matches SBD and full name on the same row; keeps zeroes and accents',()=>{
  const s=server();
  assert.equal(s.lookup({sbd:' x04 ',name:' PHẠM   MINH TUẤN '}).found,true);
  assert.equal(s.lookup({sbd:'X04',name:'Phạm Minh Tuấn'.normalize('NFD')}).found,true);
  for(const p of [{sbd:'X04',name:'Nguyễn Văn An'},{sbd:'X04',name:'Pham Minh Tuan'},{sbd:'X04',name:'Phạm Minh'},{sbd:'123',name:'Nguyễn Văn An'}]) {
    assert.deepEqual(s.lookup(p),{ok:true,found:false,message:'Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.'});
  }
  assert.equal(s.lookup({sbd:'00123',name:'Nguyễn Văn An'}).found,true);
});
test('blank D means not passed even when C has applications; next request reads edits',()=>{
  const s=server();
  assert.deepEqual(s.lookup({sbd:'00123',name:'Nguyễn Văn An'}),{ok:true,found:true,passed:false,departments:[]});
  s.rows[1][3]='';
  assert.equal(s.lookup(query).passed,false);
  s.rows[1][3]='Ban Truyền thông';
  assert.deepEqual(s.lookup(query).departments,['Ban Truyền thông']);
});
test('parses all separators, deduplicates and fails closed on unknown choices',()=>{
  const s=server();
  s.rows[1][3]='Ban Truyền thông;\nBan Tổ chức sự kiện, Ban Truyền thông';
  assert.deepEqual(s.lookup(query).departments,['Ban Truyền thông','Ban Tổ chức sự kiện']);
  s.rows[1][3]='Ban Truyền thông, <img src=x onerror=alert(1)>';
  assert.equal(s.lookup(query).code,'SERVER_ERROR');
});
test('invalid input and bot honeypot never read sheet',()=>{
  const s=server();
  for(const p of [null,{}, {sbd:'X04'}, {...query,name:'  '}, {...query,sbd:4}, {...query,sbd:'.*'}, {...query,website:'bot'}]) assert.equal(s.lookup(p).code,'INVALID');
  assert.equal(s.reads(),0);
});
test('duplicate identity and incorrect schema fail closed',()=>{
  const s=server();
  s.rows.push([...s.rows[1]]);
  assert.equal(s.lookup(query).code,'SERVER_ERROR');
  s.rows.pop(); s.rows[0][3]='Wrong';
  assert.equal(s.lookup(query).code,'SERVER_ERROR');
});
test('shared SBD never selects another name or leaks their results',()=>{
  const s=server();
  s.rows.push(['X04','Người Khác','Ban Truyền thông','Ban Tư vấn - Hỗ trợ']);
  assert.deepEqual(s.lookup(query).departments,['Ban Truyền thông','Ban Tổ chức sự kiện']);
});
test('persistent global minute and daily caps stop sheet reads',()=>{
  const s=server();
  for(let i=0;i<60;i++) assert.equal(s.lookup(query).ok,true);
  assert.equal(s.lookup(query).code,'RATE_LIMIT'); assert.equal(s.reads(),60);
  s.properties.set('LOOKUP_QUOTA',JSON.stringify({minute:'old',minuteCount:0,day:new Date().toISOString().slice(0,10),dayCount:1000}));
  assert.equal(s.lookup(query).code,'RATE_LIMIT');
});
