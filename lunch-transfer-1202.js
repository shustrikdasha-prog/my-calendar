/* v11.10.2 — optional safe rescheduling of an unused home lunch after buying at office.
   Never consumes, creates or moves stock by itself; one confirmed menu substitution only. */
(function(){
'use strict';
const esc=s=>escapes(String(s??''));
const slotLabel=['Завтрак','Обед','Перекус','Ужин'];
const records=()=>state.lunchTransfers1202||{};
const hasOwn=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
function original(date){
 const row=state.lunchMode1201?.[date];
 if(row?.mode!=='buy')return null;
 const m=row.original;
 return m&&typeof m==='object'&&m.title&&!m.outside?m:null;
}
function pending(date){return records()[date]||null}
function transferCandidates(source){
 const base=source>todayISO()?source:todayISO();
 const list=[];
 for(let offset=0;offset<=6;offset++){
  const date=addDays(base,offset);
  if(date===source)continue;
  for(const slot of [1,3]){
   const key='meal:'+date+':'+slot;
   if(isDone(key)||state.mealConsumed?.[key])continue;
   if(Object.values(records()).some(r=>r.date===date&&r.slot===slot))continue;
   const meal=getDay(date)?.meals?.[slot];
   if(!meal||meal.outside)continue;
   if(slot===1&&state.lunchMode1201?.[date]?.mode==='buy')continue;
   list.push({date,slot,meal});
  }
 }
 return list;
}
function noteFor(originalMeal,targetDate){
 const related=(state.ready||[]).filter(row=>Number(row.qty)>0&&row.recipeId&&row.recipeId===originalMeal.recipeId);
 if(!related.length)return 'Готовых порций этого блюда в учёте нет. Перенос изменит только план: продукты и приготовление проверь отдельно.';
 const fridge=related.filter(x=>x.place!=='freezer'),frozen=related.filter(x=>x.place==='freezer');
 if(fridge.length){
  const dated=fridge.map(x=>x.date).filter(Boolean);
  if(!dated.length)return 'Есть порции в холодильнике, но дата приготовления неизвестна. Проверь безопасность хранения.';
  const newest=dated.sort().at(-1);
  const days=Math.round((Date.parse(targetDate+'T12:00:00Z')-Date.parse(newest+'T12:00:00Z'))/86400000);
  if(days>3)return 'Внимание: на выбранную дату еда в холодильнике будет старше 3 дней. Проверь срок и условия хранения; безопаснее не рассчитывать на неё без проверки.';
  return 'Есть '+fridge.reduce((s,x)=>s+Number(x.qty),0)+' готовых порций в холодильнике. Проверь фактический срок хранения и соответствие нужному объёму.';
 }
 if(frozen.length)return 'Блюдо числится в морозилке. Запланируй безопасное размораживание в холодильнике перед обедом.';
 return 'Проверь доступность готовых порций.';
}
function goMenu(date){
 current=weekStart(date);selected=date;
 document.querySelector('[data-tab="calendar"]')?.click();
 renderAll();
 document.getElementById('dayMenu')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function openTransfer(source){
 if(pending(source))return alert('Этот обед уже перенесён. Сначала отмени перенос, чтобы выбрать новый день.');
 const from=original(source);
 if(!from)return alert('Домашнее блюдо для переноса не найдено. Выбери «Покупаю в офисе» и сохрани прежний обед.');
 const choices=transferCandidates(source);
 if(!choices.length)return alert('Нет свободных обедов или ужинов в ближайшие семь дней. Измени план вручную в календаре.');
 const options=choices.map((x,i)=>'<option value="'+i+'">'+esc(strDate(x.date))+' · '+slotLabel[x.slot]+' · сейчас: '+esc(x.meal.title)+'</option>').join('');
 popup('Куда перенести домашний обед?',
  '<p><b>'+esc(from.title)+'</b></p>'+
  '<p class="sub">После подтверждения это блюдо займёт выбранный приём пищи. Прежний вариант сохранится в истории переноса, чтобы можно было вернуть его. Запасы и готовые порции не списываются.</p>'+
  '<label>Выбрать день и приём пищи<select id="lunchTransferTarget1202" class="field">'+options+'</select></label>'+
  '<p id="lunchTransferPreview1202" class="lunch-transfer-preview1202"></p>'+
  '<button class="btn" type="button" id="modalSave">Перенести блюдо</button>',()=>{
   const index=Number(document.getElementById('lunchTransferTarget1202').value),dest=choices[index];
   if(!dest)return false;
   if(!original(source)||pending(source)||isDone('meal:'+dest.date+':'+dest.slot)||state.mealConsumed?.['meal:'+dest.date+':'+dest.slot]){
    alert('План успел измениться. Закрой окно и выбери дату заново.');return false;
   }
   const destMeal=getDay(dest.date)?.meals?.[dest.slot];
   if(!destMeal||JSON.stringify(destMeal)!==JSON.stringify(dest.meal)){
    alert('Блюдо в выбранный день изменилось. Открой перенос заново.');return false;
   }
   const message='Перенести «'+from.title+'» на '+strDate(dest.date)+' ('+slotLabel[dest.slot].toLowerCase()+')?\n\nЭто заменит «'+destMeal.title+'» в плане. Исходное блюдо останется доступно при отмене переноса.\n\n'+noteFor(from,dest.date);
   if(!confirm(message))return false;
   const replacement=clone(from);
   state.lunchTransfers1202??={};
   state.lunchTransfers1202[source]={date:dest.date,slot:dest.slot,replacement:clone(replacement),previous:clone(destMeal),sourceTitle:from.title};
   getDay(dest.date).meals[dest.slot]=replacement;
   save();renderAll();return true;
  });
 const select=document.getElementById('lunchTransferTarget1202'),preview=document.getElementById('lunchTransferPreview1202');
 const update=()=>{const dest=choices[Number(select.value)];preview.textContent=dest?noteFor(from,dest.date):''};
 select.addEventListener('change',update);update();
}
function undo(source,quiet=false){
 const rec=pending(source);
 if(!rec)return true;
 const day=getDay(rec.date),now=day?.meals?.[rec.slot],key='meal:'+rec.date+':'+rec.slot;
 if(isDone(key)||state.mealConsumed?.[key]){if(!quiet)alert('Перенесённое блюдо уже отмечено съеденным. Сначала сними отметку, затем отмени перенос.');return false}
 if(!now){if(!quiet)alert('Целевой день недоступен.');return false}
 if(JSON.stringify(now)!==JSON.stringify(rec.replacement)){
  if(!quiet)alert('Целевое блюдо было отредактировано после переноса. Чтобы не затереть изменения, автоматическая отмена недоступна. Исправь меню вручную.');
  return false;
 }
 if(!quiet&&!confirm('Отменить перенос и вернуть на '+strDate(rec.date)+' блюдо «'+rec.previous.title+'»?'))return false;
 day.meals[rec.slot]=clone(rec.previous);
 delete state.lunchTransfers1202[source];
 save();renderAll();
 return true;
}
// Called before switching a bought lunch back to a home/container lunch.
// Do not create duplicates when original lunch is restored.
window.chtoPoestTransfer1202={
 beforeModeChange(date,next){
  if(next==='buy'||!pending(date))return true;
  if(!confirm('Домашний обед был перенесён на другой день. При возврате к домашнему обеду отменить этот перенос, чтобы не планировать одну порцию дважды?'))return false;
  return undo(date,true);
 }
};
function attach(){
 document.querySelectorAll('.lunch-panel1201').forEach(panel=>{
  panel.querySelectorAll('.lunch-transfer1202').forEach(n=>n.remove());
  const date=panel.querySelector('[data-lunch-date]')?.dataset.lunchDate;
  if(!date)return;
  const rec=pending(date),from=original(date);
  if(!rec&&!from)return;
  const wrap=document.createElement('div');wrap.className='lunch-transfer1202';
  if(rec){
   const text=document.createElement('p');
   text.textContent='Домашнее блюдо перенесено: '+strDate(rec.date)+' · '+slotLabel[rec.slot].toLowerCase()+'.';
   const btn=document.createElement('button');btn.type='button';btn.textContent='Отменить перенос';btn.onclick=()=>undo(date);
   const go=document.createElement('button');go.type='button';go.textContent='Открыть день →';go.onclick=()=>goMenu(rec.date);
   wrap.append(text,btn,go);
  }else{
   const text=document.createElement('p');text.textContent='Домашнее блюдо можно запланировать на другой день, чтобы не забыть о нём.';
   const btn=document.createElement('button');btn.type='button';btn.textContent='Подобрать день для порции →';btn.onclick=()=>openTransfer(date);
   wrap.append(text,btn);
  }
  panel.appendChild(wrap);
 });
}
const prevAll=renderAll;
renderAll=function(){prevAll();attach()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.10.2');
attach();
})();