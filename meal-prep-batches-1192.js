/* 11.9.2 — Nov 9–15 menu: two prep sessions and inventory-aware shopping. */
(function(){
 'use strict';
 const WEEK='2026-11-09',SUNDAY='2026-11-08',WEDNESDAY='2026-11-11';
 const PREP={
  chicken_quinoa_1192:[{first:'2026-11-09',date:SUNDAY,freezeDates:[]}],
  turkey_meatballs_1192:[
   {first:'2026-11-09',date:SUNDAY,freezeDates:[]},
   {first:'2026-11-15',date:WEDNESDAY,freezeDates:['2026-11-15']}
  ],
  cottage_casserole_1192:[
   {first:'2026-11-09',date:SUNDAY,freezeDates:[]},
   {first:'2026-11-12',date:WEDNESDAY,freezeDates:['2026-11-12']}
  ],
  apple_crumble_1192:[{first:'2026-11-09',date:SUNDAY,freezeDates:[]}],
  beef_stew_1192:[
   {first:'2026-11-12',date:WEDNESDAY,freezeDates:[]},
   {first:'2026-11-15',date:WEDNESDAY,freezeDates:['2026-11-15']}
  ],
  chicken_soup_1192:[{first:'2026-11-12',date:WEDNESDAY,freezeDates:[]}]
 };
 const originalBatches1192=batchesForWeek;
 function mapJobs1192(jobs){
  const merged=new Map();
  for(const job of jobs){
   const first=job.uses?.[0]?.date,rule=PREP[job.id]?.find(x=>x.first===first);
   const mapped=rule?{...job,date:rule.date,freeze:job.uses.filter(u=>rule.freezeDates.includes(u.date)).length,key:'cook:'+rule.date+':'+job.id}:job;
   const prior=merged.get(mapped.key);
   if(prior){
    prior.uses.push(...mapped.uses);
    prior.uses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
    prior.count=prior.uses.length;
    prior.freeze+=mapped.freeze||0;
   }else merged.set(mapped.key,{...mapped,uses:[...(mapped.uses||[])]});
  }
  return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
 }
 batchesForWeek=function(w=current){
  const jobs=mapJobs1192(originalBatches1192(w));
  // The first session is Sunday, one day before the menu's Monday-start week.
  if(w===weekStart(SUNDAY)){
   const sundayJobs=mapJobs1192(originalBatches1192(WEEK)).filter(j=>j.date===SUNDAY);
   return [...jobs,...sundayJobs].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
  }
  return jobs;
 };
 const oldNormalize1192=normalizeShopName;
 normalizeShopName=function(value){
  const key=oldNormalize1192(value);
  const aliases={'греческий йогурт':'йогурт','йогурт натуральный':'йогурт'};
  return aliases[key]||key;
 };
 const VEG1192={
  cucumber:{ingredient:'огурец',qty:120,unit:'г'},
  tomato:{ingredient:'помидоры',qty:100,unit:'г'},
  carrot:{ingredient:'морковь',qty:120,unit:'г'},
  zucchini:{ingredient:'кабачок',qty:170,unit:'г'},
  pepper:{ingredient:'сладкий перец',qty:140,unit:'г'}
 };
 function sides1192(date,slot){
  return ((state.vegetableSides||{})[date+':'+slot]||[]).map(id=>VEG1192[id]).filter(Boolean);
 }
 const originalShopping1192=shopping;
 shopping=function(batch){
  if(current!==WEEK)return originalShopping1192(batch);
  const days=getWeek(WEEK).days,stock=stockMap(),requests=[new Map(),new Map()];
  function add(index,name,unit,qty){
   if(!name||!Number.isFinite(Number(qty))||qty<=0||unit==='порция'||/^(вода|соль|зелень|ваниль|укроп|специи)/i.test(name))return;
   const key=namedUnit(name,unit),row=requests[index].get(key)||{name,unit,qty:0};
   row.qty+=Number(qty);requests[index].set(key,row);
  }
  const covered=new Set(),allocated=new Map();
  for(const job of batchesForWeek()){
   const done=state.cookDone?.[job.key];if(!done)continue;
   for(const use of (job.uses||[]).slice(0,Number(done.count)||0)){
    covered.add(mealKey(use.date,use.slot));
    allocated.set(job.id,(allocated.get(job.id)||0)+1);
   }
  }
  const prepared=new Map();
  for(const row of state.ready||[])if(row.recipeId&&Number(row.qty)>0)
   prepared.set(row.recipeId,(prepared.get(row.recipeId)||0)+Number(row.qty));
  for(const [id,count] of allocated)
   prepared.set(id,Math.max(0,(prepared.get(id)||0)-count));
  const recipeMap=recipes();
  days.forEach((day,i)=>{
   const index=i<3?0:1;
   day.meals.forEach((meal,slot)=>{
    const key=mealKey(day.date,slot);
    if(meal.outside||isDone(key))return;
    const recipe=meal.recipeId?recipeMap[meal.recipeId]:null;
    const alreadyPrepared=!!meal.readyId||covered.has(key);
    if(recipe&&!alreadyPrepared){
     if((prepared.get(recipe.id)||0)>0)prepared.set(recipe.id,prepared.get(recipe.id)-1);
     else for(const item of editableIngredients(recipe,1))add(index,item.name,item.unit,item.qty);
    }
    // Add fresh sides even when the main dish is already batch-cooked.
    for(const item of sides1192(day.date,slot))add(index,item.ingredient,item.unit,item.qty);
   });
  });
  const deduct=items=>[...items.values()].map(item=>{
   const key=namedUnit(item.name,item.unit),available=stock.get(key)||0,used=Math.min(available,item.qty);
   stock.set(key,Math.max(0,available-used));
   return {...item,qty:roundQ(item.qty-used)};
  }).filter(item=>item.qty>.001).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  const lists=[deduct(requests[0]),deduct(requests[1])];
  return lists[batch]||[];
 };
 document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.2');
 renderAll();
})();