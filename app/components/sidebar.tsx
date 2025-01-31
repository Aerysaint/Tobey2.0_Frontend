"use client"

import { useState, useCallback, useEffect } from "react"
import { Search, Bot, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityCard } from "./activity-card"
import type { Plan, Activity } from "@/types"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import api from '@/lib/axios'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"

interface SidebarProps {
  plan: Plan
  onToggleGroupChats: () => void
  currentGroupId?: string | null
}

export function Sidebar({
  plan,
  onToggleGroupChats,
  currentGroupId,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Activity[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([])
  const [isAIEnabled, setIsAIEnabled] = useState(false)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customActivity, setCustomActivity] = useState({
    name: '',
    cityName: '',
    fromDate: '',
    toDate: ''
  })
  const [isSearchDisabled, setIsSearchDisabled] = useState(false)

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
    
    // Clear search results when AI is disabled
    if (!isAIEnabled) {
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [currentGroupId, isAIEnabled]); // Effect runs when currentGroupId or isAIEnabled changes

  // Handle AI search
  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isAIEnabled && searchQuery.trim() && !isSearchDisabled) {
      setIsSearchDisabled(true);
      setIsSearching(true);
      
      try {
        const response = await api.get('/llmSearch', {
          params: {
            groupid: currentGroupId,
            query: searchQuery.trim()
          }
        });
        
        const activities: Activity[] = response.data.map((data: any) => ({
          id: data.id || "id not given", // Fallback ID if none provided
          name: data.Name,
          cityName: data.CityName,
          price: data.Price,
          currency: data.Currency,
          imageList: data.ImageList || []
        }));
        
        setSearchResults(activities);
      } catch (error) {
        console.error("Error performing AI search:", error);
        toast.error("Failed to perform AI search");
      } finally {
        setIsSearching(false);
        setIsSearchDisabled(false);
      }
    }
  };

  // Modified display logic in the return statement
  const displayedActivities = isAIEnabled
    ? (searchResults.length > 0 ? searchResults : [])
    : (searchQuery
        ? availableActivities.filter(
            activity =>
              activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              activity.cityName.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : availableActivities);

  const handleAddCustomActivity = async () => {
    // Validate dates
    const fromDate = new Date(customActivity.fromDate)
    const toDate = new Date(customActivity.toDate)

    if (toDate <= fromDate) {
      toast.error("End time must be after start time")
      return
    }

    try {
      // Adjust for timezone offset to keep the exact time
      const fromDateFormatted = new Date(fromDate.getTime() - (fromDate.getTimezoneOffset() * 60000))
        .toISOString()
        .split('.')[0]
      const toDateFormatted = new Date(toDate.getTime() - (toDate.getTimezoneOffset() * 60000))
        .toISOString()
        .split('.')[0]
      
      const response = await api.get('/addCustomActivity', {
        params: {
          groupid: currentGroupId,
          name: customActivity.name,
          cityname: customActivity.cityName,
          fromdate: fromDateFormatted,
          todate: toDateFormatted
        }
      })

      if (response.data === -1) {
        toast.error("Activity could not be added at the specified time")
        return
      }

      toast.success("Custom activity added successfully")
      setShowAddCustom(false)
      setCustomActivity({ name: '', cityName: '', fromDate: '', toDate: '' })
    } catch (error) {
      console.error("Error adding custom activity:", error)
      toast.error("Failed to add custom activity")
    }
  }

  // Helper function to round time to nearest 15 minutes
  const roundToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    const newDate = new Date(date)
    newDate.setMinutes(roundedMinutes)
    newDate.setSeconds(0)
    newDate.setMilliseconds(0)
    return format(newDate, "yyyy-MM-dd'T'HH:mm")
  }

  // Handle datetime input changes with 15-minute rounding
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'fromDate' | 'toDate') => {
    const date = new Date(e.target.value)
    const roundedDate = roundToNearest15Minutes(date)
    setCustomActivity(prev => ({ ...prev, [field]: roundedDate }))
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

  return (
    <div className="w-80 border-r bg-muted/10">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Available Activities</h2>
            <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom
            </Button>
          </div>

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
              onKeyDown={handleSearch}
              disabled={isSearchDisabled}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-4 space-y-4">
              {isSearching ? (
                <div className="text-center text-muted-foreground">Searching...</div>
              ) : displayedActivities.length > 0 ? (
                displayedActivities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} groupId={currentGroupId} />
                ))
              ) : (
                <div className="text-center text-muted-foreground">
                  {isAIEnabled 
                    ? "Enter your search and press Enter" 
                    : "No activities found"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Add Custom Activity</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-medium">
                  Activity Name
                </Label>
                <Input
                  id="name"
                  value={customActivity.name}
                  onChange={(e) => setCustomActivity(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter activity name"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city" className="font-medium">
                  City Name
                </Label>
                <Input
                  id="city"
                  value={customActivity.cityName}
                  onChange={(e) => setCustomActivity(prev => ({ ...prev, cityName: e.target.value }))}
                  placeholder="Enter city name"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromDate" className="font-medium">
                  Start Time
                </Label>
                <Input
                  id="fromDate"
                  type="datetime-local"
                  value={customActivity.fromDate}
                  onChange={(e) => handleDateChange(e, 'fromDate')}
                  step="900"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toDate" className="font-medium">
                  End Time
                </Label>
                <Input
                  id="toDate"
                  type="datetime-local"
                  value={customActivity.toDate}
                  onChange={(e) => handleDateChange(e, 'toDate')}
                  step="900"
                  className="h-10"
                />
              </div>
              <Button 
                className="w-full h-10 mt-2"
                onClick={handleAddCustomActivity}
                disabled={!customActivity.name || !customActivity.cityName || !customActivity.fromDate || !customActivity.toDate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Itinerary
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

