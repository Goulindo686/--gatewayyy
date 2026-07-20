// Service Worker — Web Push Notifications
// Registrado automaticamente pelo painel quando o vendedor ativa as notificacoes
// v4 — o som de venda no Android e controlado pelo canal nativo do app

const CACHE_VERSION = 'v4';

self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Notificacao', body: event.data.text(), url: '/dashboard' };
    }

    const isSaleNotification =
        data.type === 'approved_sale' ||
        data.sound === 'sale_chime' ||
        String(data.tag || '').startsWith('sale-') ||
        /venda aprovada/i.test(String(data.title || ''));

    const title = data.title || 'Venda Aprovada!';
    const options = {
        body: data.body || 'Valor: R$ 0,00',
        icon: data.icon || '/favicon.png',
        badge: '/favicon.png',
        data: {
            url: data.url || '/dashboard',
            type: data.type || (isSaleNotification ? 'approved_sale' : 'notification'),
            sound: data.sound || (isSaleNotification ? 'sale_chime' : undefined),
        },
        vibrate: isSaleNotification ? [180, 80, 180, 80, 240] : [200, 100, 200],
        requireInteraction: false,
        tag: data.tag || 'sale-notification',
        renotify: true,
        silent: false,
        timestamp: data.timestamp || Date.now(),
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const url = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
