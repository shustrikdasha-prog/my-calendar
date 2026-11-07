/* v11.8.9: edit actual yield on the cooking card, without a second ingredient debit. */
(function(){
 'use strict';
 const display=n=>String(Math.max(0,Math.round(Number(n)||0)));
 function finishedRows(done){
  return (done?.created||[]).map(id=>(state.ready||[]).find(r=>r.id===id)).filter(Boolean);
 }
 function knownTotal(row){return Math.max(0,Number(portionHistory1187(row).total)||0)}
 function actualTotal(done){
  const rows=finishedRows(done);
  return rows.length?rows.reduce((s,r)=>s+knownTotal(r),0):Math.max(0,Number(done?.count)||0);
 }
 function editFinishedYield(job){
  const done=state.cookDone?.[job.key];
  if(!done){return}
  const rows=finishedRows(done);
  if(!rows.length){alert('У этой партии не найдены готовые порции. Сначала проверь раздел «Готовая еда дома».');return}
  if(rows.length!==(done.created||[]).length){alert('Часть контейнеров из этой партии отсутствует в учёте. Не могу безопасно менять их количество.');return}
  const currently=actualTotal(done);
  const alreadyConsumed=rows.reduce((sum,r)=>sum+actualConsumed1187(r)+(Number(portionHistory1187(r).manualConsumed)||0),0);
  const fridge=rows.find(r=>r.place==='fridge');
  const target=fridge||rows[0];
  popup('Сколько порций получилось?',
   '<p><b>'+escapes(job.recipe.name)+'</b></p>'+
   '<p class="sub">По исходному плану: '+display(job.count)+' · В учёте готовой еды: '+display(currently)+' · В записи о приготовлении: '+display(done.count)+' порц.</p>'+
   '<label>Фактически получилось порций<input id="yield1189" class="field" type="number" min="'+alreadyConsumed+'" max="100" step="1" value="'+display(currently)+'"></label>'+
   '<p class="mini-note">Изменение скорректирует оставшиеся готовые порции. Если число не меняется, записи о приготовлении и готовой еде просто будут синхронизированы. Исходный расход продуктов не изменится. Позднее съеденные порции не прибавляются повторно.</p>'+
   '<button class="btn" id="modalSave" type="button">Сохранить порции</button>',()=>{
    const next=Number(document.getElementById('yield1189').value);
    if(!Number.isInteger(next)||next<alreadyConsumed||next>100){alert('Укажи целое число от '+alreadyConsumed+' до 100.');return false}
    const delta=next-currently;
    if((Number(target.qty)||0)+delta<0){
      alert('Нельзя уменьшить общее количество на '+(-delta)+': в выбранном контейнере осталось только '+target.qty+'. Сначала скорректируй контейнеры в разделе «Готовая еда дома».');
      return false;
    }
    // The historical recipe used the original ingredients for this whole batch.
    // On this first correction preserve its original nutritional denominator.
    if(!Number.isFinite(Number(done.nutritionBasePortions))||Number(done.nutritionBasePortions)<=0){
      done.nutritionBasePortions=Math.max(1,Number(done.count)||Number(job.count)||1);
    }
    // Row histories are saved before any mutations, so an old 2 vs 4 discrepancy
    // changes only done.count and does NOT create two phantom soup portions.
    state.portionYield1187??={};
    for(const row of rows){
      const before=portionHistory1187(row);
      state.portionYield1187[row.id]={...before,total:knownTotal(row)+(row.id===target.id?delta:0)};
    }
    target.qty=Number(target.qty)+delta;
    done.count=next;
    // No write to stock, used, purchaseLog, mealConsumed or meal plans.
    // Retain the recorded frozen count, which may describe already consumed portions.
    save();
    renderAll();
    return true;
   });
 }
 const before=renderPortions;
 renderPortions=function(){
   before();
   const all=batchesForWeek(),host=document.getElementById('portionCards');
   if(!host)return;
   host.querySelectorAll('[data-cook-action]').forEach(button=>{
    const job=all.find(j=>j.key===button.dataset.cookAction);
    if(!job)return;
    const done=state.cookDone?.[job.key],card=button.closest('.prep-meal');
    if(!card||!done)return;
    const count=actualTotal(done),meta=card.querySelector('.tag');
    if(meta){meta.textContent=display(count)+' порц. · факт';meta.title='Первоначальный план: '+job.count+' порц.'}
    const controls=button.parentElement;
    const extra=document.createElement('button');
    extra.type='button';extra.className='btn alt';extra.textContent='Изменить порции';
    extra.setAttribute('aria-label','Указать фактические порции: '+job.recipe.name);
    extra.onclick=()=>editFinishedYield(job);
    controls.appendChild(extra);
   });
   // Sum finished yields rather than the old planned two portions.
   host.querySelectorAll('.prep-day').forEach(day=>{
    const button=day.querySelector('[data-cook-action]'),job=button&&all.find(j=>j.key===button.dataset.cookAction);
    if(!job)return;
    const sameDay=all.filter(x=>x.date===job.date);
    const total=sameDay.reduce((sum,x)=>sum+(state.cookDone?.[x.key]?actualTotal(state.cookDone[x.key]):x.count),0);
    const heading=day.querySelector('h3');
    if(heading)heading.textContent=strDate(job.date)+' · '+display(total)+' порц.';
   });
 };
 document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.8.9');
 renderAll();
})();