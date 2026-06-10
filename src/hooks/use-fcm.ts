import { useEffect } from "react";
import { getToken } from "firebase/messaging";
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
}
