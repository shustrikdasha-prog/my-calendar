/* 11.10.8 · Cooking reality reconciler.
   Never treats a missing checkbox as a fact. Show a missed-day prompt and
   apply automatic, reversible date/meal/shopping changes after a single choice.
   Early cooking uses the existing cook dialog, which records actual portions. */
(function(){
'use strict';
const boxId='cookingReality1211';
const safe=x=>escapes(String(x??''));
const records=()=>{state.cookingReality1211??={};return state.cookingReality1211};
const previousRender=renderAll;
const originalCook=cookJob;
let pendingEarly=null,working=false;
const wk=()=>weekStart(todayISO()),today=()=>todayISO();
function scheduled(week){
 const plan=state.smartBatches1204?.[week]?.jobs;
 return Array.isArray(plan)?plan:[];
}
function mealAt(date,slot){
 const days=state.weeks?.[weekStart(date)]?.days||[];
 return days.find(d=>d.date===date)?.meals?.[slot];
}
function protectedMeal(date,slot){
 const key='meal:'+date+':'+slot;
 return !!(isDone(key)||state.mealConsumed?.[key]||state.actualMeals?.[date+':'+slot]);
}
function cookingCompleted(week,p){
 const direct='cook:'+p.date+':'+p.id;
 if(state.cookDone?.[direct])return true;
 const actual=records()[week]?.early?.[p.id];
 return !!(actual&&state.cookDone?.['cook:'+actual+':'+p.id]);
}
function snapshots(week){
 const r=records();r[week]??={};
 r[week].undo??=[];
 const saved={date:today(),week:clone(state.weeks?.[week]||null),
  plan:clone(state.smartBatches1204?.[week]||null),
  plannedDays:clone(state.smartPlans1204?.[week]||null),
  shopping:clone(state.shopDates?.[week]||null),
  early:clone(r[week].early||{}),actionLog:clone(r[week].actionLog||[])};
 r[week].undo.push(saved);
 if(r[week].undo.length>5)r[week].undo.shift();
}
function adjustShopping(week,oldDate,newDate){
 if(!state.shopDates?.[week])return;
 const o=state.shopDates[week];
 for(let i=0;i<2;i++){
  const key=i?'second':'first';
  if(o[key]!==oldDate)continue;
  if(isDone('shopping-trip:'+week+':'+i))continue;
  if(Object.keys(state.purchaseLog||{}).some(k=>k.startsWith(week+'|'+i+'|')))continue;
  // Leave the trip intact if any other batch is still scheduled for that date.
  if(scheduled(week).some(j=>j.date===oldDate&&!cookingCompleted(week,j)))continue;
  o[key]=newDate;
 }
}
function syncDays(week){
 if(!state.smartPlans1204?.[week])return;
 state.smartPlans1204[week].cookingDates=[...new Set(scheduled(week).map(j=>j.date))].sort();
}
function viableReady(date,used){
 const rows=(state.ready||[]).filter(r=>Number(r.qty)>0&&r.recipeId&&recipes()[r.recipeId]&&(used[r.id]||0)<Number(r.qty));
 return rows.find(r=>{
  if(r.place==='freezer')return true;
  if(r.place!=='fridge'||!r.date)return false;
  const age=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(r.date+'T12:00:00Z'))/86400000);
  return age>=0&&age<=2;
 });
}
function replacementFor(date,used,excluded){
 const row=viableReady(date,used);
 if(row&&row.recipeId!==excluded){
  used[row.id]=(used[row.id]||0)+1;
  const r=recipes()[row.recipeId];
  return {meal:{title:r.name,recipeId:r.id,readyId:row.id,kcal:0},detail:'готовая порция: '+r.name};
 }
 // Quick dishes are suggestions only; ingredients are recomputed into shopping
 // and are not silently debited or marked as consumed.
 const quick=Object.values(recipes()).filter(r=>r.id&&r.id!==excluded&&r.steps?.length&&r.ingredients?.length&&!state.dislikedRecipes?.[r.id]&&safeQuickMinutes(r)<=15&&
  !/пудинг|десерт|сырник|каша|запеканк|йогурт|молоч|творог/i.test(r.name));
 quick.sort((a,b)=>Number(hasIngredients(b))-Number(hasIngredients(a))||
  (Number(used[a.id]||0)-Number(used[b.id]||0))*100||
  a.name.localeCompare(b.name,'ru'));
 const unused=quick.find(r=>!used[r.id]),r=unused||quick[0];
 if(r){used[r.id]=(used[r.id]||0)+1;return {meal:{title:r.name,recipeId:r.id,kcal:0},detail:'быстрый вариант: '+r.name+(!hasIngredients(r)?' (проверь покупки)':'')}}

 return null;
}
function postpone(week,from,automatic=false){
 const list=scheduled(week).filter(p=>p.date===from&&!cookingCompleted(week,p));
 if(!list.length)return false;
 const tomorrow=addDays(from,1);
 const target=tomorrow<today()?today():tomorrow;
 if(weekStart(target)!==week)return false;
 const needed=[],used={};
 for(const p of list)for(const u of p.uses||[]){
  // Dinner can follow the cooking session; lunch on the same day cannot
  // safely be assumed available before cooking. Handle it as a conflict.
  if((u.date>target||(u.date===target&&u.slot!==1))||protectedMeal(u.date,u.slot)||u.date<today())continue;
  const old=mealAt(u.date,u.slot);
  if(old?.recipeId!==p.id)continue;
  const next=replacementFor(u.date,used,p.id);
  if(!next)return {error:'Нет подходящего готового или быстрого блюда на '+strDate(u.date)+'. Замена меню требует ручного выбора.',canPostpone:true};
  needed.push({date:u.date,slot:u.slot,previous:clone(old),next});
 }
 if(!automatic){
  const lines=list.map(p=>'• '+recipes()[p.id]?.name).join('\n');
  const swaps=needed.map(n=>'• '+strDate(n.date)+', '+slotNames[n.slot]+': '+n.next.detail).join('\n');
  const cancelled=list.filter(p=>(p.uses||[]).every(u=>
   needed.some(n=>n.date===u.date&&n.slot===u.slot)));
  const cancelText=cancelled.length?'\n\nЭти партии больше не нужны по оставшемуся меню и будут сняты с готовки: '+cancelled.map(j=>recipes()[j.id]?.name||j.id).join(', ')+'.':'';
  if(!confirm('Перенести запланированную готовку '+strDate(from)+' → '+strDate(target)+'?\n\n'+lines+
   (swaps?'\n\nДо новой готовки предлагаются замены:\n'+swaps:'')+cancelText+
   '\n\nРеальные запасы и отметки съеденного не изменятся. Последний перенос можно отменить.'))return false;
 }
 snapshots(week);
 const r=records();r[week].actionLog??=[];
 for(const n of needed){
  const meal=mealAt(n.date,n.slot);
  if(!meal||protectedMeal(n.date,n.slot))continue;
  Object.assign(meal,clone(n.next.meal));
  // Remove keys left over from the previous meal, especially readyId/outside.
  for(const k of Object.keys(meal))if(!(k in n.next.meal))delete meal[k];
 }
 for(const p of list){p.date=target;p.uses=(p.uses||[]).filter(u=>mealAt(u.date,u.slot)?.recipeId===p.id);}
 // If no planned meals still need a batch, do not schedule unnecessary cooking.
 state.smartBatches1204[week].jobs=scheduled(week).filter(p=>p.uses?.length||cookingCompleted(week,p));
 syncDays(week);adjustShopping(week,from,target);
 r[week].actionLog.unshift({kind:'deferred',date:today(),from,to:target,automatic,changes:needed.length});
 if(r[week].actionLog.length>7)r[week].actionLog.length=7;
 save();return true;
}
function undoLatest(week){
 const rec=records()[week],s=rec?.undo?.at(-1);
 if(!s)return;
 if(!confirm('Вернуть меню и даты готовки до последнего переноса?\n\nГотовые порции и отметки приёма пищи не изменятся.'))return;
 // Stop if the user has eaten or cooked any of the affected slots since the snapshot.
 const old=state.weeks?.[week],before=s.week;
 for(let i=0;i<7;i++)for(const slot of [1,3]){
  const a=old?.days?.[i]?.meals?.[slot],b=before?.days?.[i]?.meals?.[slot];
  if(JSON.stringify(a)!==JSON.stringify(b)&&protectedMeal(addDays(week,i),slot)){
   alert('Одно из изменённых блюд уже отмечено съеденным. Автоматический откат заблокирован.');return;
  }
 }
 if(s.plan?.jobs?.some(j=>state.cookDone?.['cook:'+j.date+':'+j.id])||
    scheduled(week).some(j=>state.cookDone?.['cook:'+j.date+':'+j.id])){
  alert('После переноса была отмечена готовка. Для безопасности нельзя откатить её расписание автоматически.');return;
 }
 if(s.week)state.weeks[week]=clone(s.week);else delete state.weeks[week];
 if(s.plan)state.smartBatches1204[week]=clone(s.plan);else delete state.smartBatches1204[week];
 if(s.plannedDays)state.smartPlans1204[week]=clone(s.plannedDays);else delete state.smartPlans1204[week];
 if(s.shopping)state.shopDates[week]=clone(s.shopping);else delete state.shopDates[week];
 rec.early=clone(s.early);rec.actionLog=clone(s.actionLog);rec.undo.pop();
 save();renderAll();
}
function finishEarly(){
 if(!pendingEarly)return false;
 const p=pendingEarly;
 if(!state.cookDone?.[p.actualKey])return false;
 const job=scheduled(p.week).find(j=>j.id===p.id&&j.date===p.old);
 if(!job){pendingEarly=null;return false}
 snapshots(p.week);
 job.date=p.date;
 records()[p.week].early??={};records()[p.week].early[p.id]=p.date;
 records()[p.week].actionLog??=[];
 records()[p.week].actionLog.unshift({kind:'early',from:p.old,to:p.date,name:recipes()[p.id]?.name});
 syncDays(p.week);adjustShopping(p.week,p.old,p.date);
 pendingEarly=null;
 save();return true;
}
function earlyCook(week,job){
 const date=today();
 if(job.date<=date||cookingCompleted(week,job))return;
 const r=recipes()[job.id];if(!r)return;
 const actual={date,id:job.id,recipe:r,uses:job.uses||[],count:job.count||job.uses?.length||1,
  freeze:job.freeze||0,key:'cook:'+date+':'+job.id};
 if(state.cookDone?.[actual.key]){alert('Эта готовка уже отмечена.');return}
 pendingEarly={week,id:job.id,old:job.date,date,actualKey:actual.key};
 originalCook(actual);
}
function show(){
 const section=document.getElementById('calendar'),todaySection=document.getElementById('today');
 if(!section||!todaySection)return;
 document.querySelectorAll('.cooking-reality1211').forEach(e=>e.remove());
 const week=wk(),now=today(),jobs=scheduled(week);
 if(!jobs.length)return;
 const pending=jobs.filter(j=>!cookingCompleted(week,j)&&j.date<=now);
 const missed=pending.filter(j=>j.date<now);
 const todayJobs=pending.filter(j=>j.date===now);
 const next=jobs.filter(j=>!cookingCompleted(week,j)&&j.date>now).sort((a,b)=>a.date.localeCompare(b.date));
 const history=records()[week]?.actionLog?.[0];
 if(!pending.length&&!next.length&&!history)return;
 const root=document.createElement('section');
 root.className='cooking-reality1211';root.id=boxId;
 const missedDays=[...new Set(missed.map(j=>j.date))];
 const cookingLabels=x=>x.map(j=>safe(recipes()[j.id]?.name||j.id)).join(', ');
 root.innerHTML='<div class="cr-heading1211"><b>Готовка по факту</b><span>Меню подстраивается под твой день</span></div>'+
 (missedDays.length?'<div class="cr-info1211"><strong>Не отмечена готовка: '+missedDays.map(strDate).join(', ')+'</strong><p>Отсутствие отметки не означает, что блюдо не приготовлено. Если действительно не готовила, перенесём блюда и закупки на следующий день.</p>'+
 missedDays.map(d=>'<button type="button" data-cr-skip="'+d+'">Не готовила '+safe(strDate(d))+' · перестроить план</button>').join('')+'</div>':'')+
 (todayJobs.length?'<div class="cr-info1211"><strong>Сегодня: '+cookingLabels(todayJobs)+'</strong><p>Если не готовишь сегодня, выбери перенос. Изменения в еде будут показаны до сохранения.</p><button type="button" data-cr-skip="'+now+'">Сегодня не готовлю →</button></div>':'')+
 (next.length?'<div class="cr-info1211"><strong>Если уже приготовила раньше</strong><p>Укажи фактическое количество порций через обычную отметку готовки — холодильник, покупки и даты обновятся по факту.</p>'+
 next.slice(0,4).map(j=>'<button type="button" class="cr-secondary1211" data-cr-early="'+safe(j.id)+'" data-cr-day="'+safe(j.date)+'">'+safe(recipes()[j.id]?.name||j.id)+' · приготовила раньше</button>').join('')+'</div>':'')+
 (history?'<p class="cr-history1211">'+(history.kind==='deferred'?'Перенесено: '+safe(strDate(history.from))+' → '+safe(strDate(history.to)):'Приготовлено раньше: '+safe(history.name||''))+'</p>':'')+
 (records()[week]?.undo?.length?'<button type="button" class="cr-undo1211">Отменить последний перенос</button>':'');
 const calendarRoot=document.getElementById('weekOverview1203');
 section.insertBefore(root,calendarRoot||section.firstChild);
 root.querySelectorAll('[data-cr-skip]').forEach(btn=>btn.onclick=()=>{
  const v=postpone(week,btn.dataset.crSkip);
  if(v&&v.error)alert(v.error);
  if(v===true)renderAll();
 });
 root.querySelectorAll('[data-cr-early]').forEach(btn=>btn.onclick=()=>{
  const j=next.find(j=>j.id===btn.dataset.crEarly&&j.date===btn.dataset.crDay);
  if(j)earlyCook(week,j);
 });
 root.querySelector('.cr-undo1211')?.addEventListener('click',()=>undoLatest(week));
 // One compact entry point on Today, no duplicate long panels.
 const mini=document.createElement('div');mini.className='cooking-reality1211 cr-today1211';
 mini.innerHTML='<b>Готовка: '+(missed.length?'есть неотмеченная готовка':todayJobs.length?'запланирована сегодня':'ближайшая '+(next[0]?strDate(next[0].date):'проверена'))+'</b><button type="button">Изменить план →</button>';
 const dashboard=document.getElementById('dashboard1198');
 if(dashboard)dashboard.insertAdjacentElement('afterend',mini);else todaySection.insertBefore(mini,todaySection.firstChild);
 mini.querySelector('button').onclick=()=>{document.querySelector('[data-tab="calendar"]')?.click();document.getElementById(boxId)?.scrollIntoView({behavior:'smooth',block:'start'})};
}
renderAll=function(){
 if(!working){working=true;try{finishEarly()}catch(e){console.error('Cooking reality update:',e)}finally{working=false}}
 previousRender();show();
};
show();
})();