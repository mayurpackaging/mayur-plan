// Mayur Plan — Service Worker (basic, makes app installable)
const CACHE='mayur-plan-v1';

self.addEventListener('install', e=>{
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(clients.claim());
});

// Network-first: hamesha latest data, par offline pe cache se
self.addEventListener('fetch', e=>{
  // API calls aur Supabase ko cache mat karo
  if(e.request.url.includes('/api/') || e.request.url.includes('supabase')){
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
        return res;
      })
      .catch(()=>caches.match(e.request))
  );
});
