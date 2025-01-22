"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { groupsApi, type Group } from "@/services/groupsApi"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function RecentGroups() {
  const router = useRouter()
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadGroups = async () => {
      try {
        const userGroups = await groupsApi.getUserGroups(user.uid)
        setGroups(userGroups)
      } catch (error) {
        console.error("Error loading groups:", error)
        toast.error("Failed to load groups")
      } finally {
        setIsLoading(false)
      }
    }

    loadGroups()
  }, [user])

  if (isLoading) {
    return (
      <Card className="w-64">
        <CardHeader>
          <CardTitle className="text-lg">Your Groups</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-lg">Your Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups yet. Join one or create a new group.</p>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/planner?group=${group.id}`)}
                className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <h4 className="font-medium">{group.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(group.members).length} member{Object.keys(group.members).length !== 1 ? "s" : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
} 