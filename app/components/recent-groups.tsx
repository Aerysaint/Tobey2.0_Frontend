"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/app/contexts/auth-context"
import { toast } from "sonner"
import { Loader2, LogOut } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import api from '@/lib/axios'

interface GroupData {
  id: string
  name: string
  memberCount: number
}

export function RecentGroups() {
  const router = useRouter()
  const { user } = useAuth()
  const [groups, setGroups] = useState<GroupData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [leavingGroup, setLeavingGroup] = useState<string | null>(null)

  const fetchGroups = async () => {
    try {
      const response = await api.get("/getGroups")
      const groupsData = response.data.map((group: any) => ({
        id: group.id,
        name: group.name,
        memberCount: group['member count']  // Using bracket notation due to space in key
      }))
      setGroups(groupsData)
    } catch (error) {
      console.error("Error loading groups:", error)
      toast.error("Failed to load groups")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return;

    const loadGroups = async () => {
      setIsLoading(true);
      try {
        // Verify session first
        const sessionResponse = await api.get("/authenticateSession");
        if (!sessionResponse.data.session) {
          console.error("No valid session found");
          toast.error("Session expired. Redirecting to login page");
          router.push("/");
          return;
        }

        // Then fetch groups
        await fetchGroups();
      } catch (error) {
        console.error("Error in groups loading flow:", error);
        toast.error("Failed to load groups");
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [user]);

  const handleLeaveGroup = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation() // Prevent navigation when clicking leave button

    if (!user || leavingGroup) return

    setLeavingGroup(groupId)
    try {
      await api.get(`/leaveGroup?groupId=${groupId}`)
      await fetchGroups()
      toast.success("Left group successfully")
    } catch (error) {
      console.error("Error leaving group:", error)
      toast.error("Failed to leave group")
    } finally {
      setLeavingGroup(null)
    }
  }

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
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No groups yet. Join one or create a new group.
              </p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => router.push(`/planner?group=${group.id}`)}
                  className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors relative group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-medium">{group.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleLeaveGroup(e, group.id)}
                      disabled={leavingGroup === group.id}
                    >
                      {leavingGroup === group.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 