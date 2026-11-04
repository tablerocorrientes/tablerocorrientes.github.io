/* Modo aplicación: páginas desde caché con actualización; datos siempre de la red primero */
var VERSION='tc-v1';
var BASE=['/','/barrio/','/provincia/','/site.js','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(BASE);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==VERSION;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.indexOf('/data/')===0||u.pathname.indexOf('/assets/sat')===0){
    /* datos: red primero; sin conexión, la última copia guardada */
    e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(VERSION).then(function(ca){ca.put(u.pathname,c);});return r;}).catch(function(){return caches.match(u.pathname);}));
    return;
  }
  /* páginas y archivos del sitio: red primero con copia de respaldo */
  e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(VERSION).then(function(ca){ca.put(e.request,c);});return r;}).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match('/');});}));
});
