self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("app-cache-v4").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "style.css",    
        "script.js",    
        "manifest.json",
        "icon-192.png"
      ]);
    })
  );
});

// "Cache First" con actualización dinámica.
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request).then(response => {
        return caches.open("app-cache-v4").then(cache => {
          // Guardamos en caché lo que no estaba inicialmente
          cache.put(e.request, response.clone());
          return response;
        });
      }).catch(() => caches.match("index.html")); 
    })
  );
});