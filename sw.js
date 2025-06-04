// Service Worker for Member Management System
const CACHE_NAME = 'member-management-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安裝事件
self.addEventListener('install', (event) => {
  console.log('Service Worker 安裝中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('緩存已開啟');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('緩存失敗:', error);
      })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊緩存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在緩存中找到，返回緩存版本
        if (response) {
          return response;
        }
        
        // 否則從網路獲取
        return fetch(event.request)
          .then((response) => {
            // 檢查是否為有效響應
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 複製響應
            const responseToCache = response.clone();
            
            // 添加到緩存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 網路失敗時，如果是導航請求，返回離線頁面
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 背景同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('執行背景同步');
    event.waitUntil(doBackgroundSync());
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  console.log('收到推送通知');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的會員管理通知',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看詳情',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: '/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('會員管理系統', options)
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', (event) => {
  console.log('通知被點擊:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // 打開應用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 背景同步函數
async function doBackgroundSync() {
  try {
    // 這裡可以實現離線時的資料同步邏輯
    console.log('背景同步完成');
  } catch (error) {
    console.error('背景同步失敗:', error);
  }
}

// 消息處理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 錯誤處理
self.addEventListener('error', (event) => {
  console.error('Service Worker 錯誤:', event.error);
});

// 未處理的 Promise 拒絕
self.addEventListener('unhandledrejection', (event) => {
  console.error('未處理的 Promise 拒絕:', event.reason);
  event.preventDefault();
});