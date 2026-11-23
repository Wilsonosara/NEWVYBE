/* VYBE web push handler for call notifications. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "VYBE", body: "You have a new notification." };
  }

  const title = payload.title || "VYBE";
  const options = {
    body: payload.body || "Open VYBE to answer.",
    icon: "/vybe-icon.svg",
    badge: "/vybe-icon.svg",
    tag: payload.callId ? `vybe-call-${payload.callId}` : "vybe-notification",
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 800],
    data: { url: payload.url || "/app/messages", callId: payload.callId },
    actions: [{ action: "open", title: "Open VYBE" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/app/messages", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(url);
      await client.focus();
      return;
    }
    await self.clients.openWindow(url);
  })());
});
