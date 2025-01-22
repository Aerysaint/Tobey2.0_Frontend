import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminApp } from "@/lib/firebase-admin"

export async function GET() {
  try {
    const sessionCookie = cookies().get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ session: null })
    }

    // Verify the session cookie
    try {
      await getAuth(adminApp).verifySessionCookie(sessionCookie, true)
      return NextResponse.json({ session: true })
    } catch (error) {
      // Invalid or expired session cookie
      return NextResponse.json({ session: null })
    }
  } catch (error) {
    console.error("Error checking session:", error)
    return NextResponse.json({ session: null })
  }
} 