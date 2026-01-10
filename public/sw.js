// Version is auto-generated during build from git commit or deployment ID
const VERSION = 'BUILD_VERSION_PLACEHOLDER';
const STATIC_CACHE = `static-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const API_CACHE = `api-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately (precaching for faster offline access)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-96x96.png',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// API endpoints to cache with network-first strategy (expanded for better offline support)
const API_ROUTES = [
  '/api/expenses',
  '/api/budgets',
  '/api/goals',
  '/api/meals',
  '/api/workouts',
  '/api/stats',
  '/api/calorie-stats',
  '/api/exercises',
  '/api/budgets/predictions',
];

// Max cache sizes (optimized for better offline performance)
const MAX_CACHE_SIZE = {
  dynamic: 75,    // Increased from 50 for more dynamic content
  images: 80,     // Increased from 60 for better image caching
  api: 30,        // Increased from 20 for better API response caching
};

// IndexedDB setup for offline queue
const DB_NAME = 'expensepal-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Helper: Check if request is for API
function isApiRequest(url) {
  return API_ROUTES.some(route => url.includes(route));
}

// Helper: Check if request is for image
function isImageRequest(url) {
  return /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url);
}

// Helper: Safely precache assets one by one (avoids Response cloning errors from addAll)
async function precacheAssets(cacheName, assets) {
  const cache = await caches.open(cacheName);
  
  const results = await Promise.allSettled(
    assets.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          // Clone the response before putting in cache
          await cache.put(url, response.clone());
          return { url, success: true };
        } else {
          console.warn(`[SW] Failed to cache ${url}: ${response.status}`);
          return { url, success: false };
        }
      } catch (error) {
        console.warn(`[SW] Failed to fetch ${url}:`, error.message);
        return { url, success: false };
      }
    })
  );
  
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`[SW] Precached ${successCount}/${assets.length} assets`);
}

// Install service worker and cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', VERSION);
  event.waitUntil(
    precacheAssets(STATIC_CACHE, STATIC_ASSETS)
    // Don't call skipWaiting() automatically - wait for user to trigger it
    // This prevents automatic updates that cause flickering on iOS
  );
});

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested, activating new version');
    self.skipWaiting();
  }
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', VERSION);
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes(VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
      // Set badge to 0
      setBadge(0),
    ])
  );
});

// Advanced fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension and browser requests
  if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
    return;
  }

  // Skip auth-related routes - let these go directly to network
  // This is critical for OAuth flow and session management in PWA mode
  if (url.includes('/auth/') || url.includes('/login') || url.includes('supabase')) {
    return;
  }

  // Strategy 1: Cache First (Static Assets - HTML, CSS, JS)
  if (request.destination === 'document' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      url.includes('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Cache First with refresh (Images)
  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request.clone(), IMAGE_CACHE));
    // Background refresh (separate fetch, not dependent on the main response)
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch(request.clone());
          // Only cache if response is ok and can be cloned (not opaque)
          if (response.ok && response.type !== 'opaque') {
            const cache = await caches.open(IMAGE_CACHE);
            await cache.put(request.clone(), response.clone());
            await limitCacheSize(IMAGE_CACHE, MAX_CACHE_SIZE.images);
          }
        } catch (error) {
          // Silently fail for background refresh
        }
      })()
    );
    return;
  }

  // Strategy 3: Network First (API Requests)
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy 4: Stale While Revalidate (Dynamic Content)
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request.clone());
    // Only cache successful, non-opaque responses
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      // Clone before putting in cache
      await cache.put(request.clone(), response.clone());
    }
    return response;
  } catch (error) {
    // If navigation request, show offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      return offlinePage || new Response('Offline', { status: 503 });
    }
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy (for API)
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    // Only cache successful, non-opaque responses
    if (response.ok && response.type !== 'opaque') {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request.clone(), response.clone());
        await limitCacheSize(cacheName, MAX_CACHE_SIZE.api);
      } catch (cacheError) {
        console.warn('[SW] Failed to cache API response:', cacheError);
      }
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);

  // Start the network request in the background
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request.clone());
      // Only cache successful, non-opaque responses
      if (response.ok && response.type !== 'opaque') {
        try {
          const cache = await caches.open(cacheName);
          await cache.put(request.clone(), response.clone());
          await limitCacheSize(cacheName, MAX_CACHE_SIZE.dynamic);
        } catch (cacheError) {
          console.warn('[SW] Failed to cache dynamic response:', cacheError);
        }
      }
      return response;
    } catch (error) {
      return null;
    }
  })();

  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  return networkResponse || new Response('Offline', { status: 503 });
}

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Expense Tracker', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || '1',
      url: data.url || '/',
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
    requireInteraction: false,
    tag: data.tag || 'expense-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// Badge API helper
async function setBadge(count) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (error) {
      console.log('[SW] Badge API not supported');
    }
  }
}

// IndexedDB helpers
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function addToQueue(request) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const queueItem = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  };

  await store.add(queueItem);

  // Update badge
  const count = await store.count();
  await setBadge(count);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueuedRequests() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return store.getAll();
}

async function removeFromQueue(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);

  // Update badge
  const count = await store.count();
  await setBadge(count);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Background sync for offline submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-expenses' || event.tag.startsWith('sync-')) {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  console.log('[SW] Syncing pending requests...');

  try {
    const requests = await getQueuedRequests();

    if (!requests || requests.length === 0) {
      console.log('[SW] No pending requests to sync');
      await setBadge(0);
      return;
    }

    console.log(`[SW] Found ${requests.length} pending requests`);

    const results = await Promise.allSettled(
      requests.map(async (item) => {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body,
          });

          if (response.ok) {
            await removeFromQueue(item.id);
            console.log('[SW] Successfully synced request:', item.id);
            return { success: true, id: item.id };
          } else {
            console.warn('[SW] Failed to sync request:', item.id, response.status);
            return { success: false, id: item.id };
          }
        } catch (error) {
          console.error('[SW] Error syncing request:', item.id, error);
          return { success: false, id: item.id };
        }
      })
    );

    const syncedCount = results.filter(r => r.value?.success).length;

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        syncedCount,
        totalCount: requests.length,
      });
    });

    console.log(`[SW] Sync complete: ${syncedCount}/${requests.length} successful`);
  } catch (error) {
    console.error('[SW] Error during sync:', error);
  }
}

// Periodic Background Sync for email import (requires registration from client)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync triggered:', event.tag);

  if (event.tag === 'sync-emails') {
    event.waitUntil(syncEmails());
  }
});

async function syncEmails() {
  console.log('[SW] Syncing emails in background...');

  try {
    const response = await fetch('/api/email/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response && response.ok) {
      // Clone before consuming to avoid "body already used" errors
      const responseClone = response.clone();
      const data = await responseClone.json();

      // Show notification if new expenses found
      if (data.newExpenses > 0) {
        await self.registration.showNotification('New Expenses Imported', {
          body: `${data.newExpenses} new ${data.newExpenses === 1 ? 'expense' : 'expenses'} imported from email`,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'email-sync',
          data: { url: '/?view=expenses' },
        });
      }

      console.log('[SW] Email sync complete:', data);
    }
  } catch (error) {
    console.error('[SW] Error syncing emails:', error);
  }
}

// Handle Share Target API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Share target endpoint
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const files = formData.getAll('files');

  // Store shared data in cache for the app to retrieve
  const sharedData = {
    title,
    text,
    files: await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        data: await file.arrayBuffer(),
      }))
    ),
    timestamp: Date.now(),
  };

  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.put(
    '/shared-data',
    new Response(JSON.stringify(sharedData), {
      headers: { 'Content-Type': 'application/json' },
    })
  );

  // Redirect to app with query parameter
  return Response.redirect('/?action=add&source=share', 303);
}
