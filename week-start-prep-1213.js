/* 11.10.9 · Sunday cooking for the coming week, pantry-aware batch shopping */
(function(){
'use strict';
const target='2026-11-23',sun='2026-11-22',second='2026-11-26';
const esc=x=>escapes(String(x??''));
function jobList(){return state.smartBatches1204?.[target]?.jobs||[]}
function sundayJobs(){
 if(todayISO()!==sun)return [];
 return batchesForWeek(target).filter(j=>j.date===sun&&!state.cookDone?.[j.key]);
}
function cardMarkup(){
 const jobs=sundayJobs();if(!jobs.length)return '';
 return '<section class="prep-next-1213" id="prepNext1213"><div class="prep-next-head1213"><span>ГОТОВКА НА СЛЕДУЮЩУЮ НЕДЕЛЮ</span><h3>Сегодня готовим на несколько дней</h3>'+
 '<p>Две заготовки сейчас, вторая готовка — в четверг 26 ноября. Сегодняшние блюда появятся в холодильнике только после отметки приготовления.</p></div>'+
 jobs.map(j=>'<div class="prep-next-item1213"><div><b>'+esc(j.recipe.name)+'</b><small>'+j.count+' порц. · '+esc(j.recipe.time||'')+'</small></div>'+
 '<button type="button" data-next-recipe="'+esc(j.id)+'">Рецепт</button><button type="button" class="prep-next-primary1213" data-next-cook="'+esc(j.key)+'">Приготовила</button></div>').join('')+
 '<div class="prep-next-actions1213"><button type="button" data-next-shop>Покупки на сегодня</button><span>Для порций на среду и четверг используй морозилку.</span></div></section>';
}
function mount(where){
 const old=where.querySelector('#prepNext1213');old?.remove();
 const html=cardMarkup();if(!html)return;
 where.insertAdjacentHTML('afterbegin',html);
 const node=where.querySelector('#prepNext1213');
 node.querySelectorAll('[data-next-recipe]').forEach(b=>b.onclick=()=>showRecipe(b.dataset.nextRecipe));
 node.querySelectorAll('[data-next-cook]').forEach(b=>b.onclick=()=>{
  const job=sundayJobs().find(j=>j.key===b.dataset.nextCook);
  if(job)cookJob(job);
 });
 node.querySelector('[data-next-shop]')?.addEventListener('click',()=>{
  current=target;selected=target;
  document.querySelector('[data-tab="shop"]')?.click();
 });
}
function displayToday(){
 const where=document.getElementById('dashboard1198');
 if(where)mount(where);
}
function displayKitchen(){
 const where=document.getElementById('portions');
 if(where){
  // Ensure there is only one card per host and do not cover the kitchen title.
  const existing=where.querySelector('#prepNext1213');existing?.remove();
  const html=cardMarkup();if(!html)return;
  const below=where.querySelector('.portion-nav')||where.querySelector('#portionCards');
  if(below)below.insertAdjacentHTML('beforebegin',html);else where.insertAdjacentHTML('afterbegin',html);
  const node=where.querySelector('#prepNext1213');
  node.querySelectorAll('[data-next-recipe]').forEach(b=>b.onclick=()=>showRecipe(b.dataset.nextRecipe));
  node.querySelectorAll('[data-next-cook]').forEach(b=>b.onclick=()=>{
   const job=sundayJobs().find(j=>j.key===b.dataset.nextCook);if(job)cookJob(job);
  });
  node.querySelector('[data-next-shop]')?.addEventListener('click',()=>{current=target;selected=target;document.querySelector('[data-tab="shop"]')?.click()});
 }
}
const oldToday=renderToday;
renderToday=function(){oldToday();displayToday()};
const oldPortions=renderPortions;
renderPortions=function(){oldPortions();displayKitchen()};

// The normal shopping engine splits ingredients at Wednesday. Our Sunday
// batch serves Mon-Thu, so include the full quantities in Sunday's shop.
const oldShopping=shopping;
shopping=function(batch){
 if(current!==target)return oldShopping(batch);
 const map=[new Map(),new Map()],stock=stockMap();
 function add(i,x){
  if(!x?.name||!Number.isFinite(Number(x.qty))||Number(x.qty)<=0||x.unit==='порция'||/^(вода|соль|укроп|специи|паприка)/i.test(x.name))return;
  const k=normalizeShopName(x.name)+'|'+x.unit;
  const existing=map[i].get(k)||{name:x.name,unit:x.unit,qty:0};
  existing.qty+=Number(x.qty);map[i].set(k,existing);
 }
 const all=recipes(),batchIds=new Set();
 for(const j of jobList()){
  batchIds.add(j.id);
  if(state.cookDone?.['cook:'+j.date+':'+j.id])continue;
  const recipe=all[j.id];if(!recipe)continue;
  for(const item of editableIngredients(recipe,j.count))add(j.date<=sun?0:1,item);
 }
 const days=state.weeks?.[target]?.days||[];
 for(let i=0;i<days.length;i++){
  const d=days[i];for(let slot=0;slot<4;slot++){
   const m=d.meals?.[slot];
   if(!m?.recipeId||batchIds.has(m.recipeId)||m.readyId||m.outside||isDone('meal:'+d.date+':'+slot)||state.mealConsumed?.['meal:'+d.date+':'+slot])continue;
   const r=all[m.recipeId];if(!r)continue;
   for(const item of editableIngredients(r,1))add(i<3?0:1,item);
  }
 }
 const deduct=m=>[...m.values()].map(x=>{
  const k=normalizeShopName(x.name)+'|'+x.unit,have=stock.get(k)||0;
  const taken=Math.min(have,x.qty);stock.set(k,Math.max(0,have-taken));
  return {...x,qty:Math.round((x.qty-taken)*10)/10};
 }).filter(x=>x.qty>0.01).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 const x=deduct(map[0]),y=deduct(map[1]);return batch===0?x:y;
};
displayToday();displayKitchen();
document.querySelectorAll('.footer').forEach(x=>x.textContent='Версия 11.10.9');
})();