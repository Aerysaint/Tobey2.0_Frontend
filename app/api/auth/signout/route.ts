import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Clear the session cookie
    cookies().delete("session")

    return NextResponse.json({ status: "success" }, { status: 200 })
  } catch (error) {
    console.error("Error signing out:", error)
    return NextResponse.json(
      { status: "error", message: "Failed to sign out" },
      { status: 500 }
    )
  }
} 