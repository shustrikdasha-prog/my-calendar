/* 11.10.1 — lunch plan: home / office lunchbox / buying at the office.
   Only user-confirmed mode changes modify planned lunch. No automatic portion deductions. */
(function(){
'use strict';
const OPTIONS={home:'Обедаю дома',container:'Беру контейнер',buy:'Покупаю в офисе'};
const esc=v=>escapes(String(v??''));
function readMode(date){
 const explicit=state.lunchMode1201?.[date]?.mode;
 if(explicit&&OPTIONS[explicit])return explicit;
 const meal=getDay(date)?.meals?.[1];
 return /контейнер/i.test(meal?.title||'')?'container':'home';
}
window.chtoPoestLunchMode1201={get:readMode};
function setMode(date,next){
 if(!OPTIONS[next])return;
 const day=getDay(date),meal=day?.meals?.[1];
 if(!meal)return;
 const key='meal:'+date+':1';
 if(isDone(key)){alert('Этот обед уже отмечен съеденным. Сначала сними отметку в меню дня, затем поменяй план.');return}
 state.lunchMode1201??={};
 const prev=state.lunchMode1201[date]||{},was=readMode(date);
 if(was===next)return;
 if(window.chtoPoestTransfer1202?.beforeModeChange&&!window.chtoPoestTransfer1202.beforeModeChange(date,next))return;
 const previousMeal=prev.original;
 // A prepared batch is real food: switching plans must not undo cooking or add stock.
 if(next==='buy'&&meal.recipeId){
  const alreadyMade=batchesForWeek(weekStart(date)).some(job=>job.uses?.some(u=>u.date===date&&u.slot===1)&&state.cookDone?.[job.key]);
  if(alreadyMade&&!confirm('Еда для этого обеда уже могла быть приготовлена. При смене плана она останется в готовых порциях — приложение не спишет и не выбросит её. Продолжить?'))return;
 }
 if(next==='buy'){
  const original=was==='buy'&&previousMeal?previousMeal:JSON.parse(JSON.stringify(meal));
  // Zero calories explicitly means not yet entered, not a 0-calorie meal.
  state.lunchMode1201[date]={mode:next,original};
  day.meals[1]={title:'Покупаю обед в офисе · состав ещё не внесён',recipeId:null,kcal:0,outside:true};
 }else{
  if(was==='buy'&&previousMeal)day.meals[1]=JSON.parse(JSON.stringify(previousMeal));
  state.lunchMode1201[date]={mode:next};
 }
 save();renderAll();
}
function picker(date,context){
 const mode=readMode(date);
 const current=state.lunchMode1201?.[date];
 const day=getDay(date),meal=day?.meals?.[1];
 const missing=mode==='container'&&!meal?.recipeId;
 const desc=mode==='container'?
   (missing?'Для этого обеда нет привязанного рецепта. Сначала выбери домашнее блюдо: без него невозможно точно рассчитать продукты и порции.':'Основной контейнер 500 мл + овощной 240 мл. Собери утром или накануне.'):
   mode==='buy'?'Домашняя порция не отмечается съеденной, калории неизвестны до ввода фактического обеда.':'Обед дома: не нужно собирать офисный контейнер.';
 const bought=mode==='buy';
 return '<section class="lunch-panel1201" data-lunch-panel="'+context+'"><div class="lunch-header1201"><strong>Где обедаем?</strong><span>'+esc(date===todayISO()?'Сегодня':strDate(date))+'</span></div>'+
 '<div class="lunch-options1201">'+Object.entries(OPTIONS).map(([value,label])=>
  '<button type="button" data-lunch-choice="'+value+'" data-lunch-date="'+date+'" class="'+(mode===value?'active':'')+'" aria-pressed="'+String(mode===value)+'">'+esc(label)+'</button>').join('')+'</div>'+
 '<p class="lunch-description1201">'+esc(desc)+'</p>'+
 (bought?'<button class="lunch-fact1201" type="button" data-lunch-actual="'+date+'">Записать, что купила и съела →</button>':
 missing?'<button class="lunch-fact1201" type="button" data-lunch-edit="'+date+'">Выбрать блюдо для контейнера →</button>':'')+
 (!current?'<p class="lunch-light1201">Режим определён из существующего меню. Выбери другой, если планы изменились.</p>':'')+'</section>';
}
function attach(host,date,context){
 if(!host)return;
 host.querySelectorAll('.lunch-panel1201').forEach(n=>n.remove());
 const markup=picker(date,context);
 const anchor=context==='calendar'?host.querySelectorAll('.meal')[1]:host.querySelectorAll('.day-meal-1198')[1];
 if(!anchor)return;
 anchor.insertAdjacentHTML('afterend',markup);
 const section=anchor.nextElementSibling;
 section.querySelectorAll('[data-lunch-choice]').forEach(b=>b.onclick=()=>setMode(b.dataset.lunchDate,b.dataset.lunchChoice));
 section.querySelectorAll('[data-lunch-edit]').forEach(b=>b.onclick=()=>{
  const date=b.dataset.lunchEdit;
  current=weekStart(date);selected=date;
  document.querySelector('[data-tab="calendar"]')?.click();
  renderAll();
  document.querySelector('#dayMenu [data-edit-meal="1"]')?.click();
 });
 section.querySelectorAll('[data-lunch-actual]').forEach(b=>b.onclick=()=>{
  const date=b.dataset.lunchActual;
  current=weekStart(date);selected=date;
  document.querySelector('[data-tab="calendar"]')?.click();
  renderAll();
  // Existing actual-meal editor supports title and full KБЖУ without inventing values.
  const row=document.querySelectorAll('#dayMenu .meal')[1];
  const btn=[...(row?.querySelectorAll('button')||[])].find(x=>/Факт\s*\/\s*КБЖУ|Изменить факт/i.test(x.textContent));
  if(btn)btn.click();
  else alert('Открой этот обед в меню дня и выбери «Факт / КБЖУ» для записи купленного блюда.');
 });
}
const prevCal=renderCalendar;
renderCalendar=function(){
 prevCal();
 attach(document.getElementById('dayMenu'),selected,'calendar');
 if(readMode(selected)!=='container'){
  const lunch=document.querySelectorAll('#dayMenu .meal')[1];
  lunch?.querySelectorAll('.veg-add-on').forEach(x=>x.remove());
 }
};
const prevToday=renderToday;
renderToday=function(){
 prevToday();
 attach(document.getElementById('dashboard1198'),todayISO(),'today');
};
const prevShop=renderShop;
renderShop=function(){
 prevShop();
 const el=document.getElementById('shopProgress');
 if(el&&Object.keys(state.lunchMode1201||{}).length){
  const p=document.createElement('p');p.className='sub';
  p.textContent='Офисные контейнеры учитываются по выбранным дням. Уже приготовленную еду переключение режима не возвращает в запасы. Покупной обед не добавляется в домашний список продуктов.';
  el.appendChild(p);
 }
};
const beforeAll=renderAll;
renderAll=function(){beforeAll();attach(document.getElementById('dashboard1198'),todayISO(),'today')};
document.querySelectorAll('.footer').forEach(e=>e.textContent='Версия 11.10.1');
renderAll();
})();