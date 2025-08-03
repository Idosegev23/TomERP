// Service Worker for נדל"ן Pro PWA
const CACHE_NAME = 'nedlan-pro-v1.0.0';
const STATIC_CACHE = 'nedlan-pro-static-v1.0.0';
const DYNAMIC_CACHE = 'nedlan-pro-dynamic-v1.0.0';

// Files to cache immediately (App Shell)
const STATIC_FILES = [
  '/',
  '/login',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Core CSS and JS files will be cached automatically by Vite
];

// API endpoints that can work offline
const CACHEABLE_APIS = [
  '/api/projects',
  '/api/tasks',
  '/api/apartments',
  '/api/buildings',
  '/api/floors'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('🔧 Service Worker: Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML pages - Network first, fallback to cache
    event.respondWith(handlePageRequest(request));
  } else if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
    // API requests - Network first with offline support
    event.respondWith(handleApiRequest(request));
  } else {
    // Static assets - Cache first
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle page requests (HTML)
async function handlePageRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    console.log('📱 Service Worker: Network failed, trying cache for page');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return caches.match('/') || new Response('אפליקציה לא זמינה במצב לא מקוון', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  try {
    // Always try network first for API calls
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed
    if (request.method === 'GET') {
      console.log('📱 Service Worker: API network failed, trying cache');
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        // Add offline indicator header
        const response = cachedResponse.clone();
        response.headers.set('X-Served-By', 'sw-cache');
        return response;
      }
    }
    
    // For non-GET requests or no cache, return error
    return new Response(JSON.stringify({
      error: 'לא ניתן לבצע פעולה זו במצב לא מקוון',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Served-By': 'sw-offline'
      }
    });
  }
}

// Handle static assets (CSS, JS, images)
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('📱 Service Worker: Static asset not available:', request.url);
    
    // Return a fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f4f6"/><text x="50" y="50" text-anchor="middle" fill="#9ca3af" font-size="12">תמונה לא זמינה</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when online
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or cache
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action
        await removeOfflineAction(action.id);
        
        // Notify user
        self.registration.showNotification('פעולה הושלמה', {
          body: 'פעולה שהתבצעה במצב לא מקוון הושלמה בהצלחה',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'sync-success'
        });
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline actions storage
async function getOfflineActions() {
  // Implement IndexedDB storage for offline actions
  return [];
}

async function removeOfflineAction(id) {
  // Implement IndexedDB removal
}

// Push notifications support
self.addEventListener('push', (event) => {
  console.log('📢 Service Worker: Push received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'התקבל עדכון חדש במערכת',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'פתח',
          icon: '/icons/open-action.png'
        },
        {
          action: 'close',
          title: 'סגור',
          icon: '/icons/close-action.png'
        }
      ],
      tag: data.tag || 'default',
      requireInteraction: true,
      dir: 'rtl',
      lang: 'he'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'נדל"ן Pro', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Check if app is already open
        const client = clients.find(c => c.visibilityState === 'visible');
        
        if (client) {
          client.focus();
          if (event.notification.data.url) {
            client.navigate(event.notification.data.url);
          }
        } else {
          // Open new window
          self.clients.openWindow(event.notification.data.url || '/');
        }
      })
    );
  }
});

// Update available notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skipping waiting');
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker: Loaded and ready');