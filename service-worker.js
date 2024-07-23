self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('OI-cache').then(function(cache) {
            return cache.addAll([
                '/',
                '/index.html',
                '/style.css',
                '/overlay.css',
                'fav/android-chrome-192x192.png',
                '/index.js',
                '/pop.mp3',
                '/pip.mp3',
                'fav/apple-touch-icon.png',
                'fav/android-chrome-512x512.png',
                'fav/favicon-16x16.png'
            ]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            // If a cache hit is found, return the cached response
            if (response) {
                return response;
            }

            // Otherwise, make a network request
            return fetch(event.request).then(function(networkResponse) {
                // If the network request is successful, cache the response and return it
                return caches.open('OI-cache').then(function(cache) {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(function() {
                // If the network request fails (e.g., no internet connection),
                // you can return a fallback response if available
                return caches.match('/index.html');
            });
        })
    );
});
