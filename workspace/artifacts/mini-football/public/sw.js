/* Mini Football service worker — push notifications + click handling */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Mini Football", body: "" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }

  const title = payload.title || "Mini Football";
  const options = {
    body: payload.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/" },
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const scopeUrl = new URL(self.registration.scope);
      const fullUrl = new URL(
        targetPath.startsWith("/") ? targetPath.slice(1) : targetPath,
        scopeUrl,
      ).href;

      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(fullUrl);
            }
            return;
          } catch (_) {}
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(fullUrl);
      }
    })(),
  );
});
