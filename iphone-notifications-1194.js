/* 11.9.4 — iPhone push permission/subscription setup.
   Scheduled backend dispatch runs once per minute via Supabase. */
(function(){
'use strict';
const VAPID='BHKIyvmIuEuInpBkr2wkpTU2fG63-Jzzi8qmRg8lX2OZ0sPUS7QYhJjik2OYROIeUJDjR9i_yvR2tAwbR3COGFE';
function b64(s){const p='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
let registrationPromise=null;
function worker(){
 if(!('serviceWorker'in navigator))return Promise.reject(new Error('Service Worker не поддерживается'));
 if(!registrationPromise)registrationPromise=navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
 return registrationPromise;
}
function plans(){
 return MEDS.filter(m=>m.days>0).map(m=>{
 const v=state.meds?.[m.name]||{};
 return {name:m.name,dose:v.dose||m.dose,time:v.time||m.time||'',start:v.start||'',days:Number(v.days)||m.days,
 enabled:!!(v.enabled&&v.confirmed&&v.start&&(v.time||m.time))};
 });
}
async function syncPush(){
 if(typeof cloud==='undefined'||!cloud||typeof cloudUser==='undefined'||!cloudUser)throw Error('Сначала войди в облачный аккаунт в настройках приложения.');
 const reg=await worker();
 const subscription=await reg.pushManager.getSubscription();
 if(!subscription)throw Error('Подписка iPhone не найдена. Нажми «Разрешить уведомления».');
 const j=subscription.toJSON();
 const row={user_id:cloudUser.id,endpoint:j.endpoint,p256dh:j.keys?.p256dh,auth_key:j.keys?.auth,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Moscow',schedule:plans(),enabled:true,updated_at:new Date().toISOString()};
 const {error}=await cloud.from('push_subscriptions').upsert(row,{onConflict:'user_id,endpoint'});
 if(error)throw Error('Не удалось сохранить подписку: '+error.message);
 return true;
}
const oldSave=save;
let refreshTimer;
save=function(){oldSave();clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>syncPush().catch(()=>{}),2500)};
function panel(){
 const host=document.getElementById('medSetup');
 if(!host)return;
 let box=document.getElementById('pushPanel1194');
 if(!box){box=document.createElement('section');box.className='card';box.id='pushPanel1194';host.insertAdjacentElement('afterend',box)}
 const support=('Notification'in window)&&('PushManager'in window)&&('serviceWorker'in navigator);
 box.innerHTML='<h3>Напоминания на iPhone</h3>'+
 '<p class="sub">Настраиваем системные push-уведомления. Подписка телефона уже может быть сохранена, и серверная отправка подключена. Для важных лекарств сохраняй резервные напоминания в «Здоровье» на случай задержки доставки.</p>'+
 '<p class="sub">Время берётся из каждого активного назначения. Для изменения времени открой лекарство выше. Чтобы push приходил при закрытом приложении, его нужно добавить на экран «Домой» и разрешить уведомления.</p>'+
 '<div class="flex"><button class="btn" id="pushEnable1194">Разрешить уведомления</button><button class="btn alt" id="pushTest1194">Проверить на этом iPhone</button><button class="btn alt" id="pushSync1194">Обновить расписание</button></div>'+
 '<p id="pushStatus1194" class="sub" role="status" style="margin-top:12px"></p>'+
 '<details class="secondary-details"><summary>Расписание активных назначений</summary><div class="details-body">'+
 (plans().filter(x=>x.enabled).map(x=>'<p>'+escapes(x.time)+' · '+escapes(x.name)+' · '+escapes(x.dose)+'</p>').join('')||'<p>Нет активных назначений с указанным временем.</p>')+
 '</div></details>';
 const status=t=>{const x=document.getElementById('pushStatus1194');if(x)x.textContent=t};
 if(!support){status('Этот режим браузера не поддерживает Web Push. Открой приложение с домашнего экрана iPhone (iOS 16.4+).');return}
 status('Статус разрешения: '+Notification.permission+'. Серверные напоминания включены после подписки телефона.');
 document.getElementById('pushEnable1194').onclick=async()=>{
  try{
   if(!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)
     throw Error('На iPhone открой установленное веб-приложение с экрана «Домой», а не вкладку Safari.');
   const reg=await worker();
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw Error('iPhone не разрешил уведомления. Проверь Настройки → Уведомления.');
   const previous=await reg.pushManager.getSubscription();if(previous)await previous.unsubscribe();
   await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
   await syncPush();
   status('Разрешение получено, телефон подписан на автоматические напоминания. Доставка зависит от связи и настроек iOS.');
  }catch(e){status(e.message||String(e))}
 };
 document.getElementById('pushTest1194').onclick=async()=>{
  try{if(Notification.permission!=='granted')throw Error('Сначала разреши уведомления.');
   const reg=await worker();await reg.showNotification('Что поесть? — тест',{body:'Это проверка уведомления на этом iPhone. Запланированные push отправляются сервером по расписанию.',icon:'./app-icon.svg',tag:'med-test'});
   status('Тестовое уведомление показано. Оно проверяет только разрешение iOS; доставка из облака проверяется ближайшим запланированным приёмом.');
  }catch(e){status(e.message||String(e))}
 };
 document.getElementById('pushSync1194').onclick=async()=>{
  try{await syncPush();status('Расписание сохранено в облаке для автоматической отправки.')}catch(e){status(e.message||String(e))}
 };
}
const prevRender=renderMeds;
renderMeds=function(){prevRender();panel()};
worker().catch(()=>{});
const oldAll=renderAll;
renderAll=function(){oldAll();panel()};
document.querySelectorAll('.footer').forEach(el=>el.textContent='Версия 11.9.4');
renderAll();
})();