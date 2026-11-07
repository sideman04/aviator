const CACHE_NAME = 'aviator-shell-v3'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/aviator.svg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await cache.addAll(APP_SHELL)
        const index = await cache.match('/index.html')
        const html = await index.text()
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\/assets\/[^"]+)"/g)].map(match => match[1])
        await cache.addAll(assets)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('aviator-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response.ok) return response
          return caches.open(CACHE_NAME)
            .then(cache => cache.put('/index.html', response.clone()))
            .then(() => response)
        })
        .catch(async () => (await caches.match(request)) || caches.match('/index.html'))
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response.ok) return response
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()))
            .then(() => response)
        })
        .catch(async error => {
          const cached = await caches.match(request)
          if (cached) return cached
          throw error
        })
    )
  }
})
