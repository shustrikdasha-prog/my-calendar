/* v11.9.0 recipe buttons for cooking tasks */
(function(){
'use strict';
const cookingWords=/готов|свар|вари|запек|туш|жар|тефтел|суп|котлет|запеканк|сырник|пирог|блин/i;
const countOf=j=>Math.max(1,Number(j.count)||1);
const qty=(number,unit)=>String(Math.round((number+Number.EPSILON)*10)/10)+' '+unit;
function jobsFor(date){return batchesForWeek(weekStart(date)).filter(j=>j.date===date)}
function recipeItems(job){
 const divisor=Math.max(1,Number(job.recipe.servings)||1);
 return (job.recipe.items||parseIngredients(job.recipe.ingredients||[])).map(x=>({
  name:String(x.name||''),unit:String(x.unit||''),quantity:Number(x.qty)*countOf(job)/divisor,
  good:Number.isFinite(Number(x.qty))&&Number(x.qty)>0
 }));
}
function recipePart(job){
 return '<h3>'+escapes(job.recipe.name)+' · '+countOf(job)+' порц.</h3>'+
 '<p class="sub">'+escapes(job.recipe.time||'Время не указано')+'</p>'+
 '<b>Ингредиенты на эту партию</b><ul>'+
 recipeItems(job).map(x=>'<li>'+escapes(x.name)+' — '+(x.good&&x.unit!=='порция'?escapes(qty(x.quantity,x.unit)):'количество уточни по рецепту')+'</li>').join('')+
 '</ul><b>Шаги приготовления</b><ol>'+(job.recipe.steps||[]).map(s=>'<li>'+escapes(s)+'</li>').join('')+'</ol>'+
 (job.recipe.note?'<p class="sub">'+escapes(job.recipe.note)+'</p>':'');
}
function commonIngredients(jobs){
 const groups=new Map();
 for(const job of jobs){
  for(const x of recipeItems(job)){
   if(!x.good||x.unit==='порция')continue;
   const key=normalizeShopName(x.name)+'|'+x.unit;
   if(!groups.has(key))groups.set(key,{name:x.name,unit:x.unit,parts:[]});
   groups.get(key).parts.push({name:job.recipe.name,quantity:x.quantity});
  }
 }
 const shared=[...groups.values()].filter(x=>new Set(x.parts.map(p=>p.name)).size>1);
 if(!shared.length)return '<p class="sub">Общих ингредиентов нет: каждое блюдо готовится отдельно.</p>';
 return '<p class="sub">Можно подготовить общие ингредиенты сразу, но каждое блюдо готовь отдельно.</p><ul>'+
 shared.map(x=>'<li><b>'+escapes(x.name)+' — '+escapes(qty(x.parts.reduce((s,p)=>s+p.quantity,0),x.unit))+' всего</b><ul>'+
 x.parts.map(p=>'<li>'+escapes(p.name)+': '+escapes(qty(p.quantity,x.unit))+'</li>').join('')+'</ul></li>').join('')+'</ul>';
}
function openCooking(job){
 if(!job?.recipe)return;
 const together=jobsFor(job.date).filter(x=>x.count>1&&!state.cookDone?.[x.key]);
 const combine=!state.cookDone?.[job.key]&&job.count>1&&together.length>=2;
 if(combine){
  popup('Общий рецепт · '+strDate(job.date),
    '<p class="sub">Объединяются только неприготовленные блюда, каждое более чем на одну порцию. Количество продуктов по каждому блюду указано отдельно. Открытие рецепта не списывает продукты.</p>'+
    '<h3>1. Подготовка общих ингредиентов</h3>'+commonIngredients(together)+
    '<h3>2. Готовка каждого блюда</h3>'+together.map(recipePart).join('<hr class="divider">')+
    '<p class="mini-note">После готовки укажи фактическое число порций в отметке приготовления.</p>',null);
 }else{
  popup(job.recipe.name,
   '<p class="sub">На '+countOf(job)+' порц. · '+strDate(job.date)+'</p>'+recipePart(job)+
   '<p class="mini-note">Рецепт не списывает продукты. Фактический выход порций можно отредактировать отдельно.</p>',null);
 }
}
function chooseManual(label,date){
 const rs=Object.values(recipes()).filter(r=>r?.id&&r?.name);
 const words=(label||'').toLowerCase().replace(/ё/g,'е').match(/[а-яa-z]{4,}/g)||[];
 rs.sort((a,b)=>words.filter(w=>a.name.toLowerCase().replace(/ё/g,'е').includes(w)).length*-1+
   words.filter(w=>b.name.toLowerCase().replace(/ё/g,'е').includes(w)).length||
   a.name.localeCompare(b.name,'ru'));
 popup('Рецепт для задачи',
  '<p class="sub">'+escapes(label)+'</p><p>Задача не привязана к конкретному рецепту. Выбери блюдо; меню не изменится.</p>'+
  '<select class="field" id="manualRecipe1190">'+rs.map(r=>'<option value="'+escapes(r.id)+'">'+escapes(r.name)+'</option>').join('')+'</select>'+
  '<button type="button" class="btn" id="manualRecipeOpen1190" style="margin-top:12px">Открыть рецепт</button>',null);
 document.getElementById('manualRecipeOpen1190').onclick=()=>{
  const id=document.getElementById('manualRecipe1190').value;
  document.getElementById('modal').close();
  const job=jobsFor(date).find(j=>j.id===id);
  if(job)openCooking(job);else showRecipe(id);
 };
}
function addRecipeButtons(){
 const host=document.getElementById('tasks');
 if(host){
  const jobs=jobsFor(selected);
  host.querySelectorAll('[data-auto-cook]').forEach(button=>{
   const job=jobs.find(j=>j.key===button.dataset.autoCook);
   const controls=button.parentElement;
   if(!job||!controls||controls.querySelector('[data-auto-recipe1190]'))return;
   const b=document.createElement('button');b.type='button';b.className='btn alt';b.textContent='Рецепт';b.dataset.autoRecipe1190=job.key;
   b.onclick=()=>openCooking(job);controls.insertBefore(b,button);
  });
  host.querySelectorAll('.task-action-row').forEach(row=>{
   if(row.querySelector('[data-auto-cook],[data-auto-extra]'))return;
   const label=row.querySelector('.task-title'),controls=row.querySelector('.task-buttons');
   if(!label||!controls||!cookingWords.test(label.textContent||'')||controls.querySelector('[data-manual-recipe1190]'))return;
   const b=document.createElement('button');b.type='button';b.className='btn alt';b.textContent='Рецепт';b.dataset.manualRecipe1190='1';
   b.onclick=()=>chooseManual(label.textContent||'',selected);controls.insertBefore(b,controls.firstChild);
  });
 }
 const today=document.getElementById('todayContent');
 if(today){
  const jobs=jobsFor(todayISO());
  today.querySelectorAll('[data-todaycook]').forEach(button=>{
   const job=jobs.find(j=>j.key===button.dataset.todaycook);
   const parent=button.parentElement;
   if(!job||!parent||parent.querySelector('[data-today-recipe1190]'))return;
   const b=document.createElement('button');b.type='button';b.className='btn alt';b.textContent='Рецепт';b.dataset.todayRecipe1190=job.key;
   b.onclick=()=>openCooking(job);parent.insertBefore(b,button);
  });
 }
}
// Keep the factual yield editor unmistakably visible on the weekly portions card.
// This also covers a ready batch whose original cooking record says "2" while 4 portions
// are already in the fridge: editing 4 must not create two extra portions.
const originalPortions1190=renderPortions;
renderPortions=function(){
 originalPortions1190();
 const cards=document.getElementById('portionCards');
 if(!cards)return;
 const allJobs=batchesForWeek();
 cards.querySelectorAll('.prep-meal').forEach(card=>{
  const cookButton=card.querySelector('[data-cook-action]');
  const job=cookButton&&allJobs.find(x=>x.key===cookButton.dataset.cookAction);
  if(!job)return;
  const readyRows=(state.ready||[]).filter(row=>
   row.recipeId===job.id && Number(row.qty)>0 &&
   (state.cookDone?.[job.key]?.created||[]).includes(row.id));
  if(!readyRows.length)return;
  const count=readyRows.reduce((sum,row)=>sum+Number(row.qty||0),0);
  // Avoid duplicate buttons from the previous yield editor.
  card.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Изменить порции')b.remove()});
  const line=document.createElement('div');line.className='flex';
  line.style.marginTop='11px';
  line.style.padding='10px';
  line.style.borderRadius='12px';
  line.style.background='var(--pale)';
  line.innerHTML='<strong>Сейчас в наличии: '+Math.round(count)+' порц.</strong> ';
  const edit=document.createElement('button');
  edit.type='button';edit.className='btn';
  edit.textContent='Изменить количество порций';
  edit.onclick=()=>{
   if(readyRows.length===1){adjustReadyYield1187(readyRows[0]);return}
   popup('Выбери контейнер','<p>Порции этой партии находятся в нескольких местах. Выбери контейнер для исправления.</p>'+
    readyRows.map(x=>'<button type="button" class="btn alt" data-edit-container1190="'+escapes(x.id)+'">'+
    escapes(x.place==='freezer'?'Морозилка':'Холодильник')+' · '+Math.round(Number(x.qty)||0)+' порц.</button>').join(' '),null);
   document.querySelectorAll('#modalBody [data-edit-container1190]').forEach(b=>b.onclick=()=>{
    const row=readyRows.find(x=>x.id===b.dataset.editContainer1190);
    document.getElementById('modal').close();
    if(row)adjustReadyYield1187(row);
   });
  };
  line.appendChild(edit);
  card.appendChild(line);
 });
};
const oldRender=renderAutoTasks;
renderAutoTasks=function(){oldRender();addRecipeButtons()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.0');
renderAll();
})();