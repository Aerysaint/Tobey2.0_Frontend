"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import type { UserData } from "@/types"

export interface AuthContextType {
  user: User | null
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user?.uid)

      if (user) {
        // First set the user to prevent unnecessary redirects
        setUser(user)

        try {
          // Create/update user in database through API
          const userResponse = await fetch("/api/auth/user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (!userResponse.ok) {
            const data = await userResponse.json()
            console.error("Failed to create/update user:", data.error)
            // Don't sign out here, just log the error
          }
        } catch (error) {
          console.error("Error creating/updating user:", error)
          // Don't sign out here, just log the error
        }
      } else {
        setUser(null)
        // Only redirect to login if we're not already there
        if (window.location.pathname !== "/") {
          router.replace("/")
        }
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
