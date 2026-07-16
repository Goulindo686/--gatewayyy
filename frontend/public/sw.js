// Service Worker — Web Push Notifications
// Registrado automaticamente pelo painel quando o vendedor ativa as notificacoes
// v2 — icone atualizado

const CACHE_VERSION = 'v2';

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
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

    const title = data.title || 'Venda Aprovada!';
    const options = {
        body: data.body || 'Valor: R$ 0,00',
        icon: data.icon || '/favicon.png',
        badge: '/favicon.png',
        data: { url: data.url || '/dashboard' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: data.tag || 'sale-notification',
        renotify: true,
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
