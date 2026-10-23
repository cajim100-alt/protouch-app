const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const recipe={v:2,maker:'日産',model:'キャラバン',code:'KBY',vehicleType:'E26',color:'',memo:'テスト用',base:25,rows:[{pigment:'4303',name:'パールB',standard:100,start:100,added:2.5}]};
const encode=r=>Buffer.from(JSON.stringify(r)).toString('base64url');
function open(hash='',saved=[]){
 const dom=new JSDOM(html,{url:'https://example.com/protouch-app/'+hash,runScripts:'outside-only'}),w=dom.window;
 w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;
 w.localStorage.setItem('protouch_v02_records',JSON.stringify(saved));
 vm.runInContext(source,dom.getInternalVMContext());return {dom,w,$:id=>w.document.getElementById(id)};
}
test('shared recipe is the first visible screen on initial navigation without saving',()=>{
 const saved=[{...recipe,id:'own',code:'OTHER'}],{dom,w,$}=open('#recipe='+encode(recipe),saved);
 assert.equal($('received').hidden,false);assert.ok(w.document.body.classList.contains('shared-preview'));
 assert.equal(w.document.querySelector('main>section').id,'received');assert.ok($('receivedDetails').textContent.includes('日産 / キャラバン / KBY / E26'));assert.ok($('receivedDetails').textContent.includes('パールB'));assert.equal($('receiveSave').disabled,false);
 assert.deepEqual(JSON.parse(w.localStorage.getItem('protouch_v02_records')),saved);
 assert.ok(w.document.querySelector('[data-ratio-view="start"]').getAttribute('aria-pressed')==='true');
 $('receiveSave').click();const result=JSON.parse(w.localStorage.getItem('protouch_v02_records'));assert.equal(result.length,2);assert.equal(result[0].code,'KBY');assert.equal(result[1].id,'own');assert.equal($('received').hidden,true);assert.equal(w.location.hash,'');dom.window.close();
});
test('old v1 and versionless recipe links keep their validated format compatible',()=>{
 for(const v of [1,undefined]){const r={...recipe};if(v===undefined)delete r.v;else r.v=v;
 const {dom,$}=open('#recipe='+encode(r));assert.equal($('receiveSave').disabled,false);assert.ok($('receivedDetails').textContent.includes('KBY'));dom.window.close()}
});
test('three-coat layers appear consecutively and remain switchable',()=>{
 const r={...recipe,code:'070',paintType:'threeCoat',layers:{base:{base:25,rows:recipe.rows},pearl:{base:50,rows:[{...recipe.rows[0],pigment:'100'}]}}};
 const {dom,$}=open('#recipe='+encode(r)),text=$('receivedDetails').textContent;
 assert.ok(text.indexOf('① ベース配合')<text.indexOf('② パール配合'));
 const result=$('receivedDetails').querySelector('.result');result.querySelector('[data-ratio-view="final"]').click();assert.equal(result.querySelector('.ratio-final').hidden,false);dom.window.close();
});
test('invalid, empty and unsupported links show an inline error without saving',()=>{
 for(const payload of ['', 'broken',encode({...recipe,v:999}),encode({...recipe,rows:[{...recipe.rows[0],added:-1}]})]){
 const {dom,w,$}=open('#recipe='+payload);assert.equal($('received').hidden,false);assert.ok($('receivedDetails').querySelector('[role="alert"]'));assert.equal($('receiveSave').disabled,true);assert.equal(w.localStorage.getItem('protouch_v02_records'),'[]');dom.window.close()}
});
test('fragment changes, restored pages, and closing the preview work',()=>{
 const {dom,w,$}=open();assert.equal($('received').hidden,true);
 w.location.hash='recipe='+encode(recipe);w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.ok($('receivedDetails').textContent.includes('KBY'));
 w.location.hash='recipe='+encode({...recipe,code:'SECOND'});w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));assert.ok($('receivedDetails').textContent.includes('SECOND'));
 $('receiveDismiss').click();assert.equal($('received').hidden,true);assert.equal(w.document.body.classList.contains('shared-preview'),false);assert.equal(w.location.hash,'');assert.equal(w.localStorage.getItem('protouch_v02_records'),'[]');dom.window.close();
});
test('a broken saved list cannot block the incoming recipe',()=>{
 const {dom,w,$}=open('#recipe='+encode(recipe),[{id:'broken',base:25}]);assert.equal($('receiveSave').disabled,false);assert.ok($('receivedDetails').textContent.includes('KBY'));assert.ok($('saved').textContent.includes('元の保存データは変更していません'));dom.window.close();
});
test('old backups validate and shared URL text is escaped',()=>{
 const {dom,w,$}=open('#recipe='+encode({...recipe,memo:'<img src=x onerror=alert(1)>'}));assert.equal($('receivedDetails').querySelector('img'),null);w.backup={app:'protouch-v02',records:[{...recipe,id:'old'}]};assert.equal(w.eval('validateBackup(backup).length'),1);dom.window.close();
});
