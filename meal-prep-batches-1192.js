/* 11.9.2: two meal-prep days, correct shopping allocation and 500 ml office lunch portions. */
(function(){
'use strict';
const WEEK='2026-11-09';
const SUNDAY='2026-11-08';
const WEDNESDAY='2026-11-11';
const PREP={
 chicken_quinoa_1192:{date:SUNDAY,freezeDates:[]},
 turkey_meatballs_1192:{date:SUNDAY,freezeDates:['2026-11-15']},
 cottage_casserole_1192:{date:SUNDAY,freezeDates:['2026-11-12']},
 apple_crumble_1192:{date:SUNDAY,freezeDates:[]},
 beef_stew_1192:{date:WEDNESDAY,freezeDates:['2026-11-15']},
 chicken_lentil_soup_1192:{date:WEDNESDAY,freezeDates:[]}
};
const previousBatches=batchesForWeek;
function weeklyJobs1192(){
 const original=previousBatches(WEEK),grouped=new Map(),other=[];
 for(const job of original){
  const setting=PREP[job.id];
  if(!setting){other.push(job);continue}
  const existing=grouped.get(job.id)||{...job,date:setting.date,uses:[],count:0,freeze:0,key:'cook:'+setting.date+':'+job.id};
  existing.uses.push(...job.uses);
  grouped.set(job.id,existing);
 }
 return [...other,...[...grouped.values()].map(job=>{
  const setting=PREP[job.id];
  job.uses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
  job.count=job.uses.length;
  job.freeze=job.uses.filter(u=>setting.freezeDates.includes(u.date)).length;
  return job;
 })].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
}
batchesForWeek=function(w=current){
 const usual=w===WEEK?weeklyJobs1192():previousBatches(w);
 if(w!==weekStart(SUNDAY))return usual;
 // 8 Nov belongs to the previous calendar week; display Sunday's next-week
 // preparation there without moving or altering previous-week meals.
 return [...usual,...weeklyJobs1192().filter(job=>job.date===SUNDAY)];
};
const previousShopping=shopping;
shopping=function(batch){
 if(current!==WEEK)return previousShopping(batch);
 const stock=stockMap(),request=[new Map(),new Map()];
 function add(index,name,unit,amount){
  if(!name||!(amount>0)||unit==='порция'||/^(вода|соль|зелень|ваниль|укроп|специи|перец черный)/i.test(name))return;
  const key=normalizeShopName(name)+'|'+unit;
  const row=request[index].get(key)||{name:normalizeShopName(name),unit,qty:0};
  row.qty+=amount;request[index].set(key,row);
 }
 const jobs=weeklyJobs1192();
 for(const job of jobs){
  const idx=job.date===SUNDAY?0:1;
  // A completed batch has already deducted the actual inventory.
  if(state.cookDone?.[job.key])continue;
  for(const item of editableIngredients(job.recipe,job.count))add(idx,item.name,item.unit,item.qty);
 }
 const r=recipes();
 // Cold breakfast is assembled during Wednesday's prep. Yogurt snacks require
 // no cooking but do need ingredients on the second shopping trip.
 for(const [id,count] of [['overnight_oats_1192',3],['greek_snack_1192',4]]){
  const recipe=r[id];if(!recipe)continue;
  for(const item of editableIngredients(recipe,count))add(1,item.name,item.unit,item.qty);
 }
 // 7 portable lunches, each with a separate 240 ml vegetable box.
 // Divide available vegetables between trips while using home stock once.
 add(0,'Огурец','г',150);add(0,'Помидоры','г',75);
 add(1,'Огурец','г',200);add(1,'Помидоры','г',100);
 // The small cabbage is bought once; only its edible needed mass is counted.
 add(0,'Капуста','г',245);
 function subtract(index){
  return [...request[index].values()].map(row=>{
   const key=normalizeShopName(row.name)+'|'+row.unit,available=stock.get(key)||0;
   const use=Math.min(available,row.qty);
   stock.set(key,Math.max(0,available-use));
   return {...row,qty:Math.round((row.qty-use)*10)/10};
  }).filter(row=>row.qty>0.01).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 }
 const first=subtract(0),second=subtract(1);
 return batch===0?first:second;
};
const priorRenderCalendar=renderCalendar;
renderCalendar=function(){
 priorRenderCalendar();
 if(current!==WEEK)return;
 const dayMenu=document.getElementById('dayMenu');
 if(!dayMenu||dayMenu.querySelector('#mealPrepHint1192'))return;
 const note=document.createElement('p');
 note.id='mealPrepHint1192';note.className='sub';
 note.textContent='Обеды уже приготовлены заранее: основной контейнер 500 мл + овощной 240 мл. Готовки: вс 8.11 и ср 11.11. Запланированные порции нужно отметить после фактического приготовления.';
 dayMenu.appendChild(note);
};
const priorRenderShop=renderShop;
renderShop=function(){
 priorRenderShop();
 if(current!==WEEK)return;
 const el=document.getElementById('shopProgress');
 if(el){
  const p=document.createElement('p');p.className='sub';
  p.textContent='Закупка №1 — перед готовкой в воскресенье 8 ноября, №2 — перед готовкой в среду 11 ноября. Крупы и овощи из запасов вычитаются один раз.';
  el.appendChild(p);
 }
};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.2');
renderAll();
})();