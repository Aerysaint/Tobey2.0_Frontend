import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { groupsApi } from "../services/groupsApi"

interface Group {
  id: string
  name: string
  plan: {
    title: string
    budget: number
    spent: number
  }
}

export function RecentGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const router = useRouter()

  useEffect(() => {
    const loadGroups = async () => {
      const fetchedGroups = await groupsApi.getGroups()
      setGroups(fetchedGroups)
    }
    loadGroups()
  }, [])

  const handleGroupClick = (groupId: string) => {
    router.push(`/planner?group=${groupId}`)
  }

  return (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-lg">Recent Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className="p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
            >
              <div className="font-medium">{group.name}</div>
              <div className="text-sm text-muted-foreground">
                Budget: ₹{group.plan.budget.toLocaleString()}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No groups found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 