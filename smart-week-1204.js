/* 11.10.4 · Preview-first next-week meal planning. No changes until explicit Apply. */
(function(){
'use strict';
const host=document.getElementById('calendar');
if(!host)return;
const safe=s=>escapes(String(s??''));
const START=()=>addDays(current,7);
const dow=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const modes={home:'Дома',container:'Контейнер',buy:'Покупаю обед'};
const selectedModes=new Map();
let target='',draft=null,stepDates=[0,3],lastUndo=null;
function ensureTarget(){
 const next=START();
 if(target===next)return;
 target=next;draft=null;selectedModes.clear();
 for(let i=0;i<7;i++){
  const date=addDays(target,i),mode=state.lunchMode1201?.[date]?.mode;
  selectedModes.set(date,mode||'home');
 }
 stepDates=[0,3];
}
function foodRecipes(){
 const all=Object.values(recipes()).filter(r=>{
  if(!r?.id||!Array.isArray(r.ingredients)||!r.ingredients.length||!Array.isArray(r.steps)||!r.steps.length)return false;
  if(state.dislikedRecipes?.[r.id])return false;
  if(/десерт|слад|пудинг|сырник|запеканк|кекс|печень|желе|круассан|шоколад|йогурт|смузи|каша|овсян|гранола|тост|бутерброд|олад/i.test(r.name||''))return false;
  if(!/индей|куриц|говядин|рыб|суп|котлет|тефтел|тушен|чечевиц|фасол|нут|лосос|форел|овощ|филе|гречк|киноа|рагу/i.test(r.name||''))return false;
  return true;
 });
 // Prefer recipes already linked to a user's menus; don't invent recipes.
 const seen=new Set();
 const favor=[];
 for(const w of Object.values(state.weeks||{}))for(const d of w?.days||[])for(const m of [d.meals?.[1],d.meals?.[3]]){
  if(m?.recipeId&&!seen.has(m.recipeId)){seen.add(m.recipeId);favor.push(m.recipeId)}
 }
 return all.sort((a,b)=>Number(favor.includes(b.id))-Number(favor.includes(a.id))||a.name.localeCompare(b.name,'ru'));
}
function safeReady(date,used){
 const rows=(Array.isArray(state.ready)?state.ready:[]).filter(r=>{
  if(!r?.recipeId||!recipes()[r.recipeId]||!Number.isFinite(Number(r.qty))||r.qty<=0)return false;
  if((used[r.id]||0)>=r.qty)return false;
  if(r.place==='freezer')return true;
  if(r.place!=='fridge'||!r.date)return false;
  const delta=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(r.date+'T12:00:00Z'))/86400000);
  return delta>=0&&delta<=2;
 });
 return rows[0]||null;
}
function baseline(w){
 const existing=state.weeks?.[w];
 return existing?clone(existing):templateWeek(w);
}
function calculate(){
 ensureTarget();
 const weekdayDays=Array.from({length:7},(_,i)=>addDays(target,i));
 const pool=foodRecipes();
 if(pool.length<2)throw Error('Недостаточно полноценных рецептов с ингредиентами и шагами. Добавь хотя бы два основных блюда в книгу рецептов.');
 const groups=[pool.slice(0,2),pool.slice(2,4)];
 if(!groups[1].length)groups[1]=groups[0];
 const candidate=baseline(target);
 const changes=[],readyUsed={},jobs={},warnings=[];
 const cookingDates=[addDays(target,stepDates[0]),addDays(target,stepDates[1])];
 if(pool.length<4)warnings.push('Подходящих основных рецептов меньше четырёх: блюда будут повторяться.');
 const today=todayISO();
 const untouched=new Set();
 for(let i=0;i<7;i++){
  const date=weekdayDays[i],d=candidate.days[i],mode=selectedModes.get(date)||'home';
  for(const slot of [1,3]){
   const key='meal:'+date+':'+slot;
   if(isDone(key)||state.mealConsumed?.[key]||state.actualMeals?.[date+':'+slot]||state.lunchTransfers1202?.[date]){
    untouched.add(key);continue;
   }
   if(slot===1&&mode==='buy'){
    d.meals[slot]={title:'Покупаю обед в офисе · состав ещё не внесён',recipeId:null,kcal:0,outside:true};
    changes.push({date,slot,mode,meal:d.meals[slot],kind:'buy'});
    continue;
   }
   const g=i<3?0:1,group=groups[g];
   const chosen=group[(i+(slot===1?0:1))%group.length];
   let ready=null;
   // Use only an existing, individually counted ready portion that will remain within conservative age.
   if(slot===1&&i===0)ready=safeReady(date,readyUsed);
   let meal,kind='recipe';
   if(ready){
    readyUsed[ready.id]=(readyUsed[ready.id]||0)+1;
    const r=recipes()[ready.recipeId];
    meal={title:r.name,recipeId:r.id,readyId:ready.id,kcal:Math.round(nutritionOf(r)?.kcal||0)};
    kind='ready';
    if(ready.place==='freezer')warnings.push('На '+strDate(date)+' предусмотрена замороженная порция «'+ready.name+'». Разморозь её в холодильнике заранее.');
   }else{
    meal={title:chosen.name,recipeId:chosen.id,kcal:Math.round(nutritionOf(chosen)?.kcal||0)};
    const cookDay=cookingDates[g];
    if(date<cookDay)warnings.push('Проверь день готовки: блюдо «'+chosen.name+'» поставлено на '+strDate(date)+' до выбранной даты готовки '+strDate(cookDay)+'.');
    const id=cookDay+'|'+chosen.id;
    (jobs[id]??={date:cookDay,id:chosen.id,count:0,uses:[]}).uses.push({date,slot});
    jobs[id].count++;
   }
   d.meals[slot]=meal;changes.push({date,slot,mode,meal,kind});
  }
 }
 const jobList=Object.values(jobs);
 // Verify that a batch is not scheduled later than its first use.
 const invalid=jobList.some(j=>j.uses.some(u=>u.date<j.date));
 if(invalid)throw Error('Выбранный день готовки позже одного из запланированных обедов. Выбери более ранние дни.');
 const ing=new Map(),stock=stockMap();
 for(const job of jobList){
  const recipe=recipes()[job.id];
  for(const item of editableIngredients(recipe,job.count)){
   if(!item.name||!Number.isFinite(item.qty)||item.qty<=0)continue;
   const key=normalizeShopName(item.name)+'|'+item.unit;
   const row=ing.get(key)||{name:item.name,unit:item.unit,qty:0};
   row.qty+=item.qty;ing.set(key,row);
  }
 }
 const shoppingEstimate=[...ing.entries()].map(([key,row])=>({...row,qty:Math.max(0,Math.round((row.qty-(stock.get(key)||0))*10)/10)})).filter(x=>x.qty>0.01).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 return {target,days:candidate.days,changes,jobs:jobList,usedReady:readyUsed,warnings:[...new Set(warnings)],shoppingEstimate,untouched:[...untouched],modes:Object.fromEntries(weekdayDays.map(d=>[d,selectedModes.get(d)||'home'])),cookingDates,original:state.weeks?.[target]?clone(state.weeks[target]):null};
}
function boxSummary(d){
 const day=(state.weeks?.[weekStart(d)]||templateWeek(weekStart(d))).days[dayIndex(d)-dayIndex(weekStart(d))];
 return day.meals?.[1]?.title||'';
}
function preview(){
 try{draft=calculate()}catch(e){draft=null;view();alert('Не удалось собрать план: '+e.message);return}
 view();
}
function apply(){
 if(!draft)return;
 const next=START();
 if(draft.target!==next){draft=null;alert('Неделя изменилась. Собери новый предварительный план.');view();return}
 // Ensure preview is still based on current week. Don't overwrite intervening changes.
 const compare=state.weeks?.[target]?clone(state.weeks[target]):null;
 if(JSON.stringify(compare)!==JSON.stringify(draft.original)){
  draft=null;alert('Меню изменилось после предпросмотра. Составь план заново, чтобы не потерять новые правки.');view();return;
 }
 for(const entry of draft.changes){
  const key='meal:'+entry.date+':'+entry.slot;
  if(isDone(key)||state.mealConsumed?.[key]||state.actualMeals?.[entry.date+':'+entry.slot]){
   alert('Появились новые отметки съеденного. Пересобери план.');draft=null;view();return;
  }
 }
 const summary='Применить план на '+strDate(target)+' — '+strDate(addDays(target,6))+'?\n\nЗаменятся '+draft.changes.length+' обедов и ужинов, остальные приёмы останутся прежними. Два дня готовки. Ориентировочно '+draft.shoppingEstimate.length+' позиций покупок.\n\nЛекарства, готовые порции и фактические запасы не изменятся. Отменить план можно кнопкой в этом разделе.';
 if(!confirm(summary))return;
 lastUndo={
  target,week:clone(state.weeks?.[target]||null),
  modes:clone(state.lunchMode1201||{}),schedule:clone(state.smartBatches1204||{}),
  plannerDraft:clone(state.smartPlans1204||{})
 };
 const w=baseline(target);w.days=clone(draft.days);
 state.weeks[target]=w;
 state.lunchMode1201??={};
 for(const [d,mode] of Object.entries(draft.modes)){
  if(mode==='buy'){
   state.lunchMode1201[d]={mode,original:clone(lastUndo.modes?.[d]?.original||draft.original?.days?.find(x=>x.date===d)?.meals?.[1]||baseline(target).days.find(x=>x.date===d).meals[1])};
  }else state.lunchMode1201[d]={mode};
 }
 state.smartBatches1204??={};
 state.smartBatches1204[target]={jobs:clone(draft.jobs)};
 state.smartPlans1204??={};
 state.smartPlans1204[target]={createdAt:new Date().toISOString(),cookingDates:clone(draft.cookingDates),version:1};
 draft=null;
 save();renderAll();
 alert('План применён. Перейди к неделе, чтобы посмотреть меню, готовку и покупки. Последнее применение можно отменить, пока не отмечены новые действия.');
}
function undo(){
 if(!lastUndo)return;
 const prev=lastUndo,week=state.weeks?.[prev.target];
 if(!week||!confirm('Отменить последнее планирование недели? Это вернёт прежние меню, режимы обедов и даты готовки.'))return;
 for(const d of week.days||[]){
  for(let slot of [1,3]){
   const key='meal:'+d.date+':'+slot;
   if(isDone(key)||state.mealConsumed?.[key]||state.actualMeals?.[d.date+':'+slot]){
    alert('После применения появились новые отметки съеденного. Чтобы не потерять данные, автоматическая отмена недоступна.');return;
   }
  }
 }
 if(prev.week)state.weeks[prev.target]=clone(prev.week);else delete state.weeks[prev.target];
 state.lunchMode1201=clone(prev.modes);
 state.smartBatches1204=clone(prev.schedule);
 state.smartPlans1204=clone(prev.plannerDraft);
 lastUndo=null;draft=null;
 save();renderAll();
}
const root=document.createElement('section');root.id='smartWeek1204';root.className='smart-week1204';
const anchor=document.getElementById('weekOverview1203');
host.insertBefore(root,anchor||host.firstChild);
function view(){
 ensureTarget();
 const dates=Array.from({length:7},(_,i)=>addDays(target,i));
 const modeRows=dates.map((date,i)=>{
  const mode=selectedModes.get(date)||'home';
  return '<div class="sw-day1204"><div><b>'+dow[i]+' · '+strDate(date)+'</b><small>'+safe(boxSummary(date))+'</small></div><select aria-label="Где обедаешь '+strDate(date)+'" data-sw-date="'+date+'">'+Object.entries(modes).map(([v,label])=>'<option value="'+v+'" '+(mode===v?'selected':'')+'>'+label+'</option>').join('')+'</select></div>';
 }).join('');
 const prep=stepDates.map((n,i)=>'<select aria-label="День готовки '+(i+1)+'" data-sw-cook="'+i+'">'+dow.map((x,d)=>'<option value="'+d+'" '+(n===d?'selected':'')+'>'+x+' · '+strDate(addDays(target,d))+'</option>').join('')+'</select>').join('');
 const planned=draft?'<div class="sw-preview1204"><div class="sw-preview-heading1204"><h4>Предварительный план</h4><span>'+draft.changes.length+' изменений</span></div>'+
 '<div class="sw-preview-days1204">'+dates.map((date,i)=>{
  const lunch=draft.days[i].meals?.[1],dinner=draft.days[i].meals?.[3];
  return '<div><b>'+dow[i]+' '+strDate(date)+'</b><p>Обед: '+safe(lunch?.title||'—')+'</p><p>Ужин: '+safe(dinner?.title||'—')+'</p></div>';
 }).join('')+'</div>'+
 '<h5>Готовка · '+draft.jobs.length+' блюд</h5><p>'+draft.jobs.map(j=>safe(strDate(j.date))+' — '+safe(recipes()[j.id]?.name)+' × '+j.count+' порц.').join('<br>')+'</p>'+
 '<h5>Ориентировочные покупки · '+draft.shoppingEstimate.length+' позиций</h5><p>'+(draft.shoppingEstimate.length?draft.shoppingEstimate.map(x=>safe(x.name)+' — '+x.qty+' '+safe(x.unit)).join('<br>'):'По известным ингредиентам дополнительных покупок не требуется.')+'</p>'+
 '<p class="sw-caution1204">Расчёт ориентировочный: магазинные упаковки, овощи для контейнеров, уже закупленные продукты и индивидуальная калорийность могут требовать корректировки. Учёт покупок на экране «Покупки» пересчитается после применения.</p>'+
 draft.warnings.map(x=>'<p class="sw-warning1204">'+safe(x)+'</p>').join('')+
 '<button type="button" class="sw-apply1204" id="swApply1204">Применить этот план</button></div>':'';
 root.innerHTML='<div class="sw-heading1204"><div><span>ПЛАНИРОВЩИК</span><h2>Собрать следующую неделю</h2><p>Сначала выбери обеды и дни готовки. Мы покажем план, а изменения внесём только после подтверждения.</p></div><span class="sw-week1204">'+strDate(target)+' — '+strDate(addDays(target,6))+'</span></div>'+
 '<details id="swDetails1204" '+(draft?'open':'')+'><summary>Настроить меню на следующую неделю <span>→</span></summary>'+
 '<div class="sw-content1204"><h3>Где обедаешь?</h3>'+modeRows+
 '<div class="sw-cook1204"><h3>Два дня готовки</h3><p>Первый день — в начале недели, второй — ближе к выходным. Выбирай день не позже первого блюда соответствующего цикла.</p><div>'+prep+'</div></div>'+
 '<div class="sw-actions1204"><button id="swPreview1204" type="button">Предпросмотр меню и покупок</button>'+(lastUndo?'<button id="swUndo1204" type="button">Отменить последнее применение</button>':'')+'</div>'+planned+'</div></details>';
 // Preserve expanded state while editing.
 root.querySelectorAll('[data-sw-date]').forEach(x=>x.onchange=()=>{
  selectedModes.set(x.dataset.swDate,x.value);draft=null;const open=true;view();root.querySelector('details').open=open;
 });
 root.querySelectorAll('[data-sw-cook]').forEach(x=>x.onchange=()=>{
  stepDates[Number(x.dataset.swCook)]=Number(x.value);draft=null;view();root.querySelector('details').open=true;
 });
 root.querySelector('#swPreview1204')?.addEventListener('click',preview);
 root.querySelector('#swApply1204')?.addEventListener('click',apply);
 root.querySelector('#swUndo1204')?.addEventListener('click',undo);
}
const originalBatches=batchesForWeek;
batchesForWeek=function(w=current){
 const schedule=state.smartBatches1204?.[w];
 if(!schedule||!Array.isArray(schedule.jobs))return originalBatches(w);
 const ww=getWeek(w),all=recipes(),result=[];
 // Rebuild uses against the current menu, so changes to later meals affect quantities.
 const plannedIds=new Set(schedule.jobs.map(j=>j.id));
 for(const plan of schedule.jobs){
  const uses=[];
  for(const day of ww.days)for(const slot of [1,3]){
   const meal=day.meals?.[slot];
   if(meal?.recipeId===plan.id&&!meal.readyId&&day.date>=plan.date){
    // Keep a recipe within the batch's cooking window, to avoid duplicates across cycles.
    const next=state.smartPlans1204?.[w]?.cookingDates?.find(d=>d>plan.date);
    if(next&&day.date>=next)continue;
    uses.push({date:day.date,slot});
   }
  }
  if(!uses.length||!all[plan.id])continue;
  result.push({id:plan.id,recipe:all[plan.id],date:plan.date,uses,count:uses.length,freeze:uses.filter(u=>dayIndex(u.date)-dayIndex(plan.date)>2).length,key:'cook:'+plan.date+':'+plan.id});
 }
 // Non-planner recipes remain managed by the existing system, without duplicating generated recipes.
 const existing=originalBatches(w).filter(j=>!plannedIds.has(j.id)&&!j.uses.some(u=>u.slot===1&&state.lunchMode1201?.[u.date]?.mode==='buy'));
 return [...existing,...result].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
};
const formerCalendar=renderCalendar;
renderCalendar=function(){formerCalendar();view()};
document.querySelectorAll('.footer').forEach(e=>e.textContent='Версия 11.10.4');
view();
})();