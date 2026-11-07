/* что поесть? 11.8.8 — read-only planning tools; ratings and local backups are opt-in. */
(function(){
'use strict';
const VERSION='11.8.8';
const byId=id=>document.getElementById(id);
const fmt=(n,u)=>Math.round(n*10)/10+' '+u;
function insertAfter(id,html,tag){
 const host=byId(id);if(!host)return null;
 let node=byId(tag);if(!node){node=document.createElement('section');node.id=tag;node.className='card';host.insertAdjacentElement('afterend',node)}
 node.innerHTML=html;return node;
}
function plannedMeals(){
 return getWeek().days.flatMap(d=>(d.meals||[]).map((m,slot)=>({date:d.date,slot,meal:m})));
}
function smartPortions(){
 const all=(state.ready||[]).filter(r=>Number(r.qty)>0),meals=plannedMeals();
 const rows=all.map(row=>{
  const already=meals.filter(x=>x.meal.readyId===row.id&&!isDone('meal:'+x.date+':'+x.slot)).length;
  const unassigned=meals.filter(x=>!x.meal.readyId&&x.meal.recipeId&&x.meal.recipeId===row.recipeId&&!isDone('meal:'+x.date+':'+x.slot));
  const available=Math.max(0,Number(row.qty)-already);
  const suggestions=unassigned.slice(0,available).map(x=>strDate(x.date)+' · '+slotNames[x.slot]);
  return '<div class="detail-entry"><b>'+escapes(row.name)+'</b> · '+fmt(row.qty,'порц.')+
   '<div class="sub">Уже назначено: '+already+' · свободных в учёте: '+available+
   (suggestions.length?'<div>Можно использовать: '+escapes(suggestions.join('; '))+'</div>':'')+
   '</div></div>';
 });
 const box=insertAfter('portionCards','<h3>Готовые порции без лишней готовки</h3><p class="sub">Подсказки на выбранную неделю. Ничего не списывается и не переносится автоматически. Количество нужно сверять с фактическими контейнерами.</p>'+(rows.join('')||'<p class="sub">Готовых порций пока нет.</p>'),'smartPortions1188');
 return box;
}
function pantryAudit(){
 const stock=stockMap();
 const a=shopping(0),b=shopping(1);
 const needed=[...a,...b];
 const total=needed.length;
 const matched=[...stock.entries()].filter(([,q])=>q>0).length;
 const out=insertAfter('shopProgress','<h3>Проверка запасов</h3><p class="sub">Расчёт учитывает остатки дома по совпадающим названиям и единицам измерения. Один запас не должен покрывать сразу несколько блюд.</p>'+
 '<p><b>Дома: '+matched+' позиций</b> · после учёта запасов остаётся купить '+total+' позиций в двух закупках.</p>'+
 '<details class="secondary-details"><summary>Что ещё требуется по закупкам</summary><div class="details-body">'+
 [a,b].map((list,i)=>'<h4>Закупка №'+(i+1)+'</h4>'+(list.length?'<ul>'+list.map(x=>'<li>'+escapes(x.name)+' — '+fmt(x.qty,escapes(x.unit))+'</li>').join('')+'</ul>':'<p>Дополнительных продуктов нет.</p>')).join('')+
 '<p class="sub">Неизвестные рецепты, разные единицы измерения и уже купленные продукты требуют ручной проверки. Это предварительная проверка, а не повторное списание.</p></div></details>','pantryAudit1188');
 return out;
}
function nutritionCheck(){
 const meals=getDay().meals||[],calc=meals.map(mealNutrition),complete=calc.filter(n=>n&&n.complete);
 const protein=calc.reduce((s,n)=>s+(n?.p||0),0);
 let detail='';
 if(complete.length===4)detail=protein<85?'По справочному расчёту белка меньше ориентира 85–95 г/сутки. Можно заменить перекус на более белковый.':'Расчёт белка по четырём рецептам выполнен; проверь реальные порции.';
 else detail='Полная оценка невозможна: точно рассчитано '+complete.length+'/4 приёмов пищи. Неизвестные блюда и этикетки не следует оценивать наугад.';
 const menu=byId('dayMenu');if(!menu)return;
 let el=byId('nutriAudit1188');if(!el){el=document.createElement('div');el.id='nutriAudit1188';el.className='notice';menu.appendChild(el)}
 el.innerHTML='<b>Проверка баланса</b><div class="sub">'+escapes(detail)+'</div><div class="sub">Сумма белка по известным ингредиентам ≈'+Math.round(protein)+' г; оценка ориентировочная, не медицинская норма.</div>';
}
function ratingButtons(){
 const grid=byId('recipeGrid');if(!grid)return;
 const cards=[...grid.querySelectorAll('.recipe')];
 const visible=Object.values(recipes()).filter(r=>{
  const q=(byId('recipeSearch')?.value||'').trim().toLowerCase(),time=+(byId('recipeTime')?.value||0),only=byId('recipeFavOnly')?.checked;
  return (!state.dislikedRecipes?.[r.id]||q||only)&&(!only||state.favs?.[r.id])&&(!q||(r.name+' '+(r.ingredients||[]).join(' ')).toLowerCase().includes(q))&&(!time||(parseInt(r.time)||999)<=time);
 });
 cards.forEach((card,i)=>{
  const r=visible[i];if(!r)return;
  const value=state.recipeFeedback1188?.[r.id]||'';
  const wrap=document.createElement('div');wrap.className='flex';wrap.style.marginTop='9px';
  wrap.innerHTML='<span class="sub">После готовки:</span> '+[['liked','Понравилось'],['ok','Нормально'],['no','Не повторять']].map(([key,title])=>'<button type="button" class="btn alt" data-rate1188="'+escapes(r.id)+'" data-value1188="'+key+'" aria-pressed="'+(value===key?'true':'false')+'" style="padding:5px 7px;font-size:12px">'+title+'</button>').join('')+
   (value?'<span class="sub">Оценено</span>':'');
  card.appendChild(wrap);
 });
 grid.querySelectorAll('[data-rate1188]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.rate1188,val=b.dataset.value1188;
  state.recipeFeedback1188??={};state.recipeFeedback1188[id]=val;
  if(val==='no'){state.dislikedRecipes??={};state.dislikedRecipes[id]=true}
  else if(state.dislikedRecipes)delete state.dislikedRecipes[id];
  save();enhancedRecipes();
 });
}
function dessertWeekend(){
 const choices=Object.values(recipes()).filter(r=>Number(r.servings)>=3&&/десерт|запеканк|чизкейк|маффин|сырник|печень|кекс|пудинг|пирог/i.test(r.name)&&!state.dislikedRecipes?.[r.id]).slice(0,4);
 const box=insertAfter('smartPortions1188','<h3>Десерт на выходные</h3><p class="sub">Идеи на 3+ порции: приготовить один раз, затем распределить на несколько дней. Выбор не меняет меню и покупки.</p>'+
 (choices.length?choices.map(r=>'<div class="detail-entry"><b>'+escapes(r.name)+'</b> · '+escapes(String(r.servings))+' порц. · <button class="link" type="button" data-dessert1188="'+escapes(r.id)+'">Рецепт</button></div>').join(''):'<p class="sub">Подходящих рецептов пока нет.</p>'),'dessertWeekend1188');
 box?.querySelectorAll('[data-dessert1188]').forEach(b=>b.onclick=()=>showRecipe(b.dataset.dessert1188));
}
function storageHints(){
 const host=byId('readyList');if(!host)return;
 const old=byId('storageHints1188');old?.remove();
 const now=Date.parse(todayISO()+'T12:00:00Z');
 const items=(state.ready||[]).filter(r=>r.qty>0&&r.date).map(r=>{
   const days=Math.floor((now-Date.parse(r.date+'T12:00:00Z'))/86400000);
   if(!Number.isFinite(days)||days<2||r.place==='freezer')return null;
   return '<li><b>'+escapes(r.name)+'</b> — '+days+' дн. с даты приготовления. '+(days>3?'Проверь безопасность хранения; при сомнении не ешь.':'Проверь срок и условия хранения.')+'</li>';
 }).filter(Boolean);
 if(!items.length)return;
 const note=document.createElement('div');note.id='storageHints1188';note.className='notice';
 note.innerHTML='<b>Готовая еда: проверь сроки</b><ul>'+items.join('')+'</ul><p class="sub">Оценка ориентировочная: безопасность зависит от состава, охлаждения и температуры холодильника. Заморозка не делает уже испорченную еду безопасной.</p>';
 host.insertAdjacentElement('afterend',note);
}
function combinedCooking(){
 const jobs=batchesForWeek().filter(x=>x.date===selected&&x.count>1&&!state.cookDone?.[x.key]);
 const host=byId('tasks');if(!host)return;
 byId('combinedCooking1188')?.remove();
 if(jobs.length<2)return;
 const ingredients=new Map();
 for(const job of jobs){
  const serves=Math.max(1,+job.recipe.servings||1);
  for(const item of (job.recipe.items||parseIngredients(job.recipe.ingredients||[]))){
    if(!Number.isFinite(+item.qty)||item.qty<=0||item.unit==='порция')continue;
    const key=normalizeShopName(item.name)+'|'+item.unit;
    const v=ingredients.get(key)||{name:item.name,unit:item.unit,parts:[]};
    v.parts.push({name:job.recipe.name,qty:item.qty*job.count/serves});
    ingredients.set(key,v);
  }
 }
 const shared=[...ingredients.values()].filter(x=>new Set(x.parts.map(p=>p.name)).size>1);
 const box=document.createElement('section');box.id='combinedCooking1188';box.className='card';
 box.innerHTML='<h3>Совместная готовка на несколько порций</h3>'+
 '<p class="sub">Вместе показаны только блюда, где готовится больше одной порции. Каждое блюдо сохраняет собственные пропорции и порядок приготовления. Готовые партии сюда не включены.</p>'+
 (shared.length?'<b>Общие ингредиенты с разбивкой</b><ul>'+shared.map(g=>'<li><b>'+escapes(g.name)+' — '+fmt(g.parts.reduce((s,p)=>s+p.qty,0),escapes(g.unit))+'</b><ul>'+g.parts.map(p=>'<li>'+escapes(p.name)+': '+fmt(p.qty,escapes(g.unit))+'</li>').join('')+'</ul></li>').join('')+'</ul>':'<p class="sub">Одинаковых ингредиентов нет — готовь блюда отдельно.</p>')+
 jobs.map(j=>'<details class="secondary-details"><summary>'+escapes(j.recipe.name)+' · '+j.count+' порц.</summary><div class="details-body"><b>Ингредиенты для этой партии</b><ul>'+(j.recipe.items||parseIngredients(j.recipe.ingredients||[])).map(i=>'<li>'+escapes(i.name)+' — '+fmt(i.qty*j.count/Math.max(1,+j.recipe.servings||1),escapes(i.unit))+'</li>').join('')+'</ul><b>Шаги</b><ol>'+(j.recipe.steps||[]).map(st=>'<li>'+escapes(st)+'</li>').join('')+'</ol></div></details>').join('');
 host.insertAdjacentElement('afterend',box);
}
function backupPanel(){
 const host=byId('smartPlanBox');if(!host)return;
 const box=insertAfter('smartPlanBox','<h3>Точка восстановления</h3><p class="sub">Создаёт локальную резервную копию состояния на этом устройстве. Не удаляет историю Supabase. Для надёжности также экспортируй JSON через раздел «Данные».</p>'+
 '<button class="btn alt" type="button" id="snapshotSave1188">Сохранить состояние</button> <button class="btn alt" type="button" id="snapshotRestore1188">Восстановить локальную копию</button><div id="snapshotStatus1188" class="sub"></div>','snapshotBox1188');
 if(!box)return;
 const key='chto-poest-backup-1188';
 byId('snapshotSave1188').onclick=()=>{
  try{localStorage.setItem(key,JSON.stringify({at:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))}));byId('snapshotStatus1188').textContent='Копия сохранена в этом браузере.'}
  catch(e){alert('Не удалось сохранить копию. Используй экспорт JSON.')}
 };
 byId('snapshotRestore1188').onclick=()=>{
  let backup;try{backup=JSON.parse(localStorage.getItem(key)||'null')}catch(e){}
  if(!backup?.state||!backup?.at){alert('Локальная копия не найдена.');return}
  if(!confirm('Восстановить состояние от '+backup.at+'? Текущие локальные изменения будут заменены. Перед восстановлением обязательно экспортируй актуальный JSON. Облачная синхронизация может повторно заменить данные.'))return;
  state=backup.state;save();renderAll();alert('Локальная копия восстановлена. Проверь состояние облачной синхронизации.');
 };
}
const oldRenderAll=renderAll;
renderAll=function(){
 oldRenderAll();
 smartPortions();dessertWeekend();pantryAudit();nutritionCheck();ratingButtons();storageHints();combinedCooking();backupPanel();
};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия '+VERSION);
renderAll();
})();