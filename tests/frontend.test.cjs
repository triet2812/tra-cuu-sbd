const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function page() {
  const elements={};
  function element(){return {hidden:true,value:'',textContent:'',dataset:{},children:[],listeners:{},setAttribute(){},focus(){},replaceChildren(...v){this.children=v;},addEventListener(k,fn){this.listeners[k]=fn;}};}
  for(const id of ['lookup-form','submit','message','result','headline','outcome','interview-notice','sbd','name','website']) elements[id]=element();
  elements.sbd.value='X04';elements.name.value='Phạm Minh Tuấn';
  let success,fail;
  const rpc={withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){fail=fn;return this;},lookup(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],{
    document:{getElementById:id=>elements[id],createElement:element,createTextNode:text=>({textContent:text})},google:{script:{run:rpc}}
  });
  return {elements,submit(){elements['lookup-form'].listeners.submit({preventDefault(){}});},reply:r=>success(r),fail:()=>fail()};
}
test('congratulations and red notice only appear after a passing response',()=>{
  const p=page();p.submit();
  assert.equal(p.elements.result.hidden,true);
  p.reply({ok:true,found:true,passed:true,departments:['Ban Truyền thông','Ban Tổ chức sự kiện']});
  assert.equal(p.elements['interview-notice'].hidden,false);
  assert.equal(p.elements.outcome.textContent,'Bạn đã đậu kết quả vòng đơn của Ban Truyền thông, Ban Tổ chức sự kiện.');
  assert.match(p.elements.headline.children.map(n=>n.textContent).join(''),/CHÚC MỪNG/);
  p.elements['lookup-form'].listeners.input();
  assert.equal(p.elements.result.hidden,true);
  assert.doesNotMatch(p.elements.headline.children.map(n=>n.textContent).join(''),/CHÚC MỪNG/);
});
test('blank D never shows congratulations or interview notice',()=>{
  const p=page();p.submit();p.reply({ok:true,found:true,passed:false,departments:[]});
  assert.match(p.elements.outcome.textContent,/chưa vượt qua/);
  assert.equal(p.elements['interview-notice'].hidden,true);
  assert.doesNotMatch(p.elements.headline.children.map(n=>n.textContent).join(''),/CHÚC MỪNG/);
});
test('not found and connection errors leave results hidden and enable retry',()=>{
  for(const error of [false,true]) {
    const p=page();p.submit();
    if(error) p.fail();else p.reply({ok:true,found:false,message:'Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.'});
    assert.equal(p.elements.result.hidden,true);assert.equal(p.elements.submit.disabled,false);
    assert.match(p.elements.message.textContent,error?/Kết nối/:/Không tìm thấy/);
  }
});
test('response for edited input is discarded',()=>{
  const p=page();p.submit();p.elements.name.value='Người khác';
  p.reply({ok:true,found:true,passed:true,departments:['Ban Truyền thông']});
  assert.equal(p.elements.result.hidden,true);
});
