import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session")

  // If accessing login page with session, redirect to home
  if (request.nextUrl.pathname === "/" && session) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  // If accessing protected routes without session, redirect to login
  if (
    (request.nextUrl.pathname.startsWith("/home") ||
      request.nextUrl.pathname.startsWith("/planner")) &&
    !session
  ) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}