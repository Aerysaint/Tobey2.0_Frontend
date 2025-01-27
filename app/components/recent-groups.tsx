"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/app/contexts/auth-context"
import { toast } from "sonner"
import { Loader2, LogOut } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import axios from "axios"

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
      // Get list of group IDs
      const response = await axios.get("http://localhost:8000/getGroups", {
        withCredentials: true
      });

      const groupIds = response.data;

      // Fetch details for each group
      const groupsData = await Promise.all(
        groupIds.map(async (groupId: string) => {
          // Get group name
          const nameResponse = await axios.get(
            `http://localhost:8000/getGroupName?groupId=${groupId}`,
            { withCredentials: true }
          );

          // Get member count
          const memberCountResponse = await axios.get(
            `http://localhost:8000/getGroupMemberCount?groupId=${groupId}`,
            { withCredentials: true }
          );

          return {
            id: groupId,
            name: nameResponse.data.name,
            memberCount: memberCountResponse.data.count
          };
        })
      );

      setGroups(groupsData);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchGroups();
  }, [user]);

  const handleLeaveGroup = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation() // Prevent navigation when clicking leave button

    if (!user || leavingGroup) return;

    setLeavingGroup(groupId);
    try {
      // Leave the group
      await axios.get(`http://localhost:8000/leaveGroup?groupId=${groupId}`, {
        withCredentials: true
      });

      // Refresh the groups list
      await fetchGroups();
      toast.success("Left group successfully");
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Failed to leave group");
    } finally {
      setLeavingGroup(null);
    }
  };

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
    );
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
  );
} 