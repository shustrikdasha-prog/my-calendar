/* 11.10.3 · Weekly overview of lunches, cooking, shopping, and food already prepared.
   A read-only view of state. All navigation delegates to existing calendar handlers. */
(function(){
'use strict';
const ROOT_ID='weekOverview1203';
const section=document.getElementById('calendar');
if(!section)return;
const safe=(x)=>escapes(String(x??''));
const dateText=(d)=>{const x=new Date(d+'T12:00:00Z');return x.toLocaleDateString('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','')};
const lunchLabel={home:'Дома',container:'Контейнер',buy:'В офисе'};
const weekday=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const root=document.createElement('section');root.id=ROOT_ID;root.className='week-overview1203';
const weekNavigation=section.querySelector('.weeknav');
section.insertBefore(root,weekNavigation||section.firstChild);
function lunchMode(date,meal){
 const value=state.lunchMode1201?.[date]?.mode;
 if(value==='home'||value==='container'||value==='buy')return value;
 return /контейнер/i.test(meal?.title||'')?'container':'home';
}
function upcomingShopping(week){
 // Dates may include the preceding Sunday, which we intentionally surface too.
 return shopDates(week).filter(Boolean);
}
function kitchenJobs(week){
 try{return batchesForWeek(week).filter(x=>x&&x.date&&x.recipe)}
 catch(error){console.warn('Week overview: unavailable cooking jobs',error);return []}
}
function renderOverview(){
 const w=getWeek(current),jobs=kitchenJobs(current),shopping=upcomingShopping(current);
 const activeReady=(Array.isArray(state.ready)?state.ready:[]).filter(x=>Number(x.qty)>0);
 const allPortions=activeReady.reduce((n,x)=>n+Number(x.qty||0),0);
 const made=jobs.filter(x=>!!state.cookDone?.[x.key]);
 const doneMeals=w.days.reduce((n,d)=>n+(d.meals||[]).filter((m,i)=>isDone('meal:'+d.date+':'+i)).length,0);
 const totalMeals=w.days.reduce((n,d)=>n+(d.meals||[]).length,0);
 const countLunch=(mode)=>w.days.filter(d=>lunchMode(d.date,d.meals?.[1])===mode).length;
 const dates=w.days.map((d,i)=>{
  const date=d.date,lunch=lunchMode(date,d.meals?.[1]),cooking=jobs.filter(j=>j.date===date),done=cooking.filter(j=>state.cookDone?.[j.key]).length;
  const shop=shopping.some(x=>x===date);
  const dayDone=(d.meals||[]).filter((m,j)=>isDone('meal:'+date+':'+j)).length;
  const total=(d.meals||[]).length;
  const markers=[
   '<span class="w-lunch1203 '+lunch+'">'+safe(lunchLabel[lunch])+'</span>',
   cooking.length?'<span class="w-marker1203 cook">'+(done===cooking.length?'✓ ':'')+'Готовка · '+cooking.length+'</span>':'',
   shop?'<span class="w-marker1203 shop">Закупка</span>':''
  ].filter(Boolean).join('');
  return '<button class="w-day1203 '+(selected===date?'chosen':'')+' '+(todayISO()===date?'today':'')+'" type="button" data-overview-day="'+date+'" aria-pressed="'+String(selected===date)+'">'+
   '<span class="w-day-top1203"><span>'+weekday[i]+'</span><strong>'+safe(dateText(date))+'</strong></span>'+
   '<span class="w-day-markers1203">'+markers+'</span>'+
   '<span class="w-day-done1203">'+dayDone+' / '+total+' приёмов отмечено</span>'+
   '</button>';
 }).join('');
 const preweek=shopping.filter(d=>d<current);
 const shoppingSummary=shopping.length?shopping.map(d=>dateText(d)).join(' и '):'не назначены';
 root.innerHTML='<div class="w-heading1203"><div><span class="w-eyebrow1203">НЕДЕЛЯ ПОД КОНТРОЛЕМ</span><h2>Вся неделя перед глазами</h2><p>Нажми на день, чтобы открыть меню и изменить планы.</p></div><button class="w-today1203" type="button" id="overviewToday1203">К сегодняшнему дню →</button></div>'+
 '<div class="w-stats1203"><div class="w-stat1203"><span>Обед в офисе</span><strong>'+countLunch('buy')+' <small>дней</small></strong></div>'+
 '<div class="w-stat1203"><span>Контейнер с собой</span><strong>'+countLunch('container')+' <small>дней</small></strong></div>'+
 '<div class="w-stat1203"><span>Готовка</span><strong>'+made.length+' / '+jobs.length+'</strong></div>'+
 '<div class="w-stat1203"><span>Готовых порций</span><strong>'+allPortions+'</strong></div></div>'+
 '<div class="w-scroll1203"><div class="w-days1203">'+dates+'</div></div>'+
 '<div class="w-foot1203"><div><b>Покупки</b><span>'+safe(shoppingSummary)+(preweek.length?' · часть закупок до начала недели':'')+'</span></div><div><b>Меню</b><span>'+doneMeals+' / '+totalMeals+' приёмов отмечено</span></div><button type="button" data-overview-tab="shop">К списку покупок →</button><button type="button" data-overview-tab="portions">К готовке →</button></div>';
 root.querySelectorAll('[data-overview-day]').forEach(button=>button.addEventListener('click',()=>{
  selected=button.dataset.overviewDay;
  renderAll();
  document.getElementById('dayMenu')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 root.querySelector('#overviewToday1203')?.addEventListener('click',()=>{
  const date=todayISO();current=weekStart(date);selected=date;renderAll();
  root.scrollIntoView({behavior:'smooth',block:'start'});
 });
 root.querySelectorAll('[data-overview-tab]').forEach(button=>button.addEventListener('click',()=>{
  const tab=document.querySelector('[data-tab="'+button.dataset.overviewTab+'"]');
  tab?.click();
 }));
}
const previousCalendar=renderCalendar;
renderCalendar=function(){previousCalendar();renderOverview()};
document.querySelectorAll('.footer').forEach(x=>x.textContent='Версия 11.10.3');
renderOverview();
})();