import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;
let adminFirestoreInstance: Firestore | null = null;
let adminMessagingInstance: Messaging | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountKey);

  if (getApps().length === 0) {
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestoreInstance) {
    adminFirestoreInstance = getFirestore(getAdminApp());
  }
  return adminFirestoreInstance;
}

export function getAdminMessaging(): Messaging {
  if (!adminMessagingInstance) {
    adminMessagingInstance = getMessaging(getAdminApp());
  }
  return adminMessagingInstance;
}
