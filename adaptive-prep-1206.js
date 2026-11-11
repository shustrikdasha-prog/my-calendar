/* 11.10.6 · adaptive kitchen dates, no silent ingredient debits or stock changes.
  Works on actual currently planned, unfinished meals. */
(function(){
'use strict';
const $=s=>document.querySelector(s),safe=s=>escapes(String(s??''));
const previousJobs=batchesForWeek;
function sameDay(a,b){return !!a&&!!b&&a===b}
function unfinishedUses(job){
 return (job.uses||[]).filter(u=>{
  const meal=getDay(u.date)?.meals?.[u.slot],key='meal:'+u.date+':'+u.slot;
  return meal?.recipeId===job.id&&!meal?.readyId&&!meal?.outside&&!isDone(key)&&!state.mealConsumed?.[key];
 });
}
batchesForWeek=function(w=current){
 const source=previousJobs(w),result=[];
 for(const j of source){
  const already=!!state.cookDone?.[j.key],uses=unfinishedUses(j);
  if(already){result.push(j);continue}
  if(!uses.length)continue;
  uses.sort((a,b)=>a.date.localeCompare(b.date));
  let date=j.date;
  const first=uses[0].date;
  // Defer only if there is NO need today or tomorrow; cook 1 day before first use.
  // Never automatically bring cooking earlier or cross the week boundary.
  const candidate=addDays(first,-1);
  if(candidate>date&&candidate>=w&&candidate<=addDays(w,6))date=candidate;
  result.push({...j,date,key:'cook:'+date+':'+j.id,uses,count:uses.length,
    freeze:uses.filter(u=>u.date>addDays(date,2)).length});
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
};
const prevDates=shopDates;
shopDates=function(w=current){
 const dates=prevDates(w);
 if(!Array.isArray(dates)||dates.length<2)return dates;
 const original=dates[1];
 // Never move a completed shopping trip or a trip with recorded purchases.
 if(isDone('shopping-trip:'+w+':1')||Object.keys(state.purchaseLog||{}).some(k=>k.startsWith(w+'|1|')))return dates;
 const jobs=batchesForWeek(w).filter(j=>!state.cookDone?.[j.key]);
 if(jobs.some(j=>j.date===original))return dates;
 const future=jobs.map(j=>j.date).filter(d=>d>original).sort();
 if(!future.length)return dates;
 const shifted=future[0];
 // Preserve earlier shopping if it still serves meals before the shifted cooking.
 const earlierNeeded=jobs.some(j=>j.uses?.some(u=>u.date<shifted));
 if(earlierNeeded)return dates;
 return [dates[0],shifted];
};
function overview(){
 const target=$('#calendar .week-overview1203');
 if(!target)return;
 const previous=$('#adaptivePlan1206');previous?.remove();
 const jobs=batchesForWeek(current).filter(j=>!state.cookDone?.[j.key]);
 const dates=shopDates(current);
 const remaining=jobs.length;
 const wrap=document.createElement('div');
 wrap.id='adaptivePlan1206';wrap.className='auto-prep1206';
 const cooking=jobs.map(j=>({name:j.recipe.name,date:j.date,count:j.count}));
 const days=[...new Set(cooking.map(j=>j.date))];
 const next=days[0];
 wrap.innerHTML='<div><span class="auto-prep-label1206">ПЛАН ПОДСТРОЕН ПОД МЕНЮ</span>'+
 '<strong>'+(remaining?'Следующая готовка — '+safe(strDate(next)):'На этой неделе нет незавершённых заготовок')+'</strong>'+
 '<p>'+(remaining?'Осталось приготовить '+cooking.map(j=>safe(j.name)+' · '+j.count+' порц.').join('; ')+'.':'У тебя нет новых партий готовки по текущему недельному меню.')+'</p>'+
 (remaining&&dates?.[1]?'<p>Вторая закупка: '+safe(strDate(dates[1]))+'. Время закупки пересчитывается, если нет готовки и непокупленных продуктов в прежнюю дату.</p>':'')+
 '</div><button type="button" data-auto-prep-open>К готовке →</button>';
 target.insertAdjacentElement('afterend',wrap);
 wrap.querySelector('[data-auto-prep-open]').onclick=()=>document.querySelector('[data-tab="portions"]')?.click();
}
const oldCal=renderCalendar;
renderCalendar=function(){oldCal();overview()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.10.6');
overview();
})();