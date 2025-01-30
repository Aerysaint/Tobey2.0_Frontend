"use client"

import { useState, useCallback, useEffect } from "react"
import { Search, Bot } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityCard } from "./activity-card"
import type { Plan, Activity } from "@/types"
import { groupsApi } from "@/services/groupsApi"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import api from '@/lib/axios'

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
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([])
  const [isAIEnabled, setIsAIEnabled] = useState(false)

  // Load all available activities
  useEffect(() => {
    const loadActivities = async () => {
      if (!currentGroupId) return;
      
      try {
        const response = await api.get(`/getAllActivities?groupid=${currentGroupId}`);
        const activities: Activity[] = response.data.map(([docId, data]: [string, any]) => ({
          id: docId,
          name: data.Name,
          cityName: data.CityName,
          price: data.Price,
          currency: data.Currency,
          imageList: data.ImageList || []
        }));
        setAvailableActivities(activities);
      } catch (error) {
        console.error("Error loading activities:", error);
        toast.error("Failed to load activities");
      }
    };

    loadActivities();
  }, [currentGroupId]);

  // Update search to use new activity structure
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const searchTerm = searchQuery.toLowerCase();
    const results = availableActivities.filter(
      activity =>
        activity.name.toLowerCase().includes(searchTerm) ||
        activity.cityName.toLowerCase().includes(searchTerm)
    );
    setSearchResults(results);
    setIsSearching(false);
  }, [searchQuery, availableActivities]);

  if (!currentGroupId) {
    return (
      <div className="w-80 border-r bg-muted/10 flex items-center justify-center">
        <p className="text-muted-foreground text-center p-4">
          Please join or create a group to view activities and chat
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-muted/10">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b space-y-4">
          <h2 className="font-semibold">Available Activities</h2>

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

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isAIEnabled ? "Describe what you're looking for..." : "Search activities..."}
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-12rem)]">
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
      </div>
    </div>
  )
}

