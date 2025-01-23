"use client";

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithPopup, getIdToken, signInWithRedirect, getRedirectResult } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { auth, googleProvider } from "@/lib/firebase"
import { useAuth } from "@/app/contexts/auth-context"
import { toast, Toaster } from "sonner"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      // First attempt normal navigation
      router.replace("/home")

      // Set up a delayed reload as fallback
      const timer = setTimeout(() => {
        window.location.reload()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [user, router])

  const handleGoogleLogin = async () => {
    if (!user) {
      setIsLoading(true)
      try {
        // First try popup
        try {
          const result = await signInWithPopup(auth, googleProvider)
          const idToken = await getIdToken(result.user)
          await handleLoginSuccess(idToken)
        } catch (popupError) {
          console.log("Popup failed, falling back to redirect:", popupError)
          // If popup fails (blocked), fall back to redirect
          await signInWithRedirect(auth, googleProvider)
        }
      } catch (error) {
        console.error("Error signing in with Google:", error)
        toast.error("Failed to sign in with Google", {
          description: error instanceof Error ? error.message : "Please try again",
        })
        setIsLoading(false)
      }
    }
  }

  // Handle redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          const idToken = await getIdToken(result.user)
          await handleLoginSuccess(idToken)
        }
      } catch (error) {
        console.error("Error handling redirect result:", error)
        toast.error("Failed to complete sign in", {
          description: error instanceof Error ? error.message : "Please try again",
        })
        setIsLoading(false)
      }
    }

    handleRedirectResult()
  }, [])

  const handleLoginSuccess = async (idToken: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("Failed to create session")
      }

      // Wait for the session data to be processed
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if we have a valid session before redirecting
      const sessionResponse = await fetch("/api/auth/session")
      const sessionData = await sessionResponse.json()

      if (!sessionData.session) {
        throw new Error("Session not established")
      }

      // Use router.replace to prevent back navigation to login
      await router.replace("/home")
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error("Failed to create session", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Toaster richColors position="top-center" />
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold">Welcome to Travel Planner</h2>
          <p className="mt-2 text-gray-600">Sign in to start planning your trips</p>
        </div>
        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-600 border hover:bg-gray-50"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {isLoading ? "Signing in..." : "Continue with Google"}
        </Button>
      </div>
    </div>
  )
}

