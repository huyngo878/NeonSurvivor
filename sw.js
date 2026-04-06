const CACHE = 'neonSurvive-v1'

const ASSETS = [
  '/NeonSurvivor/',
  '/NeonSurvivor/index.html',
  '/NeonSurvivor/manifest.json',
  '/NeonSurvivor/assets/icon-192.png',
  '/NeonSurvivor/assets/icon-512.png',
  '/NeonSurvivor/src/main.js',
  '/NeonSurvivor/src/entities.js',
  '/NeonSurvivor/src/constants.js',
  '/NeonSurvivor/src/meta.js',
  '/NeonSurvivor/src/metaUpgrades.js',
  '/NeonSurvivor/src/upgrades.js',
  '/NeonSurvivor/src/render.js',
  '/NeonSurvivor/src/systems/movement.js',
  '/NeonSurvivor/src/systems/collision.js',
  '/NeonSurvivor/src/systems/weapons.js',
  '/NeonSurvivor/src/systems/spawner.js',
  '/NeonSurvivor/src/systems/pickup.js',
  '/NeonSurvivor/src/systems/gems.js',
  '/NeonSurvivor/src/ui/hud.js',
  '/NeonSurvivor/src/ui/levelUpScreen.js',
  '/NeonSurvivor/src/ui/startScreen.js',
  '/NeonSurvivor/src/ui/mainMenu.js',
  '/NeonSurvivor/src/ui/runSummary.js',
  '/NeonSurvivor/src/ui/metaScreen.js',
  '/NeonSurvivor/src/ui/joystick.js',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(e.request, clone))
        return response
      })
    })
  )
})
