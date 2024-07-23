self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('OI-cache').then(function(cache) {
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css',
          '/overlay.css',
          '/icon.png',
          '/index.js',
          '/pop.mp3',
          '/pip.mp3',
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  });
  