// Service Worker — Web Push Notifications
// Registrado automaticamente pelo painel quando o vendedor ativa as notificacoes

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
        body: data.body || 'Voce recebeu uma nova venda.',
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: data.url || '/dashboard' },
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: 'sale-notification',
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
