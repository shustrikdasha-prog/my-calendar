/* 11.9.7 — iron-rich menu and new course overview. Reapply safely after cloud updates. */
(function(){
'use strict';
const VERSION='11.9.7', FLAG='ironMenu1197';
const updates={
 chicken_lentil_soup_1192:{
  id:'chicken_lentil_soup_1192',name:'Куриный суп с чечевицей и цельнозерновым тостом',servings:3,time:'40 мин',
  ingredients:['Куриное филе — 450 г','Красная чечевица — 120 г','Картофель — 240 г','Кабачок — 180 г','Морковь — 70 г','Хлеб цельнозерновой — 180 г','Вода — 500 мл'],
  steps:['Залей нарезанную курицу водой, доведи до слабого кипения.','Добавь картофель и морковь, вари 10 минут.','Добавь красную чечевицу и кабачок. Вари до мягкости и полной готовности курицы (74 °C внутри).','Раздели суп на три порции, быстро охлади и убери в холодильник.','К каждой порции подай отдельно 60 г цельнозернового хлеба. Тост не клади в суп заранее.'],
  note:'Сытный ужин с источниками железа и белка; тост учитывается в рецепте. Около 500 ккал на порцию по приблизительной оценке.'
 },
 greek_snack_1192:{
  id:'greek_snack_1192',name:'Йогурт с грушей, орехами и тыквенными семечками',servings:1,time:'5 мин',
  ingredients:['Греческий йогурт — 200 г','Груша — 100 г','Грецкие орехи — 20 г','Тыквенные семечки — 15 г'],
  steps:['Нарежь грушу и добавь к греческому йогурту.','Перед едой посыпь орехами и семечками.'],
  note:'Без готовки. Молочные продукты в этом перекусе не планируются одновременно с обеденным Мальтофером.'
 }
};
function unchanged(id){
 const r=recipes()[id],t=(r?.ingredients||[]).join(' | ').toLowerCase();
 return id==='chicken_lentil_soup_1192'
 ?t.includes('красная чечевица — 45 г')&&t.includes('куриное филе — 300 г')
 :t.includes('греческий йогурт — 100 г')&&t.includes('грецкие орехи — 5 г');
}
function migrate(){
 if(state[FLAG])return;
 for(const date of ['2026-11-10','2026-11-11']){
  const day=getDay(date),m=day?.meals?.[2];
  if(m?.recipeId==='apple_crumble_1192'&&!m.readyId&&!isDone('meal:'+date+':2'))
    day.meals[2]={title:'Яблоко с миндалём',recipeId:'apple_almond_20261109',kcal:195,outside:false};
 }
 for(const [id,dates,slot,kcal] of [
  ['chicken_lentil_soup_1192',['2026-11-12','2026-11-13','2026-11-14'],3,500],
  ['greek_snack_1192',['2026-11-12','2026-11-13','2026-11-14','2026-11-15'],2,365]
 ]){
  if(!unchanged(id))continue;
  if(id==='chicken_lentil_soup_1192'&&state.cookDone?.['cook:2026-11-11:'+id])continue;
  state.recipes??={};
  state.recipes[id]={...updates[id],items:parseIngredients(updates[id].ingredients)};
  for(const date of dates){
   const m=getDay(date)?.meals?.[slot];
   if(m?.recipeId===id&&!m.readyId&&!isDone('meal:'+date+':'+slot)){
    m.title=updates[id].name;m.kcal=kcal;
   }
  }
 }
 // No medicine history, existing stock, purchases or completed meals are reset.
 state[FLAG]=true;save();
}
const oldAll=renderAll;let loading=false;
renderAll=function(){
 if(!state[FLAG]&&!loading){loading=true;try{migrate()}finally{loading=false}}
 oldAll();
};
const oldMed=renderMeds;
renderMeds=function(){
 oldMed();
 const stale=document.getElementById('ironNote1193');
 if(stale)stale.textContent='Мальтофер в 13:00 с едой: разнести с Магнеротом и добавками кальция/цинка, не запивать чаем, кофе или молоком. Магнерот в 20:00 — предложенное вечернее время. Настройки push-уведомлений находятся ниже.';
 const host=document.getElementById('medSetup');if(!host)return;
 let box=document.getElementById('courseGuide1197');
 if(!box){box=document.createElement('div');box.id='courseGuide1197';box.className='notice';host.insertBefore(box,host.firstChild)}
 box.innerHTML='<b>Новые назначения</b><p>Вигантол: 16 капель за завтраком с 9 ноября на 60 дней, далее 4 капли ежедневно. КомплигамВ Комплекс: 1 таблетка после еды в 13:00 на 30 дней. Мальтофер 100 мг: 1 жевательная таблетка во время еды в 13:00 на 60 дней.</p><p class="sub">Даты курсов, время и отметки приёма можно изменить ниже. Перед изменением дозировки или совместного приёма проконсультируйся с врачом.</p>';
};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия '+VERSION);
renderAll();
})();