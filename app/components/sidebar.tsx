"use client"

import { useState, useCallback, useEffect } from "react"
import { Search, Plus, Bot, GripVertical, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityCard } from "./activity-card"
import { GroupChat } from "./group-chat"
import type { Plan, Activity } from "@/types"
import { groupsApi } from "@/services/groupsApi"
import { toast } from "sonner"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface SidebarProps {
  plan: Plan
  onToggleGroupChats: () => void
  onAddActivity: (activity: Activity, startTime: Date) => Promise<void>
  currentGroupId?: string | null
}

export function Sidebar({
  plan,
  onToggleGroupChats,
  onAddActivity,
  currentGroupId,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Activity[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [placesToGoHeight, setPlacesToGoHeight] = useState(50) // percentage
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([])
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [isAIEnabled, setIsAIEnabled] = useState(false)

  // Load all available activities
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activities = await groupsApi.getActivities()
        setAvailableActivities(activities)
      } catch (error) {
        console.error("Error loading activities:", error)
        toast.error("Failed to load activities")
      }
    }

    loadActivities()
  }, [])

  // Search activities when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const searchTerm = searchQuery.toLowerCase()
    const results = availableActivities.filter(
      activity =>
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.location.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm)
    )
    setSearchResults(results)
    setIsSearching(false)
  }, [searchQuery, availableActivities])

  const handleResize = (e: React.MouseEvent) => {
    const startY = e.clientY
    const startHeight = placesToGoHeight

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY
      const deltaPercent = (deltaY / window.innerHeight) * 100
      setPlacesToGoHeight(Math.max(20, Math.min(80, startHeight + deltaPercent)))
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (!currentGroupId) {
    return (
      <div className="w-80 border-r bg-muted/10 flex items-center justify-center">
        <p className="text-muted-foreground text-center p-4">
          Please join or create a group to view activities and chat
        </p>
      </div>
    )
  }

  if (showChat) {
    return (
      <div className="w-80 border-r bg-muted/10">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">{plan.title} Chat</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
              Back to Activities
            </Button>
          </div>
          <GroupChat groupId={currentGroupId} groupName={plan.title} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-muted/10">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-4">Available Activities</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAIEnabled ? "Describe what you're looking for..." : "Search activities..."}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOverlayOpen(true)}
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="p-4 space-y-4">
              {isSearching ? (
                <div className="text-center text-muted-foreground">Searching...</div>
              ) : searchQuery ? (
                searchResults.length > 0 ? (
                  searchResults.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground">No results found</div>
                )
              ) : (
                availableActivities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowChat(true)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Open Group Chat
          </Button>
        </div>
      </div>

      {/* Search Overlay */}
      <Dialog open={isSearchOverlayOpen} onOpenChange={setIsSearchOverlayOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai-mode"
                  checked={isAIEnabled}
                  onCheckedChange={setIsAIEnabled}
                />
                <Label htmlFor="ai-mode" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Search
                </Label>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAIEnabled ? "Describe what you're looking for..." : "Search activities..."}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 p-2">
                {isSearching ? (
                  <div className="text-center text-muted-foreground">Searching...</div>
                ) : searchQuery ? (
                  searchResults.length > 0 ? (
                    searchResults.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground">No results found</div>
                  )
                ) : (
                  availableActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

