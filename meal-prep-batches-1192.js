/* 11.9.2 — explicit prep dates and inventory-aware shopping for the Nov 9–15 plan. */
(function(){
 'use strict';
 const PREP={
  chicken_quinoa_1192:[{first:'2026-11-09',date:'2026-11-08',freezeDates:[]}],
  turkey_meatballs_1192:[
   {first:'2026-11-09',date:'2026-11-08',freezeDates:[]},
   {first:'2026-11-15',date:'2026-11-11',freezeDates:['2026-11-15']}
  ],
  cottage_casserole_1192:[
   {first:'2026-11-09',date:'2026-11-08',freezeDates:[]},
   {first:'2026-11-12',date:'2026-11-11',freezeDates:['2026-11-12']}
  ],
  apple_crumble_1192:[{first:'2026-11-09',date:'2026-11-08',freezeDates:[]}],
  beef_stew_1192:[
   {first:'2026-11-12',date:'2026-11-11',freezeDates:[]},
   {first:'2026-11-15',date:'2026-11-11',freezeDates:['2026-11-15']}
  ],
  chicken_soup_1192:[{first:'2026-11-12',date:'2026-11-11',freezeDates:[]}]
 };
 const previousBatches1192=batchesForWeek;
 function mapJobs1192(jobs){
  const grouped=new Map();
  for(const job of jobs){
   const rules=PREP[job.id],first=job.uses?.[0]?.date;
   const rule=rules?.find(x=>x.first===first);
   const mapped=rule?{...job,date:rule.date,freeze:job.uses.filter(u=>rule.freezeDates.includes(u.date)).length,key:'cook:'+rule.date+':'+job.id}:job;
   const prior=grouped.get(mapped.key);
   if(prior){
    prior.uses.push(...mapped.uses);
    prior.uses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
    prior.count=prior.uses.length;
    prior.freeze=prior.uses.filter(use=>PREP[prior.id]?.some(rule=>rule.date===prior.date&&rule.freezeDates.includes(use.date))).length;
   }else grouped.set(mapped.key,{...mapped,uses:[...mapped.uses]});
  }
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
 }
 batchesForWeek=function(w=current){
  const jobs=mapJobs1192(previousBatches1192(w));
  // Surface Sunday's first prep batch on the current (Nov 2–8) calendar and Today view.
  if(w==='2026-11-02'){
   const upcoming=mapJobs1192(previousBatches1192('2026-11-09')).filter(j=>j.date>='2026-11-02'&&j.date<='2026-11-08');
   return [...jobs,...upcoming].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
  }
  return jobs;
 };
 const previousNormalize1192=normalizeShopName;
 normalizeShopName=function(value){
  const key=previousNormalize1192(value);
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
 const previousShopping1192=shopping;
 shopping=function(batch){
  // The legacy early-start week keeps its Fri–Sun-only purchase window.
  const week=getWeek(),stock=stockMap(),all=[new Map(),new Map()];
  const covered=new Set(),allocated=new Map();
  for(const job of batchesForWeek()){
   const done=state.cookDone?.[job.key];if(!done)continue;
   for(const use of (job.uses||[]).slice(0,Number(done.count)||0)){
    covered.add(mealKey(use.date,use.slot));
    allocated.set(job.id,(allocated.get(job.id)||0)+1);
   }
  }
  const prepared=new Map();
  for(const row of state.ready||[])if(row.recipeId&&Number(row.qty)>0)prepared.set(row.recipeId,(prepared.get(row.recipeId)||0)+Number(row.qty));
  for(const [id,count] of allocated)prepared.set(id,Math.max(0,(prepared.get(id)||0)-count));
  week.days.forEach((day,i)=>{
   const b=state.kickoffPlanV113&&current==='2026-11-02'?(i>=4?0:-1):(i<3?0:1);
   if(b<0)return;
   day.meals.forEach((meal,slot)=>{
    const key=mealKey(day.date,slot);
    if(meal.outside||isDone(key))return;
    const recipe=meal.recipeId?recipes()[meal.recipeId]:null;
    const mealCovered=!!meal.readyId||covered.has(key);
    if(recipe&&!mealCovered){
     if((prepared.get(recipe.id)||0)>0)prepared.set(recipe.id,prepared.get(recipe.id)-1);
     else for(const item of editableIngredients(recipe,1)){
      const k=namedUnit(item.name,item.unit),row=all[b].get(k)||{name:item.name,qty:0,unit:item.unit};
      row.qty+=item.qty;all[b].set(k,row);
     }
    }
    // Fresh sides remain on the list even when the main meal is already batch-cooked.
    for(const item of sides1192(day.date,slot)){
     const k=namedUnit(item.ingredient,item.unit),row=all[b].get(k)||{name:item.ingredient,qty:0,unit:item.unit};
     row.qty+=item.qty;all[b].set(k,row);
    }
   });
  });
  const deduct=map=>[...map.values()].map(item=>{
   const k=namedUnit(item.name,item.unit),left=stock.get(k)||0,used=Math.min(left,item.qty);
   stock.set(k,roundQ(left-used));
   return {...item,qty:roundQ(item.qty-used)};
  }).filter(item=>item.qty>.001);
  const lists=[deduct(all[0]),deduct(all[1])];
  return lists[batch]||[];
 };
 document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.2');
 renderAll();
})();