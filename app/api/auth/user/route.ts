import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"
import { adminApp } from "@/lib/firebase-admin"

// Get auth and database from initialized app
const auth = getAuth(adminApp)
const db = getDatabase(adminApp)

export async function POST() {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session cookie found" }, { status: 401 })
    }

    // Verify session
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)
    const user = await auth.getUser(decodedClaims.uid)

    // Get existing user data if any
    const userRef = db.ref(`users/${user.uid}`)
    const snapshot = await userRef.get()

    // Prepare user data
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      groups: snapshot.exists() ? snapshot.val().groups || {} : {},
      createdAt: snapshot.exists() ? snapshot.val().createdAt : Date.now(),
      lastLoginAt: Date.now(),
      role: snapshot.exists() ? snapshot.val().role || 'user' : 'user'
    }

    // Sync group memberships
    const groupsSnapshot = await db.ref('groups').get()
    if (groupsSnapshot.exists()) {
      groupsSnapshot.forEach((groupSnapshot) => {
        const groupData = groupSnapshot.val()
        const groupId = groupSnapshot.key

        if (groupData.members && groupData.members[user.uid]) {
          userData.groups[groupId] = {
            joinedAt: groupData.members[user.uid].joinedAt,
            role: groupData.members[user.uid].role || 'member',
            name: groupData.name
          }
        }
      })
    }

    // Save user data
    await userRef.set(userData)
    console.log("Successfully saved user data:", userData)

    return NextResponse.json({ success: true, user: userData })
  } catch (error) {
    console.error("Error in user API route:", error)
    return NextResponse.json(
      { error: "Failed to create/update user" },
      { status: 500 }
    )
  }
} 