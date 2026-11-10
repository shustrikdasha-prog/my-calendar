/* 11.10.0 — kitchen overview, virtual fridge and shared cooking session.
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
// Keep legacy weekly cards and yield corrections accessible without crowding the new screen.
let legacy=el('kitchenLegacy1199');
if(!legacy){
 legacy=document.createElement('details');legacy.id='kitchenLegacy1199';legacy.className='k-legacy1199';
 const summary=document.createElement('summary');summary.textContent='Подробный план недели и корректировка порций';legacy.appendChild(summary);
 const movable=[...kitchen.children].filter(x=>x!==root&&x!==legacy);
 for(const node of movable)legacy.appendChild(node);
 kitchen.appendChild(legacy);
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
// Smart workflow alternates dishes while strictly preserving every recipe's own order.
function cookingMethod(j){
 const text=(j.recipe.steps||[]).join(' ').toLowerCase();
 return /духовк|запека|выпека/.test(text)?'Духовка':/варить|вари|туш|жар|сковород|кипят|кастрюл/.test(text)?'Плита':'Ручная подготовка';
}
function jointCookingHint(jobs){
 if(jobs.length<2)return 'План на одно блюдо. Следуй шагам рецепта.';
 const methods=jobs.map(cookingMethod);
 const oven=methods.includes('Духовка'),stove=methods.includes('Плита');
 if(oven&&stove)return 'Можно сочетать работу духовки и плиты: пока одно блюдо запекается, выполняй подготовительные шаги другого. Контролируй нагрев и соблюдай температуру и время из каждого рецепта.';
 if(methods.filter(x=>x==='Плита').length>1)return 'На плите несколько блюд. Проверь число конфорок и посуду; если места не хватает, готовь по очереди. Не оставляй активный нагрев без присмотра.';
 return 'Подготовь общие ингредиенты и посуду сразу. Шаги разных блюд чередуются там, где это допускает каждый рецепт.';
}
function sessionSteps(jobs){
 const result=[{title:'Подготовь рабочее место',description:'Проверь ингредиенты и посуду для всех блюд. Для сырого мяса используй отдельный инвентарь и мой руки и поверхности.',kind:'setup'}];
 const sets=jobs.map(j=>({j,steps:Array.isArray(j.recipe.steps)&&j.recipe.steps.length?j.recipe.steps:['Открой полный рецепт: шаги приготовления пока не указаны.']}));
 for(let i=0;i<Math.max(...sets.map(x=>x.steps.length));i++)
  for(const {j,steps} of sets){
   if(i>=steps.length)continue;
   const description=steps[i];
   const kind=/духовк|запека|выпека|вари|варить|туши|тушить|кипят|на огне|доведи до кип|жарь|жарить|обжар/i.test(description)?'heat':'prep';
   result.push({title:j.recipe.name+' · шаг '+(i+1),description,recipeId:j.id,kind});
  }
 result.push({title:'Охлади и разложи порции',description:'Охлади приготовленные блюда в неглубоких контейнерах, своевременно убери в холодильник или морозилку. Для офиса: основной контейнер 500 мл и овощной 240 мл. Учитывай фактический срок хранения.',kind:'store'});
 return result;
}
function cookingTimeInfo(jobs){
 const durations=jobs.map(j=>{
  const t=String(j.recipe.time||''),range=t.match(/(\d+)\s*[–-]\s*(\d+)/),single=t.match(/(\d+)\s*(мин|час|ч\\b)/i);
  return range?Number(range[2]):single?Number(single[1])*(/час/i.test(single[2])?60:1):null;
 });
 const known=durations.filter(Number.isFinite);
 if(!known.length)return 'Время не указано в рецептах.';
 const total=known.reduce((a,b)=>a+b,0);
 return 'Сумма времени '+known.length+' рецептов: '+total+' мин при готовке по очереди. При параллельной готовке возможно быстрее; это не таймер и не гарантия.';
}
function flowId(jobs){return sessionDate+'|'+jobs.map(j=>j.key).sort().join('|')}
let currentFlow='';
function restoreSteps(jobs){
 const key=flowId(jobs);
 if(currentFlow!==key){
  currentFlow=key;sessionStep=0;
  const stored=state.kitchenFlow1200?.[key];
  checkedSteps=new Set(Array.isArray(stored)?stored.filter(x=>Number.isInteger(x)&&x>=0):[]);
 }
}
function renderSession(){
 const jobs=dateJobs().filter(j=>j.date===sessionDate&&!state.cookDone?.[j.key]);
 const steps=sessionSteps(jobs);
 restoreSteps(jobs);
 if(!jobs.length)return '<div class="k-empty1199"><h3>Все блюда этого дня уже отмечены приготовленными</h3><p>Порции находятся в виртуальном холодильнике. Если отметка была ошибочной, исправь её в плане готовки ниже.</p><button type="button" data-k-back>Вернуться к плану</button></div>';
 sessionStep=Math.min(Math.max(0,sessionStep),steps.length-1);
 const step=steps[sessionStep],pct=Math.round(100*[...checkedSteps].filter(x=>x<steps.length).length/steps.length);
 return '<div class="k-session1199"><div class="k-session-top1199"><button type="button" data-k-back>← К плану</button><span>'+esc(dateFmt(sessionDate))+'</span></div>'+
 '<h3>Готовим вместе</h3><p class="k-muted1199">Шаги разных блюд чередуются, но порядок каждого рецепта сохранён. Не оставляй нагрев без присмотра.</p>'+
 '<div class="k-flow-time1200"><b>По времени</b><span>'+esc(cookingTimeInfo(jobs))+'</span></div>'+ 
 '<div class="k-combo1200"><b>Что можно делать параллельно</b><p>'+esc(jointCookingHint(jobs))+'</p></div>'+ 
 '<div class="k-session-progress1199"><div class="k-progress-bar1199"><i style="width:'+pct+'%"></i></div><span>'+checkedSteps.size+' / '+steps.length+' шагов</span></div>'+
 '<div class="k-session-card1199"><small>ШАГ '+(sessionStep+1)+' ИЗ '+steps.length+(step.kind==='heat'?' · ТЕРМООБРАБОТКА':'')+'</small><h4>'+esc(step.title)+'</h4><p>'+esc(step.description)+'</p>'+
 (step.recipeId?'<button type="button" class="k-link1199" data-k-recipe="'+esc(step.recipeId)+'">Открыть полный рецепт →</button>':'')+
 (step.kind==='heat'?'<p class="k-switch-tip1200">Пока блюдо готовится, можно заняться другим рецептом, только если это безопасно и нагрев остаётся под контролем.</p>':'')+
 '<label class="k-stepcheck1199"><input type="checkbox" data-k-step="'+sessionStep+'" '+(checkedSteps.has(sessionStep)?'checked':'')+'> Этот шаг выполнен</label></div>'+
 '<div class="k-session-controls1199"><button type="button" data-k-prev '+(sessionStep===0?'disabled':'')+'>← Назад</button><button type="button" data-k-next '+(sessionStep===steps.length-1?'disabled':'')+'>Далее →</button></div>'+
 '<div class="k-session-finish1199"><h4>Готовые блюда</h4><p>Отмечай готовку только после фактического приготовления: стандартное окно уточнит количество порций и сколько заморозить.</p>'+
 jobs.map(j=>'<button type="button" data-k-finish="'+esc(j.key)+'">✓ '+esc(j.recipe.name)+' · '+j.count+' '+pWord(j.count)+'</button>').join('')+'</div></div>';
}
function renderKitchen(){
 if(!root)return;
 const header='<div class="k-heading1199"><div><span>ТВОЯ КУХНЯ</span><h2>Запасы и готовка — без хаоса</h2><p>Здесь видно, что уже готово и что предстоит приготовить.</p></div></div>'+
 '<div class="k-tabs1199" role="group" aria-label="Раздел кухни"><button type="button" data-k-view="fridge" class="'+(view==='fridge'?'active':'')+'">Мой холодильник</button><button type="button" data-k-view="cook" class="'+(view==='cook'||view==='session'?'active':'')+'">Режим готовки</button></div>';
 root.innerHTML=header+'<div class="k-week1199"><button type="button" data-k-week="-1">← Неделя</button><strong>'+esc(strDate(current))+' — '+esc(strDate(addDays(current,6)))+'</strong><button type="button" data-k-week="1">Неделя →</button></div>'+(view==='fridge'?renderFridge():view==='cook'?renderCook():renderSession());
 root.querySelectorAll('[data-k-week]').forEach(b=>b.onclick=()=>nav(Number(b.dataset.kWeek)));
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
 root.querySelectorAll('[data-k-step]').forEach(input=>input.onchange=()=>{const n=Number(input.dataset.kStep);if(input.checked)checkedSteps.add(n);else checkedSteps.delete(n);state.kitchenFlow1200??={};const active=dateJobs().filter(j=>j.date===sessionDate&&!state.cookDone?.[j.key]);state.kitchenFlow1200[flowId(active)]=[...checkedSteps];save();renderKitchen()});
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
document.querySelectorAll('.footer').forEach(e=>e.textContent='Версия 11.10.0');
renderKitchen();
})();