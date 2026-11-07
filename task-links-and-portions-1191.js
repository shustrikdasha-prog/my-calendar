/* 11.9.1. Directly repair visible portions and link cooking tasks to recipes. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е');
const stop=new Set(['приготовить','готовить','сделать','сварить','запечь','отварить','пожарить','заморозить','порции','порцию','порций','на','для','без','и','из','с','со','по','к','в','поздние','контейнер','контейнеры','овощной','овощами']);
function words(s){return (norm(s).match(/[а-яa-z]{4,}/g)||[]).filter(w=>!stop.has(w)).map(w=>w.slice(0,5))}
function batchForDate(date){return batchesForWeek(weekStart(date)).filter(j=>j.date===date)}
function knownRows(done){return (done?.created||[]).map(id=>(state.ready||[]).find(r=>r.id===id)).filter(Boolean)}
function portionsFor(done){
 const rows=knownRows(done);
 if(!rows.length)return Math.max(0,Number(done?.count)||0);
 return rows.reduce((total,row)=>{
  const history=state.portionYield1187?.[row.id];
  return total+(history?Number(history.total)||0:Number(row.qty)||0);
 },0);
}
function openYieldByCard(job){
 const done=state.cookDone?.[job.key];
 const rows=knownRows(done);
 if(!rows.length){alert('Не найдены контейнеры этого приготовления. Проверь «Готовая еда дома».');return}
 if(rows.length===1){adjustReadyYield1187(rows[0]);return}
 popup('Выбери контейнер', '<p>Блюдо хранится в нескольких контейнерах. Выбери, где нужно исправить количество порций.</p>'+
 rows.map(row=>'<p><button class="btn alt" type="button" data-choose-yield1191="'+escapes(row.id)+'">'+escapes(row.place==='freezer'?'Морозилка':'Холодильник')+' · '+(Number(row.qty)||0)+' порц.</button></p>').join(''),null);
 document.querySelectorAll('[data-choose-yield1191]').forEach(btn=>btn.onclick=()=>{
  const row=rows.find(r=>r.id===btn.dataset.chooseYield1191);
  document.getElementById('modal').close();if(row)adjustReadyYield1187(row);
 });
}
function fixPortionCards(){
 const host=document.getElementById('portionCards');
 if(!host)return;
 const jobs=batchesForWeek();
 const grouped=new Map();
 for(const j of jobs){const arr=grouped.get(j.date)||[];arr.push(j);grouped.set(j.date,arr)}
 host.querySelectorAll('.prep-meal').forEach(card=>{
  const btn=card.querySelector('[data-cook-action]'),job=btn&&jobs.find(j=>j.key===btn.dataset.cookAction);
  if(!job)return;
  const done=state.cookDone?.[job.key];if(!done)return;
  const rows=knownRows(done);
  if(!rows.length)return;
  const total=portionsFor(done);
  const tag=card.querySelector('.tag');
  if(tag){tag.textContent=total+' порц. · факт';tag.title='Изначально планировалось: '+job.count+' порц.'}
  card.querySelectorAll('[data-real-portions1191]').forEach(el=>el.remove());
  // Remove redundant controls installed by older releases, if present.
  card.querySelectorAll('button').forEach(b=>{
    if(b.textContent.trim()==='Изменить порции')b.remove();
    else if(b.textContent.trim()==='Изменить количество порций'){
      const parent=b.parentElement;
      if(parent?.classList.contains('flex')&&parent!==card.querySelector('[data-cook-action]')?.parentElement)parent.remove();
    }
  });
  const line=document.createElement('div');
  line.className='flex';line.dataset.realPortions1191='1';
  line.style.marginTop='12px';line.style.padding='11px';line.style.background='var(--pale)';line.style.borderRadius='12px';
  const text=document.createElement('strong');
  text.textContent='Готово: '+total+' порц.';
  const button=document.createElement('button');button.type='button';button.className='btn';
  button.textContent='Изменить количество порций';
  button.onclick=()=>openYieldByCard(job);
  line.append(text,button);
  // Place controls immediately next to preparation action, not after distant section content.
  const action=card.querySelector('[data-cook-action]')?.closest('.flex');
  if(action)action.insertAdjacentElement('afterend',line);else card.appendChild(line);
 });
 host.querySelectorAll('.prep-day').forEach(card=>{
  const first=card.querySelector('[data-cook-action]'),j=first&&jobs.find(x=>x.key===first.dataset.cookAction);
  if(!j)return;
  const count=(grouped.get(j.date)||[]).reduce((total,x)=>total+(state.cookDone?.[x.key]?portionsFor(state.cookDone[x.key]):x.count),0);
  const head=card.querySelector('h3');
  if(head)head.textContent=strDate(j.date)+' · '+count+' порц.';
 });
}
function matchRecipe(task,date){
 const linked=task.recipeId&&recipes()[task.recipeId];
 if(linked)return {recipe:linked,job:batchForDate(date).find(j=>j.id===linked.id)};
 const ws=words(task.text);if(!ws.length)return null;
 const planned=batchForDate(date);
 const collection=[...planned.map(j=>({recipe:j.recipe,job:j,priority:2})),
    ...Object.values(recipes()).filter(r=>!planned.some(j=>j.id===r.id)).map(r=>({recipe:r,job:null,priority:0}))];
 const matches=collection.map(item=>{
  const rw=words(item.recipe.name);
  const shared=ws.filter(w=>rw.includes(w)).length;
  // Distinct recipes need at least two matching meaningful words.
  const score=shared>=2?shared*10+item.priority:0;
  return {...item,score};
 }).filter(x=>x.score>=20).sort((a,b)=>b.score-a.score);
 if(!matches.length)return null;
 // Do not silently bind when more than one recipe has a similarly strong title.
 if(matches.length>1&&matches[0].score-matches[1].score<5)return null;
 return matches[0];
}
function openLinkedTask(task,date){
 const match=matchRecipe(task,date);
 if(!match){
  // The original selector remains available for ambiguous titles.
  const old=window.__taskPicker1191;
  if(typeof old==='function')old(task.text,date);
  else popup('Рецепт не определён','<p>Не удалось однозначно сопоставить задачу с рецептом. Открой рецепт из раздела «Рецепты».</p>',null);
  return;
 }
 if(task.recipeId!==match.recipe.id){
  task.recipeId=match.recipe.id;save();
 }
 if(match.job){
  // Use the already tested combined cooking handler attached to automatic cooking.
  const auto=[...document.querySelectorAll('[data-auto-recipe1190]')].find(el=>el.dataset.autoRecipe1190===match.job.key);
  if(auto){auto.click();return}
 }
 showRecipe(match.recipe.id);
}
function linkTasks(){
 const date=selected,day=getDay(date),rows=[...document.querySelectorAll('#tasks .task-action-row')];
 rows.forEach(row=>{
  if(row.querySelector('[data-auto-cook],[data-auto-extra]'))return;
  const txt=row.querySelector('.task-title')?.textContent?.trim();
  if(!txt)return;
  const task=day.tasks?.find(t=>t.text===txt);
  if(!task)return;
  const btn=row.querySelector('[data-manual-recipe1190]');
  if(!btn)return;
  const hit=matchRecipe(task,date);
  if(hit){
   btn.textContent='Рецепт · '+hit.recipe.name;
   btn.title='Связанный рецепт: '+hit.recipe.name;
   btn.onclick=()=>openLinkedTask(task,date);
  }
 });
}
const original=renderAll;
renderAll=function(){original();fixPortionCards();linkTasks()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.1');
renderAll();
})();