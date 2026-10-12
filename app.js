'use strict';
const KEY='protouch_v02_records';
let records=[],editId=null,receivedRecipe=null,legacyColor='';
const $=id=>document.getElementById(id);
const number=v=>Number(v)||0;
const fmt=n=>Number.isFinite(n)?n.toFixed(3):'—';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const blankRow=()=>({pigment:'',name:'',standard:'',start:'',added:'',linked:true});
const editableRow=r=>({...r,name:r.name||'',linked:r.linked===undefined?number(r.standard)===number(r.start):r.linked});
const pigmentLabel=r=>[r.pigment,r.name].filter(Boolean).join(' ');
const pigmentCell=r=>`<span class="pigment-label"><span>${escapeHTML(r.pigment||'未入力')}</span>${r.name?`<span>${escapeHTML(r.name)}</span>`:''}</span>`;
const blankLayer=()=>({base:'',rows:[blankRow(),blankRow()]});
let layers={base:blankLayer(),pearl:blankLayer()};
function activeKeys(){return $('paintType').value==='threeCoat'?['base','pearl']:['base']}
function recipeLayers(r){return r.paintType==='threeCoat'?[{key:'base',title:'① ベース配合',...r.layers.base},{key:'pearl',title:'② パール配合',...r.layers.pearl}]:[{key:'base',title:'配合',base:r.base,rows:r.rows}]}
function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');records=Array.isArray(a)?a:[]}catch{alert('保存データを読み込めませんでした。バックアップを確認してください。')}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));return true}catch{alert('保存に失敗しました。ストレージ容量やブラウザ設定を確認してください。');return false}}
function metrics(layer){const base=number(layer.base);let sumStart=0,sumAdded=0,sumStd=0;const values=layer.rows.map(r=>{const start=base*number(r.start)/100,final=start+number(r.added);sumStart+=start;sumAdded+=number(r.added);sumStd+=number(r.standard);return {start,final}});return {base,sumStart,sumAdded,sumStd,sumFinal:sumStart+sumAdded,values}}
function drawLayers(){
 $('layers').innerHTML=activeKeys().map(k=>{const l=layers[k];return `<section data-layer="${k}" class="layer"><h2>${$('paintType').value==='threeCoat'?(k==='base'?'① ベース配合':'② パール配合'):'通常配合'}</h2><label>基準量（g）</label><div class="actions" style="margin:0 0 9px">${[25,50,100].map(n=>`<button type="button" data-base="${n}">${n}g</button>`).join('')}</div><input aria-label="${k==='base'?'ベース':'パール'}基準量" class="num" type="number" min="0.01" step="any" inputmode="decimal" data-field="base" value="${escapeHTML(l.base)}" placeholder="25"><p class="hint">開始％は基準量に対する割合です。合計100％未満でも、そのまま計算します。</p><div class="rows">${l.rows.map((r,i)=>`<div class="rowitem"><div class="fields"><div><label for="${k}-${i}-pigment">原色番号</label><input id="${k}-${i}-pigment" data-i="${i}" data-k="pigment" value="${escapeHTML(r.pigment)}" placeholder="例：4303"></div><div><label for="${k}-${i}-name">原色名（任意）</label><input id="${k}-${i}-name" data-i="${i}" data-k="name" value="${escapeHTML(r.name||'')}" placeholder="例：パールB"></div></div><div class="rowgrid2">${[['start','開始％'],['added','追加g'],['standard','メーカー％']].map(([f,label])=>`<div><label for="${k}-${i}-${f}">${label}</label><input id="${k}-${i}-${f}" aria-label="${label}" class="num" type="number" step="any" min="0" inputmode="decimal" data-i="${i}" data-k="${f}" value="${escapeHTML(r[f]??'')}"></div>`).join('')}</div><label class="link-option"><input type="checkbox" data-link="${i}" ${r.linked?'checked':''}>開始％＝メーカー％（一度の入力で両方に反映）</label><div class="actions"><button class="danger" type="button" data-del="${i}">この原色を削除</button></div></div>`).join('')}</div><button data-add type="button" class="full">＋ 原色を追加</button><div class="result"></div></section>`}).join('<hr style="border:0;border-top:2px solid #d6e5ed;margin:24px 0">');calc();
}
function completedTable(l){
 const m=metrics(l);return `<div style="overflow-x:auto"><table><thead><tr><th>原色番号・名前</th><th><span class="ratio-start">開始％</span><span class="ratio-final" hidden>完成配合（％）</span></th></tr></thead><tbody>${l.rows.map((r,i)=>`<tr><td>${pigmentCell(r)}</td><td><span class="ratio-start">${fmt(number(r.start))}</span><span class="ratio-final" hidden>${m.sumFinal>0?fmt(m.values[i].final/m.sumFinal*100):'—'}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function ratioResult(l,title=''){
 const m=metrics(l);return `<h2>${title?title+'・':''}<span class="ratio-start">開始％</span><span class="ratio-final" hidden>完成配合％</span></h2><div class="actions ratio-switch" role="group" aria-label="配合の表示切り替え"><button type="button" data-ratio-view="start" aria-pressed="true">開始％</button><button type="button" data-ratio-view="final" aria-pressed="false">完成配合％</button></div><p class="hint ratio-start">開始％は基準量 ${fmt(m.base)}g に対する入力値です。</p><p class="hint ratio-final" hidden>完成総量 ${fmt(m.sumFinal)}g ／ 全量を100％として換算</p>${completedTable(l)}`;
}
function calc(){for(const k of activeKeys()){const l=layers[k],root=$('layers').querySelector(`[data-layer="${k}"]`),result=root.querySelector('.result'),view=result.querySelector('[data-ratio-view][aria-pressed="true"]')?.dataset.ratioView||'start';result.innerHTML=ratioResult(l);setRatioView(result,view)}}
function setRatioView(result,view){
 result.querySelectorAll('.ratio-start').forEach(el=>el.hidden=view!=='start');
 result.querySelectorAll('.ratio-final').forEach(el=>el.hidden=view!=='final');
 result.querySelectorAll('[data-ratio-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ratioView===view)));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ratio-view]');if(b)setRatioView(b.closest('.result'),b.dataset.ratioView)});
$('layers').addEventListener('input',e=>{
 const t=e.target,k=t.closest('[data-layer]')?.dataset.layer;if(!k)return;
 if(t.dataset.field==='base')layers[k].base=t.value;
 else if(t.dataset.i!==undefined){const r=layers[k].rows[Number(t.dataset.i)],f=t.dataset.k;r[f]=t.value;
 if(r.linked&&(f==='start'||f==='standard')){const other=f==='start'?'standard':'start';r[other]=t.value;t.closest('.rowitem').querySelector(`[data-k="${other}"]`).value=t.value}}
 calc();
});
$('layers').addEventListener('change',e=>{
 const t=e.target;if(t.dataset.link===undefined)return;const k=t.closest('[data-layer]').dataset.layer,r=layers[k].rows[Number(t.dataset.link)];
 if(t.checked&&r.start!==''&&r.standard!==''&&number(r.start)!==number(r.standard)&&!confirm('開始％とメーカー％が異なります。メーカー％を開始％と同じ値に変更して連動しますか？')){t.checked=false;return}
 r.linked=t.checked;if(r.linked){const value=r.start!==''?r.start:r.standard;r.start=value;r.standard=value;const el=t.closest('.rowitem');el.querySelector('[data-k="start"]').value=value;el.querySelector('[data-k="standard"]').value=value;calc()}
});
$('layers').addEventListener('focusin',e=>{if(e.target.type==='number')e.target.select()});
$('layers').addEventListener('click',e=>{const b=e.target.closest('button'),k=b?.closest('[data-layer]')?.dataset.layer;if(!k)return;if(b.dataset.base){layers[k].base=b.dataset.base;drawLayers()}else if(b.hasAttribute('data-add')){layers[k].rows.push(blankRow());drawLayers()}else if(b.dataset.del!==undefined){layers[k].rows.splice(Number(b.dataset.del),1);drawLayers()}});
$('paintType').addEventListener('change',drawLayers);
function addAlias(a={maker:'',code:''}){const el=document.createElement('div');el.className='rowitem';el.innerHTML=`<div class="fields"><div><label>別コードのメーカー</label><input data-alias="maker" placeholder="例：三菱" value="${escapeHTML(a.maker)}"></div><div><label>別カラーコード</label><input data-alias="code" placeholder="例：KBV" value="${escapeHTML(a.code)}"></div></div><div class="actions"><button type="button" class="danger" data-remove-alias>この別コードを削除</button></div>`;$('aliases').append(el)}
$('addAlias').addEventListener('click',()=>addAlias());$('aliases').addEventListener('click',e=>{const b=e.target.closest('[data-remove-alias]');if(b)b.closest('.rowitem').remove()});
function getAliases(){return [...$('aliases').children].map(el=>({maker:el.querySelector('[data-alias="maker"]').value.trim(),code:el.querySelector('[data-alias="code"]').value.trim()})).filter(a=>a.maker||a.code)}
function reset(){editId=null;legacyColor='';['maker','model','code','vehicleType','memo'].forEach(id=>$(id).value='');$('aliases').innerHTML='';$('paintType').value='normal';layers={base:blankLayer(),pearl:blankLayer()};drawLayers();window.scrollTo({top:0,behavior:'smooth'})}
$('clear').addEventListener('click',()=>{if(confirm('入力内容をクリアしますか？ 保存済みデータは消えません。'))reset()});
function saveLayer(l,title){const base=Number(l.base);if(!Number.isFinite(base)||base<=0)throw Error(title+'：基準量は0より大きい数字にしてください。');const rows=l.rows.filter(r=>String(r.pigment).trim()||number(r.standard)||number(r.start)||number(r.added)).map(r=>({pigment:String(r.pigment).trim(),standard:number(r.standard),start:number(r.start),added:number(r.added),name:String(r.name||'').trim(),linked:!!r.linked}));if(!rows.length||rows.some(r=>!r.pigment))throw Error(title+'：原色番号を入力してください。');if(rows.some(r=>[r.standard,r.start,r.added].some(n=>!Number.isFinite(n)||n<0)))throw Error(title+'：負の数値は使用できません。');if(metrics({base,rows}).sumFinal<=0)throw Error(title+'：完成総量が0以下です。');if(new Set(rows.map(r=>r.pigment)).size!==rows.length)throw Error(title+'：同じ原色番号は1行にまとめてください。');return {base,rows}}
$('save').addEventListener('click',()=>{try{const aliases=getAliases();if(aliases.some(a=>!a.code))throw Error('別カラーコードを入力してください。');const base=saveLayer(layers.base,$('paintType').value==='threeCoat'?'ベース':'配合');const rec={id:editId||uid(),updated:new Date().toISOString(),maker:$('maker').value.trim(),model:$('model').value.trim(),code:$('code').value.trim(),vehicleType:$('vehicleType').value.trim(),color:legacyColor,memo:$('memo').value.trim(),aliases,paintType:$('paintType').value,...base};if(rec.paintType==='threeCoat')rec.layers={base,pearl:saveLayer(layers.pearl,'パール')};const previous=records;records=records.some(r=>r.id===rec.id)?records.map(r=>r.id===rec.id?rec:r):[rec,...records];if(persist()){editId=rec.id;renderSaved();alert('保存しました！')}else records=previous}catch(e){alert(e.message)}});
function load(id){const r=records.find(x=>x.id===id);if(!r)return;editId=r.id;legacyColor=r.color||'';['maker','model','code','vehicleType','memo'].forEach(k=>$(k).value=r[k]||'');$('aliases').innerHTML='';(r.aliases||[]).forEach(addAlias);$('paintType').value=r.paintType==='threeCoat'?'threeCoat':'normal';layers={base:blankLayer(),pearl:blankLayer()};for(const l of recipeLayers(r))layers[l.key]={base:l.base,rows:l.rows.map(editableRow)};drawLayers();window.scrollTo({top:0,behavior:'smooth'})}
function recipeDetails(r){return recipeLayers(r).map(l=>`<div class="result">${ratioResult(l,l.title)}</div>`).join('')}
function aliasesText(r){return (r.aliases||[]).map(a=>[a.maker,a.code].filter(Boolean).join(' ')).join(' / ')}
function renderSaved(){const q=$('search').value.trim().toLowerCase(),list=records.filter(r=>[r.maker,r.model,r.code,r.vehicleType,r.color,r.memo,aliasesText(r),...recipeLayers(r).flatMap(l=>l.rows.map(pigmentLabel))].join(' ').toLowerCase().includes(q));$('saved').innerHTML=list.length?'':'<p class="hint">該当する保存データはありません。</p>';list.forEach(r=>{const el=document.createElement('div');el.className='saved';el.innerHTML=`<strong>${escapeHTML([r.maker,r.model,r.code].filter(Boolean).join(' / ')||'名称未設定')}</strong><small>${escapeHTML(r.vehicleType||'')} ${r.paintType==='threeCoat'?'｜3コートパール':''}　${escapeHTML((r.updated||'').slice(0,10))}</small>${aliasesText(r)?`<p class="hint">同色コード：${escapeHTML(aliasesText(r))}</p>`:''}${r.color?`<p class="hint">旧カラー名：${escapeHTML(r.color)}</p>`:''}${recipeDetails(r)}<div class="actions"><button class="primary" data-load="${escapeHTML(r.id)}">呼び出す・編集</button><button data-share="${escapeHTML(r.id)}">LINEで共有</button><button class="danger" data-delete="${escapeHTML(r.id)}">削除</button></div>`;$('saved').append(el)})}
$('search').addEventListener('input',renderSaved);$('saved').addEventListener('click',e=>{const l=e.target.closest('[data-load]'),d=e.target.closest('[data-delete]'),sh=e.target.closest('[data-share]');if(l)load(l.dataset.load);if(sh)shareRecipe(sh.dataset.share);if(d&&confirm('この保存データを削除しますか？')){const previous=records;records=records.filter(x=>x.id!==d.dataset.delete);if(persist()){if(editId===d.dataset.delete)editId=null;renderSaved()}else records=previous}});

function validateRecipe(r,maxRows=80){
 for(const k of ['maker','model','code','color','memo','vehicleType'])if(r[k]!==undefined&&(typeof r[k]!=='string'||r[k].length>2000))throw Error('車両情報が不正です');
 if(r.paintType!==undefined&&!['normal','threeCoat'].includes(r.paintType))throw Error('塗装タイプが不正です');
 if(r.aliases!==undefined&&(!Array.isArray(r.aliases)||r.aliases.length>1000||r.aliases.some(a=>!a||typeof a.code!=='string'||!a.code.trim()||a.code.length>2000||typeof a.maker!=='string'||a.maker.length>2000)))throw Error('別カラーコードが不正です');
 if(r.paintType==='threeCoat'&&(!r.layers||!r.layers.base||!r.layers.pearl))throw Error('ベース・パールの配合がありません');
 const all=[{base:r.base,rows:r.rows},...(r.paintType==='threeCoat'?[r.layers.base,r.layers.pearl]:[])];
 for(const l of all){if(!Array.isArray(l.rows)||!l.rows.length||l.rows.length>maxRows||!(Number(l.base)>0)||!Number.isFinite(Number(l.base)))throw Error('配合情報が不正です');
 for(const x of l.rows)if(!x||typeof x.pigment!=='string'||!x.pigment.trim()||[x.standard,x.start,x.added].some(v=>!Number.isFinite(Number(v))||Number(v)<0))throw Error('原色のデータが不正です');
 for(const x of l.rows){if(x.name!==undefined&&(typeof x.name!=='string'||x.name.length>2000))throw Error('原色名が不正です');if(x.linked!==undefined&&typeof x.linked!=='boolean')throw Error('連動設定が不正です');}}

 return r;
}
function encodeRecipe(rec){const data={...rec,v:2};delete data.id;delete data.updated;const bytes=new TextEncoder().encode(JSON.stringify(data));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeRecipe(encoded){if(!encoded||encoded.length>32000)throw Error('リンクのデータが大きすぎます');const binary=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-encoded.length%4)%4));const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));if(![1,2].includes(data.v))throw Error('レシピの形式が違います');return validateRecipe(data)}
// Export as a real file. iOS PWA supports native share sheet when available.
function backupPayload(){return JSON.stringify({app:'protouch-v02',formatVersion:3,exported:new Date().toISOString(),records},null,2)}
$('export').addEventListener('click',async()=>{
 const fileName='elite_choshoku_backup_'+new Date().toISOString().slice(0,10)+'.json';
 const content=backupPayload();const blob=new Blob([content],{type:'application/json'});
 const status=$('backupStatus');status.textContent=`${records.length}件のバックアップを準備しました。`;
 try{
  const file=new File([blob],fileName,{type:'application/json'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:'えりーと調色 バックアップ'});status.textContent='共有メニューから「ファイルに保存」を選び、保存先を確認してください。';return}
   catch(e){if(e.name==='AbortError'){status.textContent='保存操作をキャンセルしました。';return}}
  }
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='バックアップファイルを書き出しました。「ファイル」アプリのダウンロード先も確認してください。';
 }catch(e){alert('バックアップに失敗しました：'+e.message)}
});
$('importBtn').addEventListener('click',()=>$('importFile').click());
function validateBackup(data){
 if(!data||data.app!=='protouch-v02'||!Array.isArray(data.records)||data.records.length>100000)throw Error('えりーと調色のバックアップ形式ではありません');
 const ids=new Set();
 for(const r of data.records){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('レシピ情報が不正です');
  ids.add(r.id);validateRecipe(r,1000);
 }
 return data.records;
}
$('importFile').addEventListener('change',async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  if(f.size>20*1024*1024)throw Error('ファイルが大きすぎます（上限20MB）');
  const incoming=validateBackup(JSON.parse(await f.text()));
  const existing=new Set(records.map(r=>r.id));const replaced=incoming.filter(r=>existing.has(r.id)).length;
  if(!confirm(`バックアップ：${incoming.length}件\n新規追加：${incoming.length-replaced}件\n同一ID更新：${replaced}件\n\n現在の${records.length}件は削除しません。復元しますか？`))return;
  const previous=records;
  const merged=new Map(records.map(r=>[r.id,r]));incoming.forEach(r=>merged.set(r.id,r));records=[...merged.values()];
  if(persist()){$('backupStatus').textContent=`復元完了：${incoming.length-replaced}件追加、${replaced}件更新。合計${records.length}件。`;renderSaved();alert('復元が完了しました！')}
  else records=previous;
 }catch(err){alert('読み込めませんでした：'+err.message)}finally{e.target.value=''}
});
async function shareRecipe(id){
 const r=records.find(x=>x.id===id);if(!r)return;
 const url=new URL('./',location.href);url.hash='recipe='+encodeRecipe(r);
 const link=url.href;
 if(link.length>7000&&!confirm('この配合は共有リンクが長く、LINEなどで開けない場合があります。続けますか？'))return;
 const title='えりーと調色：'+([r.maker,r.model,r.code].filter(Boolean).join(' / ')||'調色レシピ');
 try{
   if(navigator.share){await navigator.share({title,text:'調色レシピを共有します。',url:link});return}
 }catch(e){if(e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(link);alert('共有リンクをコピーしました。LINEのトークに貼り付けて送ってください。')}
 catch(e){prompt('このリンクをコピーしてLINEで送ってください',link)}
}

function receiveFromLink(){const match=location.hash.match(/^#recipe=(.+)$/);if(!match)return;try{const r=decodeRecipe(match[1]);receivedRecipe=r;$('receivedDetails').innerHTML=`<p><strong>${escapeHTML([r.maker,r.model,r.code,r.vehicleType].filter(Boolean).join(' / ')||'名称未設定')}</strong></p><p class="hint">同色コード：${escapeHTML(aliasesText(r))}</p>${recipeDetails(r)}<p class="hint">${escapeHTML(r.memo||'')}</p>`;$('received').hidden=false;setTimeout(()=>$('received').scrollIntoView({behavior:'smooth',block:'start'}),150)}catch(e){alert('共有リンクを読み込めませんでした：'+e.message)}}
$('receiveSave').addEventListener('click',()=>{if(!receivedRecipe)return;const r=receivedRecipe;if(records.some(x=>x.maker===r.maker&&x.model===r.model&&x.code===r.code&&JSON.stringify(recipeLayers(x))===JSON.stringify(recipeLayers(r)))&&!confirm('同じ配合が保存されている可能性があります。追加で保存しますか？'))return;const rec={...structuredClone(r),id:uid(),updated:new Date().toISOString()};delete rec.v;records.unshift(rec);if(persist()){renderSaved();alert('自分の配合に保存しました！');dismissReceived()}else records.shift()});
function dismissReceived(){receivedRecipe=null;$('received').hidden=true;history.replaceState(null,'',location.pathname+location.search)}
$('receiveDismiss').addEventListener('click',dismissReceived);window.addEventListener('hashchange',receiveFromLink);
read();reset();renderSaved();receiveFromLink();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});

