import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';

// This function is for SERVER-SIDE use only with Admin privileges.
export function initializeServerSideFirebase(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Check the environment and initialize accordingly.
  if (process.env.NODE_ENV === 'production') {
    // In production (App Hosting), use Application Default Credentials from the environment.
    try {
        return initializeApp();
    } catch (e) {
        console.error(
            'Firebase Admin SDK initialization failed in PRODUCTION. ' +
            'This likely means the App Hosting backend does not have the correct IAM permissions. ' +
            'Original error:', e
        );
        throw new Error('Could not initialize Firebase Admin SDK in production.');
    }
  } else {
    // In local development, provide the projectId explicitly.
    try {
      // This still requires you to be logged in via `gcloud auth application-default login`.
      return initializeApp({
          projectId: 'studio-4912983619-12bc4'
      });
    } catch (e) {
        console.error(
            'Firebase Admin SDK initialization failed for local development. ' +
            'Ensure you have run `gcloud auth application-default login` and that ' +
            'the projectId in src/firebase/server-init-admin.ts is correct. \n' +
            'Original error:', e
        );
        throw new Error('Could not initialize Firebase Admin SDK for local dev.');
    }
  }
}
