"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for session cookie first
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session")
        const data = await response.json()

        // If no valid session, clear any persisted auth state
        if (!data.session) {
          await auth.signOut()
        }
      } catch (error) {
        console.error("Error checking session:", error)
        // On error, assume no session and clear auth state
        await auth.signOut()
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If user exists in Firebase, verify session
        try {
          const response = await fetch("/api/auth/session")
          const data = await response.json()

          if (!data.session) {
            // If no valid session, sign out from Firebase
            await auth.signOut()
            setUser(null)
          } else {
            setUser(user)
          }
        } catch (error) {
          console.error("Error verifying session:", error)
          await auth.signOut()
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    // Check session on mount
    checkSession()

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
