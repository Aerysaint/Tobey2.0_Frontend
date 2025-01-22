import { getApps, initializeApp, cert, getApp } from "firebase-admin/app"

// Check if we already have a Firebase Admin instance
function getAdminApp() {
  try {
    // Validate environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials. Check environment variables: " +
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
      )
    }

    // Log the values (without the full private key)
    console.log("Firebase Admin Config:", {
      projectId,
      clientEmail,
      privateKeyLength: privateKey.length,
    })

    return getApps().length === 0
      ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // Make sure to handle the escaped newlines
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      })
      : getApp()
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
    console.error("Environment variables:", {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKeyExists: !!process.env.FIREBASE_PRIVATE_KEY,
      databaseUrl: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
    throw error
  }
}

export const adminApp = getAdminApp() 