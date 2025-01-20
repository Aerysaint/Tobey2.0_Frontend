"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"

interface GroupSelectionProps {
  onJoinGroup: (groupId: string) => void
  onCreateGroup: (groupName: string, activities?: Activity[], events?: Event[]) => void
}

export function GroupSelection({ onJoinGroup, onCreateGroup }: GroupSelectionProps) {
  const [groupId, setGroupId] = useState("")
  const [newGroupName, setNewGroupName] = useState("")

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (groupId) {
      onJoinGroup(groupId)
    }
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (newGroupName) {
      onCreateGroup(newGroupName)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Join or Create a Group</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Join Existing Group</CardTitle>
            <CardDescription>Enter a group ID to join an existing travel group</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <Input placeholder="Enter Group ID" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
              <Button type="submit" className="w-full">
                <Users className="mr-2 h-4 w-4" /> Join Group
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create New Group</CardTitle>
            <CardDescription>Create a new travel group and invite others</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <Input
                placeholder="Enter Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

