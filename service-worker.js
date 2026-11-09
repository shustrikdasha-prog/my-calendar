const CACHE='chto-poest-pwa-1194';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{}}catch{}
 const title=payload.title||'Напоминание о препарате';
 event.waitUntil(self.registration.showNotification(title,{body:payload.body||'Проверь назначение в приложении',icon:'./app-icon.svg',badge:'./app-icon.svg',tag:payload.tag||'medication',data:{url:payload.url||'./'},renotify:false}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'./',self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
 const existing=clients.find(c=>c.url.startsWith(self.registration.scope));
 if(existing)return existing.focus();
 return self.clients.openWindow(url);
 }));
});