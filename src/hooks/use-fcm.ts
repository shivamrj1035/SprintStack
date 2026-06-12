import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";
import { saveFcmToken } from "@/server-fns/chat";

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function useFcm(userId: string | null) {
  // Register for push and save FCM token
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const registration = await navigator.serviceWorker.ready;

        // Send Firebase config to SW so it can init background messaging
        if (registration.active) {
          registration.active.postMessage({
            type: "FIREBASE_SW_CONFIG",
            config: FIREBASE_CONFIG,
          });
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (token) {
          await saveFcmToken({ data: { token } });
        }
      } catch {
        // Notification permission denied or unsupported — silent failure is correct
      }
    };

    register();
  }, [userId]);

  // Show native notification when app is in the foreground
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const unsub = onMessage(messaging, (payload) => {
      if (Notification.permission !== "granted") return;

      const conversationId = payload.data?.conversationId;
      const url = payload.data?.url ?? "/chat";

      // Skip if user is already viewing this conversation
      if (conversationId && window.location.pathname === `/chat/${conversationId}`) return;

      const title = payload.notification?.title ?? "SprintStack";
      const body = payload.notification?.body ?? "You have a new message";

      // Use SW to show the notification so it works consistently across browsers
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/Loading.svg",
            badge: "/Loading.svg",
            tag: conversationId ?? "chat",
            data: { url },
          });
        })
        .catch(() => {
          // Fallback to plain Notification API
          const n = new Notification(title, {
            body,
            icon: "/Loading.svg",
            tag: conversationId ?? "chat",
          });
          n.onclick = () => {
            n.close();
            window.focus();
            window.location.href = url;
          };
        });
    });

    return unsub;
  }, [userId]);
}
