/* 11.9.8 — mobile-first daily dashboard and simplified navigation.
   Read-only presentation over the existing state, no migration or recipe/pantry mutation. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const TAB_LABELS={today:'Сегодня',calendar:'Меню',portions:'Кухня',shop:'Покупки',recipes:'Рецепты',meds:'Лекарства',settings:'Настройки'};
const PRIMARY=['today','calendar','portions','shop'];
const SECONDARY=['recipes','meds','settings'];
const tabs=[...document.querySelectorAll('nav.nav [data-tab]')];
const nav=document.querySelector('nav.nav');
if(!nav||!$('today'))return;
nav.classList.add('nav-1198');
for(const b of tabs){b.textContent=TAB_LABELS[b.dataset.tab]||b.textContent;b.classList.toggle('nav-extra-1198',!PRIMARY.includes(b.dataset.tab));b.setAttribute('aria-label',b.textContent)}
// The original tab buttons remain in the DOM for all existing JS handlers.
const more=document.createElement('button');
more.id='openMore1198';more.className='more-trigger-1198';more.type='button';more.setAttribute('aria-label','Другие разделы');more.setAttribute('aria-expanded','false');
more.innerHTML='<span aria-hidden="true">☰</span><span>Ещё</span>';
document.querySelector('main')?.appendChild(more);
const menu=document.createElement('div');
menu.id='moreMenu1198';menu.className='more-menu-1198';menu.hidden=true;
menu.innerHTML='<div class="more-menu-header-1198"><b>Другие разделы</b><button type="button" id="closeMore1198" aria-label="Закрыть">×</button></div>'+
 SECONDARY.map(id=>'<button type="button" class="more-menu-link-1198" data-go-1198="'+id+'">'+TAB_LABELS[id]+'<span aria-hidden="true">→</span></button>').join('');
document.querySelector('main')?.appendChild(menu);
const closeMenu=()=>{menu.hidden=true;more.setAttribute('aria-expanded','false')};
const toggleMenu=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden))};
more.addEventListener('click',toggleMenu);
$('closeMore1198').addEventListener('click',closeMenu);
menu.querySelectorAll('[data-go-1198]').forEach(btn=>btn.addEventListener('click',()=>{closeMenu();tabs.find(b=>b.dataset.tab===btn.dataset.go1198)?.click()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!more.contains(e.target))closeMenu()});
tabs.forEach(b=>b.addEventListener('click',()=>{
 closeMenu();
 const isExtra=SECONDARY.includes(b.dataset.tab);
 more.classList.toggle('section-active-1198',isExtra);
 // In settings and recipes the visible navigation remains contextual.
}));
function go(id){tabs.find(b=>b.dataset.tab===id)?.click()}
const today=$('today');
const dash=document.createElement('section');dash.id='dashboard1198';dash.className='dashboard-1198';
today.insertBefore(dash,today.querySelector('#todayContent'));
const oldContent=$('todayContent');
if(oldContent){
 const disclosure=document.createElement('details');
 disclosure.id='oldTodayDetails1198';
 disclosure.className='old-today-details-1198';
 const summary=document.createElement('summary');summary.textContent='Все отметки и дела на сегодня';
 today.insertBefore(disclosure,oldContent);
 disclosure.append(summary,oldContent);
}
const originalRenderToday=renderToday;
function safeName(v){return escapes(v||'Не запланировано')}
function medicationRows(date){
 try{return activeMeds(date).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'))}
 catch{return []}
}
function dashboard(){
 const date=todayISO(),day=getDay(date);
 const meals=(day?.meals||[]).slice(0,4),meds=medicationRows(date);
 const doneMeals=meals.filter((m,i)=>isDone('meal:'+date+':'+i)).length;
 const doneMeds=meds.filter(m=>isDone('med:'+date+':'+m.name)).length;
 const weekdays=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
 const localDate=new Date(date+'T12:00:00');
 const name=localDate.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
 const week=weekdays[localDate.getDay()];
 const ready=Array.isArray(state.ready)?state.ready.filter(r=>Number(r.qty)>0):[];
 const mainTitle=(meals[1]?.title||'').toLowerCase();
 const office=/офис|контейнер/.test(mainTitle);
 const hasPrep=batchesForWeek(weekStart(date)).some(j=>j.date===date&&!state.cookDone?.[j.key]);
 const nextDate=addDays(date,1);
 const nextPrep=batchesForWeek(weekStart(nextDate)).filter(j=>j.date===nextDate&&!state.cookDone?.[j.key]);
 let lead=hasPrep?'Сегодня день готовки — план уже собран':nextPrep.length?'Сегодня можно отдохнуть от готовки':'Сегодня всё по плану';
 const mealLabels=['Завтрак','Обед','Перекус','Ужин'];
 const indices=['01','02','03','04'];
 const medHint=(slot)=>{
   if(slot===0)return meds.filter(m=>(m.time||'')<'12:00');
   if(slot===1)return meds.filter(m=>(m.time||'')>='12:00'&&(m.time||'')<'17:00');
   if(slot===3)return meds.filter(m=>(m.time||'')>='17:00');
   return [];
 };
 dash.innerHTML='<div class="day-intro-1198"><div><div class="day-eyebrow-1198">'+safeName(week)+' · '+safeName(name)+'</div><h2>Твой день, без суеты</h2><p>'+safeName(lead)+'</p></div>'+
 '<div class="day-progress-1198" aria-label="Выполнено '+(doneMeals+doneMeds)+' из '+(meals.length+meds.length)+'"><strong>'+(doneMeals+doneMeds)+'<small> / '+(meals.length+meds.length)+'</small></strong><span>выполнено</span></div></div>'+
 '<div class="day-overview-1198"><div class="day-mini-1198"><span>Питание</span><strong>'+doneMeals+' из '+meals.length+'</strong></div><div class="day-mini-1198"><span>Лекарства</span><strong>'+doneMeds+' из '+meds.length+'</strong></div><div class="day-mini-1198"><span>Готовые порции</span><strong>'+ready.reduce((s,r)=>s+Number(r.qty||0),0)+'</strong></div></div>'+
 '<div class="day-section-title-1198"><h3>Что сегодня едим</h3><button type="button" class="day-text-link-1198" data-dash-go="calendar">Всё меню →</button></div>'+
 '<div class="day-meals-1198">'+meals.map((m,i)=>{
   const key='meal:'+date+':'+i,checked=isDone(key),med=medHint(i);
   const readyHint=ready.find(r=>r.recipeId&&r.recipeId===m.recipeId);
   const text=readyHint?'Готово дома · '+readyHint.qty+' порц.':i===1&&office?'Офисный обед / контейнер':m.recipeId?'Рецепт доступен':'Без связанного рецепта';
   return '<article class="day-meal-1198 '+(checked?'is-done':'')+'"><div class="day-meal-index-1198">'+indices[i]+'</div>'+
    '<div class="day-meal-content-1198"><div class="day-meal-type-1198">'+mealLabels[i]+'</div><h4>'+safeName(m.title)+'</h4>'+
    '<p>'+safeName(text)+'</p>'+ (med.length?'<div class="day-meal-meds-1198">'+med.map(x=>'<span>'+safeName(x.time||'')+' · '+safeName(x.name)+'</span>').join('')+'</div>':'')+
    '<div class="day-meal-actions-1198">'+(m.recipeId?'<button type="button" class="day-text-link-1198" data-dash-recipe="'+escapes(m.recipeId)+'">Рецепт</button>':'')+'</div></div>'+
    '<button type="button" class="day-check-1198 '+(checked?'checked':'')+'" data-dash-meal="'+i+'" aria-pressed="'+String(checked)+'" aria-label="'+(checked?'Отменить отметку: ':'Отметить съеденным: ')+escapes(m.title)+'">'+(checked?'✓':'○')+'</button></article>';
 }).join('')+'</div>'+
 '<div class="day-quick-grid-1198"><button type="button" data-dash-go="portions"><span class="day-quick-icon-1198">♨</span><span><b>Готовка и порции</b><small>'+(hasPrep?'Есть задачи на сегодня':'Проверить холодильник')+'</small></span><i>→</i></button>'+
 '<button type="button" data-dash-go="shop"><span class="day-quick-icon-1198">▣</span><span><b>Покупки</b><small>Список на неделю</small></span><i>→</i></button></div>'+
 '<section class="day-medicine-1198"><div class="day-section-title-1198"><h3>Приём препаратов</h3><button type="button" class="day-text-link-1198" data-dash-go="meds">Настроить →</button></div>'+
 (meds.length?meds.map(m=>{
   const key='med:'+date+':'+m.name,checked=isDone(key);
   return '<label class="day-med-row-1198"><input type="checkbox" data-dash-med="'+escapes(m.name)+'" '+(checked?'checked':'')+'><span class="day-med-time-1198">'+safeName(m.time||'—')+'</span><span class="day-med-desc-1198"><b>'+safeName(m.name)+'</b><small>'+safeName(m.dose)+'</small></span></label>';
 }).join(''):'<p class="day-empty-1198">На сегодня нет включённых назначений.</p>')+
 '</section>'+
 '<section class="day-next-1198"><div><span>НА ЗАВТРА</span><h3>'+ (nextPrep.length?'Планируется готовка':'Проверь контейнер на обед')+'</h3><p>'+(nextPrep.length?nextPrep.length+' блюд в плане заготовок':'Собери обед заранее, если берёшь его в офис.')+'</p></div><button type="button" data-dash-go="calendar">Открыть →</button></section>';
 dash.querySelectorAll('[data-dash-meal]').forEach(b=>b.onclick=()=>{
  const idx=Number(b.dataset.dashMeal),key='meal:'+date+':'+idx;
  // Use existing mark() to preserve portion accounting and cloud sync.
  mark(key,!isDone(key));
 });
 dash.querySelectorAll('[data-dash-med]').forEach(input=>input.onchange=()=>mark('med:'+date+':'+input.dataset.dashMed,input.checked));
 dash.querySelectorAll('[data-dash-go]').forEach(b=>b.onclick=()=>{if(b.dataset.dashGo==='calendar'){current=weekStart(date);selected=date}go(b.dataset.dashGo)});
 dash.querySelectorAll('[data-dash-recipe]').forEach(b=>b.onclick=()=>showRecipe(b.dataset.dashRecipe));
}
renderToday=function(){originalRenderToday();dashboard()};
const originalAll=renderAll;
renderAll=function(){originalAll();dashboard()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.8');
renderAll();
})();