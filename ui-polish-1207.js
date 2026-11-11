/* 11.10.7 — presentation-only decluttering and independent shopping collapses.
   All underlying checkboxes, stock calculations, medicines and sync remain untouched. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const shopOpen=new Map();
const shopKey=i=>current+'|'+i;
function compactShop(){
 const host=document.getElementById('shopList');
 if(!host)return;
 const cards=[...host.children];
 cards.forEach((card,i)=>{
  if(i>1||!card.classList?.contains('card'))return;
  const details=document.createElement('details');
  details.className='purchase-fold1207';
  details.dataset.batch=String(i);
  const key=shopKey(i);
  details.open=shopOpen.has(key)?shopOpen.get(key):true;
  const header=card.querySelector('.row');
  const heading=header?.querySelector('h3')?.textContent||'Закупка №'+(i+1);
  const tag=header?.querySelector('.tag')?.textContent||'';
  const summary=document.createElement('summary');
  summary.innerHTML='<span class="purchase-title1207">'+escapes(heading)+'</span>'+
    (tag?'<span class="purchase-tag1207">'+escapes(tag)+'</span>':'')+
    '<span class="purchase-arrow1207" aria-hidden="true">⌄</span>';
  details.append(summary,card);
  host.appendChild(details);
  details.addEventListener('toggle',()=>shopOpen.set(key,details.open));
 });
}
const originalShop=renderShop;
renderShop=function(){originalShop();compactShop()};
function hideDuplicateMedicineCalendar(){
 const calendar=document.getElementById('todayMedCalendar');
 // The compact daily medicine checklist is above. The old calendar is duplicated.
 const oldCard=calendar?.closest('.card');
 if(oldCard&&document.getElementById('today')?.contains(oldCard))oldCard.classList.add('secondary-med-calendar1207');
}
function hideTimeGuide(){
 // Remove only the standalone time guide card in the calendar sidebar.
 const cards=[...document.querySelectorAll('#calendar .twocol .card')];
 cards.find(el=>el.querySelector('h3')?.textContent.trim()==='Ориентир по времени')?.classList.add('time-guide-hidden1207');
}
hideDuplicateMedicineCalendar();
hideTimeGuide();
renderShop();
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.10.7');
})();