// Firebase Messaging Service Worker for SprintStack
// Receives Firebase config from the page via postMessage, then handles background push.

importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

let messagingReady = false;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_SW_CONFIG" && !messagingReady) {
    const config = event.data.config;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      const messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title ?? "SprintStack";
        const body = payload.notification?.body ?? "You have a new message";
        const url = payload.data?.url ?? "/chat";

        self.registration.showNotification(title, {
          body,
          icon: "/Loading.svg",
          badge: "/Loading.svg",
          data: { url },
          tag: payload.data?.conversationId ?? "chat",
          renotify: true,
        });
      });

      messagingReady = true;
    } catch (_) {
      // ignore — will retry on next page load
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
