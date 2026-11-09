/* 11.9.3 — prescriptions and Nov 9 cooking adjustment.
   Only changes uncompleted meals; never changes existing medicine history or pantry. */
(function(){
'use strict';
const START='2026-11-09';
const EXTRA=[
 {id:'vigantol_course1193',name:'Вигантол · 16 капель (8000 МЕ)',dose:'16 капель с завтраком',days:60,time:'08:00',info:'По назначению с 09.11.2026 на 60 дней. Во время еды. Не совмещать с другими дозами витамина D без согласования.'},
 {id:'vigantol_maint1193',name:'Вигантол · 4 капли (2000 МЕ)',dose:'4 капли с завтраком',days:365,time:'08:00',start:'2027-01-08',info:'Поддерживающая доза после завершения 60-дневного курса; длительность в приложении 365 дней с возможностью продления. Контроль 25-OH D спустя 1–2 недели.'},
 {id:'compligam1193',name:'КомплигамВ Комплекс',dose:'1 таблетка после еды',days:30,time:'13:00',info:'С 09.11.2026 на 30 дней. Уточнить у врача или фармацевта совместимость одновременного приема с железом.'},
 {id:'maltofer1193',name:'Мальтофер 100 мг',dose:'1 жевательная таблетка во время еды',days:60,time:'13:00',info:'С 09.11.2026 на 60 дней. Не сочетать одновременно с кальцием, магнием и цинком; не запивать молоком, чаем и кофе. Контроль ферритина после курса.'}
];
for(const m of EXTRA)if(!MEDS.some(x=>x.name===m.name))MEDS.push(m);
const mg=MEDS.find(x=>x.id==='magnerot');
if(mg)mg.info+=' Время перенесено на вечер (предложено 20:00); дозировка и периодичность сохранены.';
function migrate(){
 if(state.novPlan1193)return;
 state.meds??={};
 for(const m of EXTRA){
  if(!state.meds[m.name])state.meds[m.name]={enabled:true,confirmed:true,start:m.start||START,days:m.days,dose:m.dose,time:m.time};
  else if(!state.meds[m.name].time)state.meds[m.name].time=m.time;
 }
 const key='Магнерот 500 мг';
 if(state.meds[key])state.meds[key].time='20:00';
 // The user reported no cooking on Nov 8–9, so no ready portions are invented.
 const day=getDay(START);
 if(day&&day.meals&&day.meals[0]&&!isDone('meal:'+START+':0')){
   const m=day.meals[0];
   if(/омлет из перепелиных яиц|рисовая каша|завтрак/i.test(m.title)){
      day.meals[0]={title:'Завтрак в офисе (фактическое блюдо не указано)',recipeId:null,kcal:0,outside:true};
   }
 }
 if(day&&day.meals&&day.meals[1]&&!isDone('meal:'+START+':1')){
   day.meals[1]={title:'Полноценный обед в офисе',recipeId:null,kcal:0,outside:true};
 }
 if(day?.tasks)day.tasks=day.tasks.filter(t=>!/суп из индейки на 10|приготовить тефтели на два дня/i.test(t.text||''));
 // Due dates do not imply that analysis was actually taken.
 for(const [date,text] of [
  ['2027-01-09','Контроль ферритина после курса железа — согласовать дату с врачом'],
  ['2027-01-15','Контроль витамина D: анализ 25-OH D через 1–2 недели после перехода на поддерживающую дозу']
 ]){
   const d=getDay(date);d.tasks??=[];
   if(!d.tasks.some(t=>t.text===text))d.tasks.push({id:'medlab1193_'+date,text});
 }
 if(state.shopDates?.[START])state.shopDates[START]={...state.shopDates[START],first:START,second:'2026-11-11'};
 state.novPlan1193=true;save();
}
migrate();
const originalMeds=renderMeds;
renderMeds=function(){
 originalMeds();
 document.querySelectorAll('#medSetup .medrow').forEach(row=>{
   const name=row.querySelector('[data-med-date]')?.dataset.medDate;
   if(!name)return;
   const med=state.meds?.[name]||{},seed=MEDS.find(m=>m.name===name);
   const time=med.time||seed?.time||'';
   const p=document.createElement('label');
   p.className='sub';
   p.textContent='Время приёма ';
   const input=document.createElement('input');input.type='time';input.className='field';
   input.value=time;input.style.maxWidth='170px';
   input.onchange=()=>updateMed(name,{time:input.value});
   p.appendChild(input);row.appendChild(p);
 });
 let note=document.getElementById('ironNote1193');
 if(!note){note=document.createElement('div');note.id='ironNote1193';note.className='notice';document.getElementById('medSetup').appendChild(note)}
 note.textContent='Железо в 13:00: разносить с Магнеротом и добавками кальция/цинка; не запивать чаем, кофе или молоком. Время 20:00 для Магнерота — предложенное вечернее время, проверь соответствие назначению. Напоминания телефона пока не подключены.';
};
const renderCalendarOld=renderCalendar;
renderCalendar=function(){
 renderCalendarOld();
 if(current!=='2026-11-09')return;
 const hint=document.getElementById('mealPrepHint1192');
 if(hint)hint.textContent='Первая готовка перенесена на вечер понедельника 9 ноября; вторая — на среду 11 ноября. Офисные завтрак и обед 9 ноября не оцениваются по калориям без фактического состава. Основной контейнер 500 мл, овощной 240 мл.';
 const c=document.getElementById('dayMenu');
 if(!c||selected<'2026-11-12'||selected>'2026-11-14')return;
 const p=document.createElement('p');p.className='notice';
 p.textContent='Внимание: рассчитанные калории этих дней могут быть недостаточными. Добавь полноценную еду/перекус по аппетиту и назначенной цели калорийности; расчёт будет точнее после уточнения реальных порций.';
 c.appendChild(p);
};
const oldShop=renderShop;
renderShop=function(){
 oldShop();
 if(current==='2026-11-09'){
  const p=document.createElement('p');p.className='sub';
  p.textContent='Первая закупка — вечер 9 ноября, вторая — 11 ноября. Учитываются реальные запасы; ничего не отмечено купленным автоматически.';
  document.getElementById('shopProgress')?.appendChild(p);
 }
};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.3');
renderAll();
})();