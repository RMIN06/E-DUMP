const SHELL = "edump-shell-0.1.6";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icon.png"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("edump-shell-") && key !== SHELL).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/saved-files/")) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(SHELL).then((cache) => cache.put(event.request, copy))); }
    return response;
  }).catch(async () => await caches.match(event.request) ?? (event.request.mode === "navigate" ? await caches.match("/") : undefined) ?? Response.error()));
});
self.addEventListener("push", (event) => {
  let data; try { data = event.data.json(); } catch { return; }
  if (!/^[a-f\d]{24}$/.test(data.announcement_id ?? "")) return;
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title, { body: data.body, icon: "/icon.png", badge: "/icon.png", tag: data.announcement_id, data: { announcement_id: data.announcement_id } }),
    self.clients.matchAll({ type: "window" }).then((clients) => clients.forEach((client) => client.postMessage(data))),
  ]));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); const id = event.notification.data?.announcement_id;
  if (!/^[a-f\d]{24}$/.test(id ?? "")) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const client = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (client) { await client.focus(); client.postMessage({ announcement_id: id, open: true }); }
    else await self.clients.openWindow(`/updates/${id}`);
  }));
});
