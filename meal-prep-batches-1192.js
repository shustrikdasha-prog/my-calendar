/* 11.9.2 — agreed Nov 9–15 batch plan: two cooking days (Mon and Wed), no repeat purchases. */
(function(){
'use strict';
const WEEK='2026-11-09', SUN='2026-11-09', WED='2026-11-11';
const PREP={
 chicken_quinoa_1192:{date:SUN,freezeDates:[]},
 turkey_meatballs_1192:{date:SUN,freezeDates:['2026-11-15']},
 cottage_casserole_1192:{date:SUN,freezeDates:['2026-11-12']},
 apple_crumble_1192:{date:SUN,freezeDates:[]},
 beef_stew_1192:{date:WED,freezeDates:['2026-11-15']},
 chicken_lentil_soup_1192:{date:WED,freezeDates:[]}
};
const originalBatches1192=batchesForWeek;
function prepJobs1192(){
 const all=originalBatches1192(WEEK),planned=new Map(),other=[];
 for(const job of all){
  const plan=PREP[job.id];
  if(!plan){other.push(job);continue}
  const merged=planned.get(job.id)||{...job,date:plan.date,uses:[],count:0,freeze:0,key:'cook:'+plan.date+':'+job.id};
  merged.uses.push(...job.uses);planned.set(job.id,merged);
 }
 return [...other,...[...planned.values()].map(job=>{
  const cfg=PREP[job.id];
  job.uses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
  job.count=job.uses.length;
  job.freeze=job.uses.filter(u=>cfg.freezeDates.includes(u.date)).length;
  // Shift a *not-yet-cooked* batch if its earliest remaining meal is at least
  // two days after the original preparation day. Cook the day before first use.
  // Completed batches retain their original keys and history.
  const firstUse=job.uses[0]?.date;
  const originalKey='cook:'+cfg.date+':'+job.id;
  const completed=state.cookDone?.[originalKey];
  const movedDay=firstUse&&firstUse>addDays(cfg.date,1)&&!completed?addDays(firstUse,-1):cfg.date;
  if(movedDay!==cfg.date){
   job.date=movedDay;
   job.key='cook:'+movedDay+':'+job.id;
  }
  return job;
 })].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
}
batchesForWeek=function(w=current){
 if(w===WEEK)return prepJobs1192();
 const old=originalBatches1192(w);
 if(w===weekStart(SUN))return [...old,...prepJobs1192().filter(j=>j.date===SUN)];
 return old;
};
const SIDE_DEFAULT1192={cucumber:50,tomato:25,cabbage:35};
function lunchSide1192(date){
 const saved=state.lunchVeg1192?.[date]||{};
 return Object.fromEntries(Object.entries(SIDE_DEFAULT1192).map(([key,value])=>
  [key,Number.isFinite(Number(saved[key]))&&Number(saved[key])>=0?Number(saved[key]):value]));
}
const earlierShopping1192=shopping;
shopping=function(batch){
 if(current!==WEEK)return earlierShopping1192(batch);
 const stock=stockMap(),requests=[new Map(),new Map()];
 function add(index,name,unit,amount){
  if(!name||!Number.isFinite(amount)||amount<=0||unit==='порция'||
     /^(вода|соль|зелень|ваниль|укроп|специи)/i.test(name))return;
  const key=normalizeShopName(name)+'|'+unit;
  const row=requests[index].get(key)||{name:normalizeShopName(name),unit,qty:0};
  row.qty+=amount;requests[index].set(key,row);
 }
 const recipesForWeek=recipes();
 for(const job of batchesForWeek(WEEK)){
  const index=job.date<=addDays(WEEK,2)?0:1;
  if(state.cookDone?.[job.key])continue;
  // Uses reflect only lunches still planned at home or in a container.
  for(const item of editableIngredients(job.recipe,job.count))add(index,item.name,item.unit,item.qty);
 }
 // Quick recipes are prepared/assembled without a batch-cooking task.
 for(const [id,number] of [['overnight_oats_1192',3],['greek_snack_1192',4]]){
  const recipe=recipesForWeek[id];if(!recipe)continue;
  for(const item of editableIngredients(recipe,number))add(1,item.name,item.unit,item.qty);
 }
 // Fresh vegetable boxes are independent of the cooked main meal.
 let totalCabbage=0;
 getWeek(WEEK).days.forEach((day,i)=>{
  const specified=state.lunchMode1201?.[day.date]?.mode;
  const useBox=specified==='container'||(!specified&&/контейнер/i.test(day.meals?.[1]?.title||''));
  if(!useBox)return;
  const v=lunchSide1192(day.date),idx=i<3?0:1;
  add(idx,'Огурец','г',v.cucumber);add(idx,'Помидоры','г',v.tomato);
  totalCabbage+=v.cabbage;
 });
 add(0,'Капуста','г',totalCabbage);
 const deduct=items=>[...items.values()].map(item=>{
  const key=normalizeShopName(item.name)+'|'+item.unit,remaining=stock.get(key)||0;
  const used=Math.min(remaining,item.qty);stock.set(key,Math.max(0,remaining-used));
  return {...item,qty:Math.round((item.qty-used)*10)/10};
 }).filter(item=>item.qty>0.01).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const first=deduct(requests[0]),second=deduct(requests[1]);
 return batch===0?first:second;
};
// Keep an existing second shopping day aligned with deferred cooking.
// Never move an already-completed shopping trip or a user-customized date.
const originalShopDates1192=shopDates;
shopDates=function(w=current){
 const days=originalShopDates1192(w);
 if(w!==WEEK)return days;
 const second=days[1],early='2026-11-11';
 const jobs=prepJobs1192().filter(j=>!state.cookDone?.[j.key]&&j.date>=early);
 if(second===early&&!isDone('shopping-trip:'+WEEK+':1')&&jobs.length&&!jobs.some(j=>j.date===early)){
  const first=jobs.map(j=>j.date).sort()[0];
  if(first>early)return [days[0],first];
 }
 return days;
};
const earlierRenderCalendar1192=renderCalendar;
renderCalendar=function(){
 earlierRenderCalendar1192();
 if(current!==WEEK)return;
 const host=document.getElementById('dayMenu');if(!host)return;
 // Old generic vegetable side box assumed portions of 120g + 100g.
 host.querySelectorAll('.veg-add-on').forEach(node=>node.remove());
 const lunch=host.querySelectorAll('.meal')[1];
 if(lunch){
  const v=lunchSide1192(selected);
  const line=document.createElement('div');line.className='veg-add-on';
  line.style.cssText='margin:8px 0;padding:9px 11px;background:#f5e8d4;border-radius:12px;font-size:13px';
  line.textContent='Овощной контейнер 240 мл: огурец '+v.cucumber+' г, помидоры '+v.tomato+' г, капуста '+v.cabbage+' г. ';
  const edit=document.createElement('button');
  edit.type='button';edit.className='link';edit.textContent='Изменить';
  edit.onclick=()=>{
   const values=lunchSide1192(selected);
   popup('Овощи на один обед',
    '<p class="sub">Контейнер 240 мл. Укажи сколько граммов каждого продукта нарезать: список покупок пересчитается автоматически.</p>'+
    [['cucumber','Огурец'],['tomato','Помидоры'],['cabbage','Капуста']].map(([id,label])=>
      '<label>'+label+' (г)<input class="field" type="number" min="0" max="240" step="5" id="side1192_'+id+'" value="'+values[id]+'"></label>').join('')+
    '<button type="button" id="modalSave" class="btn">Сохранить</button>',()=>{
      const next=Object.fromEntries(Object.keys(SIDE_DEFAULT1192).map(key=>
       [key,Number(document.getElementById('side1192_'+key).value)]));
      if(Object.values(next).some(v=>!Number.isFinite(v)||v<0||v>240)||
         Object.values(next).reduce((a,b)=>a+b,0)>220){alert('Для контейнера 240 мл укажи суммарно не более 220 г овощей.');return false}
      state.lunchVeg1192??={};state.lunchVeg1192[selected]=next;
      save();renderAll();return true;
    });
  };
  line.appendChild(edit);lunch.querySelector('.fill')?.appendChild(line);
 }
 const note=document.createElement('p');note.id='mealPrepHint1192';note.className='sub';
 note.textContent='Основной контейнер 500 мл и овощной 240 мл. Вторая готовка: '+strDate(prepJobs1192().filter(j=>j.id==='beef_stew_1192')[0]?.date||WED)+'. Даты готовки подстраиваются под оставшиеся блюда. Калорийность ориентировочная.';
 host.appendChild(note);
};
const earlierRenderShop1192=renderShop;
renderShop=function(){
 earlierRenderShop1192();
 if(current!==WEEK)return;
 const p=document.createElement('p');p.className='sub';
 p.textContent='Закупка №1 — перед первой готовкой; закупка №2 — перед второй готовкой '+strDate(shopDates(WEEK)[1])+'. Крупы и овощи из домашних запасов не добавляются повторно. Красную чечевицу удобнее купить маленькой упаковкой.';
 document.getElementById('shopProgress')?.appendChild(p);
};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.2');
renderAll();
})();