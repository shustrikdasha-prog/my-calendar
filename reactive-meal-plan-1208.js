/* 11.10.8 · reactive meal prep. Detect missed batches, offer one-tap safe replan,
   record early batches on actual day; never assume an unchecked batch was definitely not cooked. */
(function(){
'use strict';
const esc=s=>escapes(String(s??''));
const WEEKEND=w=>addDays(w,6);
const keyFor=(d,id)=>'cook:'+d+':'+id;
const mealKeyOf=(d,s)=>'meal:'+d+':'+s;
const getWeekIfExists=w=>state.weeks?.[w]||null;
const dayBy=(w,d)=>(getWeekIfExists(w)?.days||[]).find(x=>x.date===d);
const plans=w=>(state.smartBatches1204?.[w]?.jobs||[]);
const pending=()=>Array.isArray(state.postponedMeals1208)?state.postponedMeals1208:[];
const noteId=(w,j)=>w+'|'+j.id+'|'+j.date;
const finished=(j)=>!!state.cookDone?.[keyFor(j.date,j.id)];
let autoBusy=false;
function readyCovers(j){
 const available=(state.ready||[]).filter(x=>x.recipeId===j.id&&Number(x.qty)>0&&!isReadyExpired(x))
  .reduce((n,x)=>n+Number(x.qty),0);
 const stillNeeded=(j.uses||[]).filter(u=>u.date>=todayISO()&&!isDone(mealKeyOf(u.date,u.slot))).length;
 return stillNeeded>0&&available>=stillNeeded;
}
function missed(w){
 const today=todayISO();
 if(today<w||today>WEEKEND(w))return [];
 return plans(w).filter(j=>j.date<today&&!finished(j)&&!readyCovers(j)&&
   !state.replanDismissed1208?.[noteId(w,j)]&&j.uses?.length);
}
function plannedEarly(w){
 const today=todayISO();
 if(today<w||today>WEEKEND(w))return [];
 return batchesForWeek(w).filter(j=>j.date>today&&!state.cookDone?.[j.key]);
}
function oldMeal(w,at){
 return dayBy(w,at.date)?.meals?.[at.slot];
}
function readyForToday(w,date,slot,recipeId,reserved){
 const ww=getWeekIfExists(w);
 const planned=new Map();
 for(const day of ww?.days||[])for(const m of day.meals||[]){
  if(m?.readyId)planned.set(m.readyId,(planned.get(m.readyId)||0)+1);
 }
 for(const row of state.ready||[]){
  if(row.place!=='fridge'||!row.recipeId||row.recipeId===recipeId||!Number(row.qty)||isReadyExpired(row))continue;
  // Only use containers that have a verified cook date no later than today.
  if(!row.date||row.date>date||Number(row.qty)<=(planned.get(row.id)||0)+(reserved.get(row.id)||0))continue;
  const r=recipes()[row.recipeId];
  if(!r)continue;
  reserved.set(row.id,(reserved.get(row.id)||0)+1);
  return {title:r.name,recipeId:r.id,readyId:row.id,kcal:0};
 }
 return {title:'Выбери готовое блюдо или покупной обед — готовка перенесена',recipeId:null,kcal:0,needsChoice:true};
}
function makeDraft(w,j){
 const today=todayISO(),days=getWeekIfExists(w)?.days||[];
 if(!days.length||today>WEEKEND(w))return null;
 const edits=[],carry=[],newUses=[];
 // Past consumed or explicitly recorded meals mean there may have been a real cook;
 // never infer a missed batch in that situation.
 if((j.uses||[]).some(u=>u.date<=today&&
     (isDone(mealKeyOf(u.date,u.slot))||state.mealConsumed?.[mealKeyOf(u.date,u.slot)]||state.actualMeals?.[u.date+':'+u.slot]))){
  return {blocked:'Одно из блюд этой партии уже отмечено съеденным. Сначала отметь фактическую готовку, чтобы не создать дубликаты.'};
 }
 const scratch=new Map(),reservedReady=new Map();
 const read=(date,slot)=>{
  const k=date+'|'+slot;
  return scratch.has(k)?scratch.get(k):dayBy(w,date)?.meals?.[slot];
 };
 function reserve(date,slot,meal){
  const k=date+'|'+slot,old=read(date,slot);
  scratch.set(k,meal);
  edits.push({date,slot,before:clone(old),after:clone(meal)});
 }
 const shift=(j.uses||[]).filter(u=>u.date<=today),keep=(j.uses||[]).filter(u=>u.date>today);
 newUses.push(...keep);
 const slots=shift.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
 for(const u of slots){
  const source=oldMeal(w,u);
  if(!source||source.recipeId!==j.id||source.readyId||source.outside){
   continue;
  }
  const tomorrow=addDays(today,1);
  let destination=null;
  // Place the postponed meal into the next untouched same-type meal slot.
  // Never replace eaten meals or food assigned to an actual ready container.
  for(let d=tomorrow;d<=WEEKEND(w);d=addDays(d,1)){
   const candidate=read(d,u.slot);
   if(!candidate||isDone(mealKeyOf(d,u.slot))||
      state.mealConsumed?.[mealKeyOf(d,u.slot)]||state.actualMeals?.[d+':'+u.slot]||candidate.readyId)continue;
   if(candidate.recipeId===j.id)continue;
   // Don't place the same dish at both lunch and dinner on one day.
   const otherSlot=u.slot===1?3:1;
   if(read(d,otherSlot)?.recipeId===j.id)continue;
   // Respect explicit office bought-lunch decisions and manual lunch transfers.
   if(u.slot===1&&state.lunchMode1201?.[d]?.mode==='buy')continue;
   if(state.lunchTransfers1202?.[d])continue;
   destination={date:d,slot:u.slot,old:candidate};break;
  }
  if(!destination){
   carry.push({id:'move-'+Date.now()+'-'+u.date+'-'+u.slot+'-'+j.id,
    meal:clone(source),from:u.date,slot:u.slot,reason:'Блюдо из пропущенной готовки — нет свободного дня на этой неделе'});
   continue;
  }
  // Keep the displaced future meal in an explicit backlog, not silently delete it.
  carry.push({id:'displaced-'+Date.now()+'-'+destination.date+'-'+u.slot+'-'+j.id,
   meal:clone(destination.old),from:destination.date,slot:u.slot,
   reason:'Освободили место для перенесённого блюда'});
  reserve(destination.date,u.slot,source);
  newUses.push({date:destination.date,slot:u.slot});
 }
 // An unprepared meal planned for today must not remain misleadingly shown
 // as available food. Prefer a real unallocated fridge portion; otherwise ask
 // for a choice. Historical past-day meals stay untouched for audit.
 for(const u of slots){
  if(u.date!==today)continue;
  const source=oldMeal(w,u);
  if(!source||source.recipeId!==j.id||source.readyId||isDone(mealKeyOf(today,u.slot)))continue;
  reserve(today,u.slot,readyForToday(w,today,u.slot,j.id,reservedReady));
 }
 const projected=clone(j);
 projected.date=today;
 projected.uses=newUses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
 projected.count=projected.uses.length;
 return {week:w,job:clone(j),projected,edits,carry,
  blocked:projected.count?'': 'На этой неделе не осталось приёмов для этого блюда. Его можно вернуть из списка перенесённых блюд вручную.'};
}
function movePlan(w,j,automatic=false){
 const today=todayISO();
 const d=makeDraft(w,j);
 if(!d){if(!automatic)alert('Для этого периода нет доступного плана.');return false}
 if(d.blocked){if(!automatic)alert(d.blocked);return false}
 const changed=d.edits.length;
 const description='Готовка: '+esc(j.id)+' → '+strDate(d.projected.date)+
   '\nЗапланированных порций: '+d.projected.count+
   '\nПеремещено блюд: '+changed+
   '\nДругих блюд в очереди на перестановку: '+d.carry.length+
   '\n\nСъеденные блюда, история прошлых дней, фактические запасы и лекарства не меняются. Перемещённые из меню блюда сохраняются в отдельной очереди. Продолжить?';
 if(!automatic&&!confirm(description))return false;
 // Compute again before making changes to detect concurrent updates to the menu.
 const latest=plans(w).find(x=>x.id===j.id&&x.date===j.date);
 if(!latest||JSON.stringify(latest)!==JSON.stringify(j)){if(!automatic)alert('План уже обновился. Открой этот блок заново.');return false}
 if(d.edits.some(e=>JSON.stringify(dayBy(w,e.date)?.meals?.[e.slot])!==JSON.stringify(e.before)||
   isDone(mealKeyOf(e.date,e.slot)))){if(!automatic)alert('Меню поменялось. Пересчитай перенос.');return false}
 state.replanUndo1208??={};
 // Undo only the most recent shift, until another replan.
 const beforeShop=clone(state.shopDates?.[w]||null);
 state.replanUndo1208[w]={oldJob:clone(j),newJob:clone(d.projected),beforeShop,automatic,
   changes:clone(d.edits),carryIds:d.carry.map(x=>x.id),at:new Date().toISOString()};
 for(const e of d.edits)dayBy(w,e.date).meals[e.slot]=clone(e.after);
 const index=plans(w).findIndex(x=>x.id===j.id&&x.date===j.date);
 if(index<0)return false;
 state.smartBatches1204[w].jobs[index]=d.projected;
 state.postponedMeals1208??=[];
 state.postponedMeals1208.push(...d.carry);
 state.replanDismissed1208??={};
 state.replanDismissed1208[noteId(w,j)]=true;
 // Keep explicitly registered purchases unchanged; move only upcoming shopping.
 state.shopDates??={};state.shopDates[w]??={};
 const batchIndex=(j.date<=addDays(w,2)?0:1),label=batchIndex===0?'first':'second';
 const existing=state.shopDates[w][label];
 const bought=!!state.checks?.['shopping-trip:'+w+':'+batchIndex]||
   Object.keys(state.purchaseLog||{}).some(k=>k.startsWith(w+'|'+batchIndex+'|'));
 if(!bought&&existing&&existing<today)state.shopDates[w][label]=today;
 state.replanUndo1208[w].afterShop=clone(state.shopDates[w]);
 state.replanStack1208??={};state.replanStack1208[w]??=[];
 state.replanStack1208[w].push(clone(state.replanUndo1208[w]));
 save();
 if(!automatic){renderAll();alert('Готовка и оставшиеся блюда перенесены. Другие блюда сохранены ниже в очереди. Проверь список покупок.');}
 return true;
}
function undoShift(w){
 const record=state.replanStack1208?.[w]?.at(-1)||state.replanUndo1208?.[w];
 if(!record||!confirm('Отменить последний перенос?'))return;
 const now=plans(w).find(j=>j.id===record.newJob.id&&j.date===record.newJob.date);
 if(!now||JSON.stringify(now)!==JSON.stringify(record.newJob)){alert('Готовка уже изменена, автоматическая отмена недоступна.');return}
 for(const e of record.changes){
  if(JSON.stringify(dayBy(w,e.date)?.meals?.[e.slot])!==JSON.stringify(e.after)||
   isDone(mealKeyOf(e.date,e.slot))){alert('Блюда уже изменились или съедены. Отмена недоступна.');return}
 }
 const idx=plans(w).indexOf(now); // after find, shared object in array
 if(idx<0)return;
 for(const e of record.changes)dayBy(w,e.date).meals[e.slot]=clone(e.before);
 state.smartBatches1204[w].jobs[idx]=clone(record.oldJob);
 state.postponedMeals1208=pending().filter(x=>!record.carryIds.includes(x.id));
 if(JSON.stringify(state.shopDates?.[w]||null)===JSON.stringify(record.afterShop)){
  if(record.beforeShop)state.shopDates[w]=clone(record.beforeShop);
  else delete state.shopDates?.[w];
 }
 delete state.replanDismissed1208?.[noteId(w,record.oldJob)];
 if(state.replanStack1208?.[w]?.length){
  state.replanStack1208[w].pop();
  state.replanUndo1208[w]=state.replanStack1208[w].at(-1)||null;
 }else delete state.replanUndo1208[w];
 if(!state.replanUndo1208[w])delete state.replanUndo1208[w];
 save();renderAll();
}
function markPreviouslyCooked(w,j){
 const recipe=recipes()[j.id];if(!recipe)return;
 if(state.cookDone?.[keyFor(j.date,j.id)]){renderAll();return}
 if(!confirm('Ты действительно приготовила «'+recipe.name+'», но не отметила? Внеси фактическое количество порций. Дата будет сегодняшней; если готовила раньше, поправь дату порций в «Моём холодильнике».'))return;
 cookJob({id:j.id,recipe,count:j.count||j.uses?.length||1,freeze:0,date:j.date,key:keyFor(j.date,j.id),uses:j.uses});
}
function recordEarly(key){
 const job=batchesForWeek(current).find(j=>j.key===key);
 if(!job||state.cookDone?.[job.key])return;
 if(!confirm('Записать фактическую готовку сегодня? Порции и списание продуктов появятся только после подтверждения количества.'))return;
 cookJob(job);
}
function backlogMarkup(w){
 const items=pending().filter(x=>weekStart(x.from)===w);
 if(!items.length)return '';
 return '<details class="replan-backlog1208"><summary>Блюда, ожидающие нового места · '+items.length+'</summary>'+
 '<p>Ни одно блюдо не потерялось: если перенос занял другую ячейку меню, вытесненное блюдо осталось здесь. Поставь его на свободное место вручную через «Заменить блюдо».</p>'+
 items.map(x=>'<div><b>'+esc(x.meal?.title||'Блюдо')+'</b><small>Было: '+esc(strDate(x.from))+' · '+esc(slotNames[x.slot]||'Приём пищи')+'</small><button type="button" data-replan-remove="'+esc(x.id)+'">Убрать из очереди</button></div>').join('')+'</details>';
}
function panelHTML(w){
 const today=todayISO(),late=missed(w),upcoming=plannedEarly(w);
 const undo=state.replanUndo1208?.[w];
 const autoCount=(state.replanStack1208?.[w]||[]).filter(x=>x.automatic).length;
 const heads=late.map(j=>{
  const name=recipes()[j.id]?.name||j.id;
  return '<div class="replan-row1208"><div><strong>'+esc(name)+'</strong><small>План: '+esc(strDate(j.date))+' · '+j.count+' порц. Готовка не отмечена.</small></div>'+
   '<button type="button" data-replan-move="'+esc(j.id)+'">Перенести с едой →</button>'+
   '<button type="button" class="replan-muted1208" data-replan-finished="'+esc(j.id)+'">Готовила, не отметила</button></div>';
 }).join('');
 const early=upcoming.length?'<details class="replan-early1208"><summary>Приготовила заранее? Отметить сейчас</summary>'+
 upcoming.map(j=>'<div class="replan-row1208"><div><strong>'+esc(j.recipe.name)+'</strong><small>Запланировано: '+esc(strDate(j.date))+' · '+j.count+' порц.</small></div>'+
 '<button type="button" data-replan-early="'+esc(j.key)+'">Приготовила сегодня</button></div>').join('')+'</details>':'';
 if(!heads&&!early&&!undo&&!pending().some(x=>weekStart(x.from)===w))return '';
 return '<section id="reactivePlan1208" class="replan1208"><div class="replan-heading1208"><span>УМНЫЙ ПЛАН ГОТОВКИ</span><h3>'+ (heads?'Готовка сдвинулась?':'Готовка под контролем')+'</h3>'+
 '<p>'+(heads?'Если партия не была приготовлена в назначенный день, приложение подберёт новую дату и переставит блюда без потери истории. Неотмеченная готовка не всегда означает пропущенную — выбери действие.':
 autoCount?'Пропущенная по отметкам готовка автоматически перенесена на текущий день. Вместе с ней перенесены несъеденные блюда; вытесненные позиции сохранены ниже. Если ты на самом деле готовила — отмени перенос и отметь готовку.':
 'Приготовила раньше срока? Отметь фактическую готовку — новые порции появятся в холодильнике, а повторная готовка не потребуется.')+'</p></div>'+
 heads+early+(undo?'<button type="button" class="replan-undo1208" id="replanUndo1208">↶ Отменить последний перенос</button>':'')+backlogMarkup(w)+'</section>';
}
function renderPanel(){
 const existing=document.getElementById('reactivePlan1208');existing?.remove();
 const cal=document.getElementById('calendar');if(!cal)return;
 const html=panelHTML(current);
 if(!html)return;
 const anchor=document.getElementById('adaptivePlan1206')||document.getElementById('smartWeek1204');
 if(anchor)anchor.insertAdjacentHTML('afterend',html);else cal.insertAdjacentHTML('afterbegin',html);
 const host=document.getElementById('reactivePlan1208');
 host.querySelectorAll('[data-replan-move]').forEach(b=>b.onclick=()=>{const j=missed(current).find(x=>x.id===b.dataset.replanMove);if(j)movePlan(current,j)});
 host.querySelectorAll('[data-replan-finished]').forEach(b=>b.onclick=()=>{
  const j=missed(current).find(x=>x.id===b.dataset.replanFinished);
  if(j)markPreviouslyCooked(current,j);
 });
 host.querySelectorAll('[data-replan-early]').forEach(b=>b.onclick=()=>recordEarly(b.dataset.replanEarly));
 host.querySelector('#replanUndo1208')?.addEventListener('click',()=>undoShift(current));
 host.querySelectorAll('[data-replan-remove]').forEach(b=>b.onclick=()=>{
  const x=pending().find(x=>x.id===b.dataset.replanRemove);if(!x)return;
  if(!confirm('Убрать «'+x.meal.title+'» из очереди? Это не удалит рецепт.'))return;
  state.postponedMeals1208=pending().filter(y=>y.id!==x.id);save();renderAll();
 });
}
// A day change is an explicit signal that yesterday's unmarked cooking was missed.
// We make a conservative automatic adjustment, preserving the displaced meals
// in the queue and a reversible journal. We never infer that actual portions exist.
function cloudSettled(){
 const status=document.getElementById('quickCloudText')?.textContent||'';
 // Never auto-edit a stale local snapshot while a signed-in cloud session
 // is still restoring. A local-only installation can still use manual buttons.
 return /синхронизировано|синхронизация включена/i.test(status);
}
function reconcileMissed(){
 if(autoBusy||!cloudSettled())return false;
 const w=weekStart(todayISO());
 if(!getWeekIfExists(w))return false;
 autoBusy=true;
 let moved=false;
 try{
  const jobs=missed(w);
  for(const job of jobs){
   const draft=makeDraft(w,job);
   if(!draft||draft.blocked)continue;
   if(movePlan(w,job,true))moved=true;
  }
 }finally{autoBusy=false}
 return moved;
}
const renderCalendarBefore=renderCalendar;
renderCalendar=function(){reconcileMissed();renderCalendarBefore();renderPanel()};
function noticeToday(){
 const host=document.getElementById('dashboard1198');
 const old=document.getElementById('replanHome1208');old?.remove();
 if(!host)return;
 const w=weekStart(todayISO());
 const events=(state.replanStack1208?.[w]||[]).filter(x=>x.automatic);
 const hidden=Number(state.replanNoticeHidden1208?.[w]||0);
 if(events.length<=hidden)return;
 const banner=document.createElement('div');
 banner.id='replanHome1208';banner.className='replan-home1208';
 banner.innerHTML='<div><b>Меню перестроено после переноса готовки</b><p>Перенесли заготовки и связанные блюда. Даты покупок проверены, ничего не списано. Изменения можно посмотреть и отменить.</p></div>'+
 '<button type="button" data-replan-view>Посмотреть →</button>'+
 '<button type="button" data-replan-hide aria-label="Скрыть уведомление">×</button>';
 host.insertBefore(banner,host.firstChild);
 banner.querySelector('[data-replan-view]').onclick=()=>{
  document.querySelector('[data-tab="calendar"]')?.click();
  document.getElementById('reactivePlan1208')?.scrollIntoView({block:'start',behavior:'smooth'});
 };
 banner.querySelector('[data-replan-hide]').onclick=()=>{
  state.replanNoticeHidden1208??={};state.replanNoticeHidden1208[w]=events.length;
  save();noticeToday();
 };
}
const renderTodayBefore=renderToday;
renderToday=function(){renderTodayBefore();noticeToday()};
document.querySelectorAll('.footer').forEach(e=>e.textContent='Версия 11.10.8');
// Sync completion can occur after the first render. React only to confirmed
// cloud restoration, never to an incomplete local snapshot.
const cloudLabel=document.getElementById('quickCloudText');
if(cloudLabel&&typeof MutationObserver==='function'){
 const watcher=new MutationObserver(()=>{
  if(cloudSettled()&&reconcileMissed())renderAll();
 });
 watcher.observe(cloudLabel,{childList:true,characterData:true,subtree:true});
}
renderPanel();
})();