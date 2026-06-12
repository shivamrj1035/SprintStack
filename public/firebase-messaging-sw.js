// Firebase Messaging Service Worker for SprintStack
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

// Load the auto-generated Firebase config (baked in at dev/build time via
// scripts/generate-firebase-sw-config.js). This makes background push work
// even when no page is open — no postMessage needed.
try {
  importScripts("/firebase-sw-config.js");
} catch (_) {
  // Config file not yet generated; will rely on postMessage fallback below.
}

function handleBackgroundMessage(payload) {
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
}

// Self-initialize using the injected config so background push works immediately.
if (typeof self.FIREBASE_CONFIG !== "undefined" && self.FIREBASE_CONFIG.apiKey) {
  try {
    if (!firebase.apps.length) firebase.initializeApp(self.FIREBASE_CONFIG);
    firebase.messaging().onBackgroundMessage(handleBackgroundMessage);
  } catch (_) {}
}

// Fallback: accept config via postMessage from the page (covers edge cases where
// the config file was not generated before first load).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "FIREBASE_SW_CONFIG") return;
  if (firebase.apps.length) return; // already initialized above

  try {
    firebase.initializeApp(event.data.config);
    firebase.messaging().onBackgroundMessage(handleBackgroundMessage);
  } catch (_) {}
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
