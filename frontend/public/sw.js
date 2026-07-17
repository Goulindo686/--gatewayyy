// Service Worker — Web Push Notifications
// Registrado automaticamente pelo painel quando o vendedor ativa as notificacoes
// v3 — notificacoes de venda com som/vibracao e aviso para abas abertas

const CACHE_VERSION = 'v3';

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

    const showNativeNotification = self.registration.showNotification(title, options);

    const notifyOpenClients = clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
            if (!isSaleNotification) return;
            clientList.forEach(function (client) {
                client.postMessage({
                    type: 'GOUPAY_SALE_NOTIFICATION_SOUND',
                    title,
                    body: options.body,
                    url: options.data.url,
                    at: Date.now(),
                });
            });
        });

    event.waitUntil(Promise.all([showNativeNotification, notifyOpenClients]));
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
