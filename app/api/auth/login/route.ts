import { NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminApp } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  console.log("Received login request")

  try {
    // Add CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Content-Type": "application/json",
    }

    // Handle preflight request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { headers })
    }

    // Log request body
    const rawBody = await request.text()
    console.log("Raw request body:", rawBody)

    let body
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers }
      )
    }

    const { idToken } = body

    if (!idToken) {
      console.error("No ID token provided")
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400, headers }
      )
    }

    console.log("Got ID token, verifying...")

    // Verify the ID token
    const auth = getAuth(adminApp)
    const decodedToken = await auth.verifyIdToken(idToken)
    console.log("Token verified for user:", decodedToken.uid)

    // Create a session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    })
    console.log("Session cookie created")

    // Create response with session cookie
    const response = NextResponse.json(
      { status: "success" },
      { status: 200, headers }
    )

    // Set cookie
    response.cookies.set("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    })

    console.log("Sending successful response")
    return response
  } catch (error) {
    console.error("Error in /api/auth/login:", error)

    // Log the full error details
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    // Ensure we return a proper JSON response even for errors
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    })
  }
} 