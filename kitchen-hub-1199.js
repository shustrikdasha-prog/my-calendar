/* 11.9.9 — kitchen overview, virtual fridge and shared cooking session.
   All stock debits/credits and ready-meal edits are delegated to existing handlers. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const kitchen=el('portions');
if(!kitchen)return;
const esc=s=>escapes(String(s??''));
const startOfDay=s=>Date.parse(s+'T12:00:00Z');
const diffDays=(a,b)=>Math.round((startOfDay(a)-startOfDay(b))/86400000);
const dateFmt=d=>d?strDate(d):'дата неизвестна';
const pWord=n=>n%10===1&&n%100!==11?'порция':([2,3,4].includes(n%10)&&![12,13,14].includes(n%100)?'порции':'порций');
function existingReady(){return (Array.isArray(state.ready)?state.ready:[]).filter(x=>x&&Number(x.qty)>0)}
function fridgeLife(r){
 if(r.place!=='fridge')return {kind:'frozen',label:'Морозилка · дата заморозки '+dateFmt(r.date)};
 if(!r.date)return {kind:'unknown',label:'Дата приготовления не указана — проверь срок'};
 const age=diffDays(todayISO(),r.date);
 if(age<0)return {kind:'unknown',label:'Проверь дату приготовления'};
 if(age>=4)return {kind:'late',label:'Приготовлено '+age+' дн. назад · проверь безопасность'};
 if(age>=3)return {kind:'soon',label:'Приготовлено 3 дня назад · используй скорее'};
 return {kind:'fresh',label:age===0?'Приготовлено сегодня':'Приготовлено '+age+' дн. назад'};
}
let view='fridge',sessionDate='',sessionStep=0,checkedSteps=new Set();
let root=el('kitchen1199');
if(!root){
 root=document.createElement('section');
 root.id='kitchen1199';root.className='kitchen1199';
 kitchen.insertBefore(root,kitchen.querySelector('.feature-heading'));
}
const oldPortions=renderPortions;
renderPortions=function(){oldPortions();renderKitchen()};
function dateJobs(){
 const jobs=batchesForWeek(current).filter(j=>j?.recipe?.id&&j.count>0);
 return jobs.sort((a,b)=>a.date.localeCompare(b.date)||a.recipe.name.localeCompare(b.recipe.name,'ru'));
}
function movePlace(id){
 const r=(state.ready||[]).find(x=>x.id===id);
 if(!r||!(Number(r.qty)>0))return;
 const next=r.place==='freezer'?'fridge':'freezer';
 if(!confirm('Переместить «'+r.name+'» в '+(next==='freezer'?'морозилку':'холодильник')+'?\n\nКоличество порций не изменится. Дату приготовления / заморозки при необходимости поправь через «Изменить»; перенос не сбрасывает срок хранения.'))return;
 r.place=next;
 // Preserve original food preparation date; no artificial shelf-life reset.
 save();renderAll();
}
function clickExisting(action,id){
 // Existing handlers apply stock and portion accounting and validation.
 const selector='[data-ready-'+action+']';
 const b=[...document.querySelectorAll(selector)].find(n=>n.dataset['ready'+action.charAt(0).toUpperCase()+action.slice(1)]===id);
 if(b){b.click();return}
 alert('Не удалось открыть действие. Перейди в «Покупки» → «Готовая еда дома».');
}
function renderFridge(){
 const ready=existingReady(),fridge=ready.filter(x=>x.place!=='freezer'),freezer=ready.filter(x=>x.place==='freezer');
 const qty=x=>x.reduce((s,r)=>s+Number(r.qty||0),0);
 const card=(r)=>{
  const flag=fridgeLife(r);
  return '<article class="k-food1199"><div class="k-food-top1199"><span class="k-place1199 '+(r.place==='freezer'?'frozen':'')+'">'+(r.place==='freezer'?'Морозилка':'Холодильник')+'</span><span class="k-portions1199">'+Number(r.qty)+' '+pWord(Number(r.qty))+'</span></div>'+
  '<h4>'+esc(r.name)+'</h4><p class="k-lifetime1199 '+flag.kind+'">'+esc(flag.label)+'</p>'+
  '<div class="k-actions1199"><button type="button" data-k-use="'+esc(r.id)+'" class="k-primary1199">Съела порцию</button><button type="button" data-k-edit="'+esc(r.id)+'">Изменить</button><button type="button" data-k-place="'+esc(r.id)+'">'+(r.place==='freezer'?'В холодильник':'Заморозить')+'</button></div></article>';
 };
 return '<div class="k-overview1199"><div class="k-summary1199"><b>'+qty(ready)+'</b><span>готовых порций</span></div><div class="k-summary1199"><b>'+qty(fridge)+'</b><span>в холодильнике</span></div><div class="k-summary1199"><b>'+qty(freezer)+'</b><span>в морозилке</span></div></div>'+
 '<div class="k-toolbar1199"><h3>Мой холодильник</h3><button type="button" class="k-link1199" data-k-add>+ Добавить порции</button></div>'+
 '<p class="k-muted1199">Готовые блюда — только те, которые ты отметила приготовленными или добавила вручную. Срок хранения оценивается приблизительно; безопасность зависит от температуры и условий хранения.</p>'+
 (ready.length?'<div class="k-grid1199">'+[...fridge,...freezer].map(card).join('')+'</div>':'<div class="k-empty1199"><strong>Пока нет готовой еды в учёте</strong><p>Когда отметишь приготовление, порции автоматически появятся здесь. Можно также добавить блюдо вручную.</p></div>')+
 '<div class="k-notice1199">Чтобы не забыть про заготовки: правильно охлаждённые готовые блюда обычно хранят в холодильнике около 3–4 дней. Если есть сомнения в безопасности еды, не ориентируйся только на счётчик в приложении.</div>';
}
function cookingDates(jobs){
 const keys=[...new Set(jobs.map(j=>j.date))];
 return keys;
}
function renderCook(){
 const jobs=dateJobs();
 const dates=cookingDates(jobs);
 if(!sessionDate||!dates.includes(sessionDate))sessionDate=dates.find(d=>d>=todayISO())||dates[0]||todayISO();
 const onDate=jobs.filter(j=>j.date===sessionDate),remaining=onDate.filter(j=>!state.cookDone?.[j.key]);
 const total=onDate.reduce((s,j)=>s+j.count,0),done=onDate.filter(j=>state.cookDone?.[j.key]).length;
 return '<div class="k-toolbar1199"><div><h3>Готовим на несколько дней</h3><p class="k-muted1199">Рецепты собраны в одном месте. Включи режим, чтобы не переключаться между блюдами.</p></div></div>'+
 (dates.length?'<div class="k-datepick1199" aria-label="Выбор дня готовки">'+dates.map(d=>'<button type="button" data-k-date="'+d+'" class="'+(d===sessionDate?'selected':'')+'">'+esc(dateFmt(d))+'</button>').join('')+'</div>':
 '<div class="k-empty1199">На выбранной неделе нет запланированных долгих заготовок.</div>')+
 (onDate.length?'<div class="k-cook-intro1199"><div><small>ЗАПЛАНИРОВАНО</small><h4>'+total+' '+pWord(total)+' · '+onDate.length+' блюд'+(done?' · '+done+' готово':'')+'</h4><p>Каждое блюдо спишется из запасов только после подтверждения готовки. Уже приготовленное повторно не списываем.</p></div><button class="k-start1199" type="button" data-k-start>Открыть процесс</button></div>'+
 '<div class="k-grid1199">'+onDate.map(j=>{
  const isDone=!!state.cookDone?.[j.key];
  return '<article class="k-recipe1199"><span class="k-place1199">'+(isDone?'Готово':'К приготовлению')+'</span><h4>'+esc(j.recipe.name)+'</h4><div class="k-recipe-meta1199">'+j.count+' '+pWord(j.count)+' · '+esc(j.recipe.time||'время неизвестно')+(j.freeze?' · заморозить '+j.freeze:'')+'</div>'+
  '<div class="k-actions1199"><button type="button" data-k-recipe="'+esc(j.id)+'">Посмотреть рецепт</button><button type="button" data-k-finish="'+esc(j.key)+'" class="k-primary1199">'+(isDone?'✓ Приготовлено':'Отметить готовку')+'</button></div></article>';
 }).join('')+'</div>':'');
}
function sessionSteps(jobs){
 const s=[];
 if(!jobs.length)return s;
 s.push({title:'Подготовить рабочее место',description:'Проверь ингредиенты всех блюд, посуду и свободные контейнеры. Рецептурные количества доступны по кнопкам ниже.'});
 for(const j of jobs){
  const steps=Array.isArray(j.recipe.steps)?j.recipe.steps:[];
  if(steps.length){
   for(let i=0;i<steps.length;i++)s.push({title:j.recipe.name+' · шаг '+(i+1),description:steps[i],recipeId:j.id});
  }else s.push({title:'Приготовить '+j.recipe.name,description:'У этого рецепта пока нет пошагового описания. Открой полный рецепт.',recipeId:j.id});
 }
 s.push({title:'Охладить и разложить по контейнерам',description:'Не оставляй готовую еду надолго при комнатной температуре. Раздели на порции; для офиса используй основной контейнер 500 мл и отдельный овощной 240 мл. Замораживай только подходящие блюда.'});
 return s;
}
function renderSession(){
 const jobs=dateJobs().filter(j=>j.date===sessionDate&&!state.cookDone?.[j.key]);
 const steps=sessionSteps(jobs);
 if(!jobs.length)return '<div class="k-empty1199"><h3>Все блюда этого дня уже отмечены приготовленными</h3><p>Порции находятся в виртуальном холодильнике. Если отметка была ошибочной, исправь её в плане готовки ниже.</p><button type="button" data-k-back>Вернуться к плану</button></div>';
 sessionStep=Math.min(Math.max(0,sessionStep),steps.length-1);
 const step=steps[sessionStep],pct=Math.round(100*checkedSteps.size/steps.length);
 return '<div class="k-session1199"><div class="k-session-top1199"><button type="button" data-k-back>← К плану</button><span>'+esc(dateFmt(sessionDate))+'</span></div>'+
 '<h3>Готовим вместе</h3><p class="k-muted1199">Это единый чек-лист по существующим рецептам, а не оптимизированный тайминг параллельной готовки. Можно переходить между шагами в любом порядке.</p>'+
 '<div class="k-session-progress1199"><div class="k-progress-bar1199"><i style="width:'+pct+'%"></i></div><span>'+checkedSteps.size+' / '+steps.length+' шагов</span></div>'+
 '<div class="k-session-card1199"><small>ШАГ '+(sessionStep+1)+' ИЗ '+steps.length+'</small><h4>'+esc(step.title)+'</h4><p>'+esc(step.description)+'</p>'+
 (step.recipeId?'<button type="button" class="k-link1199" data-k-recipe="'+esc(step.recipeId)+'">Открыть полный рецепт →</button>':'')+
 '<label class="k-stepcheck1199"><input type="checkbox" data-k-step="'+sessionStep+'" '+(checkedSteps.has(sessionStep)?'checked':'')+'> Этот шаг выполнен</label></div>'+
 '<div class="k-session-controls1199"><button type="button" data-k-prev '+(sessionStep===0?'disabled':'')+'>← Назад</button><button type="button" data-k-next '+(sessionStep===steps.length-1?'disabled':'')+'>Далее →</button></div>'+
 '<div class="k-session-finish1199"><h4>Готовые блюда</h4><p>Отмечай готовку только после фактического приготовления: стандартное окно уточнит количество порций и сколько заморозить.</p>'+
 jobs.map(j=>'<button type="button" data-k-finish="'+esc(j.key)+'">✓ '+esc(j.recipe.name)+' · '+j.count+' '+pWord(j.count)+'</button>').join('')+'</div></div>';
}
function renderKitchen(){
 if(!root)return;
 const header='<div class="k-heading1199"><div><span>ТВОЯ КУХНЯ</span><h2>Запасы и готовка — без хаоса</h2><p>Здесь видно, что уже готово и что предстоит приготовить.</p></div></div>'+
 '<div class="k-tabs1199" role="group" aria-label="Раздел кухни"><button type="button" data-k-view="fridge" class="'+(view==='fridge'?'active':'')+'">Мой холодильник</button><button type="button" data-k-view="cook" class="'+(view==='cook'||view==='session'?'active':'')+'">Режим готовки</button></div>';
 root.innerHTML=header+(view==='fridge'?renderFridge():view==='cook'?renderCook():renderSession());
 root.querySelectorAll('[data-k-view]').forEach(b=>b.onclick=()=>{view=b.dataset.kView;sessionStep=0;checkedSteps=new Set();renderKitchen()});
 root.querySelectorAll('[data-k-use]').forEach(b=>b.onclick=()=>clickExisting('use',b.dataset.kUse));
 root.querySelectorAll('[data-k-edit]').forEach(b=>b.onclick=()=>clickExisting('edit',b.dataset.kEdit));
 root.querySelectorAll('[data-k-place]').forEach(b=>b.onclick=()=>movePlace(b.dataset.kPlace));
 root.querySelectorAll('[data-k-add]').forEach(b=>b.onclick=()=>el('addReady')?.click());
 root.querySelectorAll('[data-k-recipe]').forEach(b=>b.onclick=()=>showRecipe(b.dataset.kRecipe));
 root.querySelectorAll('[data-k-date]').forEach(b=>b.onclick=()=>{sessionDate=b.dataset.kDate;sessionStep=0;checkedSteps=new Set();renderKitchen()});
 root.querySelectorAll('[data-k-start]').forEach(b=>b.onclick=()=>{view='session';sessionStep=0;checkedSteps=new Set();renderKitchen()});
 root.querySelectorAll('[data-k-back]').forEach(b=>b.onclick=()=>{view='cook';renderKitchen()});
 root.querySelectorAll('[data-k-prev]').forEach(b=>b.onclick=()=>{sessionStep--;renderKitchen()});
 root.querySelectorAll('[data-k-next]').forEach(b=>b.onclick=()=>{sessionStep++;renderKitchen()});
 root.querySelectorAll('[data-k-step]').forEach(input=>input.onchange=()=>{const n=Number(input.dataset.kStep);if(input.checked)checkedSteps.add(n);else checkedSteps.delete(n);renderKitchen()});
 root.querySelectorAll('[data-k-finish]').forEach(b=>b.onclick=()=>{
  const job=dateJobs().find(j=>j.key===b.dataset.kFinish);
  if(!job)return;
  if(state.cookDone?.[job.key]){alert('Блюдо уже отмечено приготовленным. Количество порций можно изменить ниже.');return}
  // Invoke the canonical cooking dialog; it handles ingredient deductions, fridge and freezer portions.
  const btn=[...document.querySelectorAll('[data-cook-action]')].find(x=>x.dataset.cookAction===job.key);
  if(btn)btn.click();else alert('Открой карточку приготовления ниже.');
 });
}
const allBeforeKitchen=renderAll;
renderAll=function(){allBeforeKitchen();renderKitchen()};
document.querySelectorAll('.footer').forEach(e=>e.textContent='Версия 11.9.9');
renderKitchen();
})();