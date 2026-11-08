/* 11.9.2 — explicit prep dates, including the Sunday before the menu week. */
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
  beef_stew_1192:[{first:'2026-11-12',date:'2026-11-11',freezeDates:['2026-11-15']}],
  chicken_soup_1192:[{first:'2026-11-12',date:'2026-11-11',freezeDates:[]}]
 };
 const previousBatches1192=batchesForWeek;
 function mapJobs1192(jobs){
  return jobs.map(job=>{
   const rules=PREP[job.id],first=job.uses?.[0]?.date;
   const rule=rules?.find(x=>x.first===first);
   if(!rule)return job;
   return {...job,date:rule.date,freeze:job.uses.filter(u=>rule.freezeDates.includes(u.date)).length,key:'cook:'+rule.date+':'+job.id};
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
 }
 batchesForWeek=function(w=current){
  const jobs=mapJobs1192(previousBatches1192(w));
  // The first batch is cooked on Sunday 8 Nov, before the Monday-start menu week.
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
 renderAll();
})();