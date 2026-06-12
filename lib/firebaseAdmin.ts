import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminDB() {
  if (!app) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      // Service account JSON set as environment variable (Vercel)
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (!admin.apps.length) {
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
      } else {
        app = admin.apps[0] as admin.app.App;
      }
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }
  }

  return admin.database();
}
