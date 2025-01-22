"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { database } from "@/lib/firebase"
import { ref, set, get } from "firebase/database"

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

    const createOrUpdateUser = async (user: User) => {
      const userRef = ref(database, `users/${user.uid}`)
      const snapshot = await get(userRef)

      if (!snapshot.exists()) {
        // Create new user record
        await set(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          groups: {},
          createdAt: Date.now(),
          lastLoginAt: Date.now()
        })
      } else {
        // Update last login time
        await set(userRef, {
          ...snapshot.val(),
          lastLoginAt: Date.now(),
          // Update these fields in case they changed in Google
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        })
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
            // Create/update user in Realtime Database
            await createOrUpdateUser(user)
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
