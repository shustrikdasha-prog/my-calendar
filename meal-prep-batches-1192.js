/* 11.9.2 — explicit meal-prep batch dates for the agreed Nov 9–15 plan. */
(function(){
 'use strict';
 const PREP={
  chicken_quinoa_1192:{date:'2026-11-08',freezeDates:[]},
  turkey_meatballs_1192:{date:'2026-11-08',freezeDates:['2026-11-15']},
  cottage_casserole_1192:{date:'2026-11-08',freezeDates:['2026-11-12']},
  apple_crumble_1192:{date:'2026-11-08',freezeDates:[]},
  beef_stew_1192:{date:'2026-11-11',freezeDates:['2026-11-15']},
  chicken_lentil_soup_1192:{date:'2026-11-11',freezeDates:[]}
 };
 const previousBatches1192=batchesForWeek;
 batchesForWeek=function(w=current){
  const original=previousBatches1192(w),groups=new Map(),other=[];
  for(const job of original){
   const plan=PREP[job.id];
   if(!plan){other.push(job);continue}
   const existing=groups.get(job.id)||{...job,date:plan.date,uses:[],count:0,freeze:0,key:'cook:'+plan.date+':'+job.id};
   existing.uses.push(...job.uses);groups.set(job.id,existing);
  }
  const merged=[...groups.values()].map(job=>{
   const plan=PREP[job.id];
   job.uses.sort((a,b)=>a.date.localeCompare(b.date)||a.slot-b.slot);
   job.count=job.uses.length;
   job.freeze=job.uses.filter(use=>plan.freezeDates.includes(use.date)).length;
   return job;
  });
  return [...other,...merged].sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
 };
 document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.2');
 renderAll();
})();