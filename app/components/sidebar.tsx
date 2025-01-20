"use client"

import { useState, useRef } from "react"
import { useDrag } from "react-dnd"
import { Users, MessageSquare, MapPin, Bot, Clock, Hotel, Search, GripVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Activity, Plan } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SidebarProps {
  plan: Plan
  onToggleGroupChats: () => void
  aiRecommendations: Activity[]
  onAddActivity: (activity: Activity) => void
  onRemoveAIRecommendation: (activityId: string) => void
  onAIRequest: (request: string) => void
}

export function Sidebar({
  plan,
  onToggleGroupChats,
  aiRecommendations,
  onAddActivity,
  onRemoveAIRecommendation,
  onAIRequest,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [placesToGoHeight, setPlacesToGoHeight] = useState(50) // percentage
  const resizeRef = useRef<HTMLDivElement>(null)

  const filteredActivities = plan.activities.filter((activity) =>
    activity.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

  return (
    <div className="flex w-80 flex-col border-r">
      <div className="flex-1 overflow-hidden">
        <div className="p-4" style={{ height: `${placesToGoHeight}%` }}>
          <h2 className="mb-2 text-sm font-semibold">PLACES TO GO</h2>
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-4rem)]">
            <div className="space-y-2">
              {filteredActivities.length > 0
                ? filteredActivities.map((activity) => (
                    <DraggableActivityCard key={activity.id} activity={activity} isRecommendation={false} />
                  ))
                : plan.activities.map((activity) => (
                    <DraggableActivityCard key={activity.id} activity={activity} isRecommendation={false} />
                  ))}
            </div>
          </ScrollArea>
        </div>
        <div
          ref={resizeRef}
          className="h-2 bg-muted cursor-row-resize flex items-center justify-center"
          onMouseDown={handleResize}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="p-4" style={{ height: `${100 - placesToGoHeight}%` }}>
          <h2 className="mb-2 text-sm font-semibold">AI RECOMMENDATIONS</h2>
          <ScrollArea className="h-[calc(100%-6rem)]">
            <div className="space-y-2">
              {aiRecommendations.length > 0 ? (
                aiRecommendations.map((activity) => (
                  <DraggableActivityCard
                    key={activity.id}
                    activity={activity}
                    isRecommendation={true}
                    onAddActivity={onAddActivity}
                    onRemoveAIRecommendation={onRemoveAIRecommendation}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recommendations yet. Try asking the AI for suggestions!
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <div className="border-t p-4">
        <Button className="w-full flex items-center justify-center gap-2" onClick={onToggleGroupChats}>
          <MessageSquare className="h-4 w-4" />
          <span>Group Chats</span>
        </Button>
      </div>
    </div>
  )
}

interface DraggableActivityCardProps {
  activity: Activity
  isRecommendation?: boolean
  onAddActivity?: (activity: Activity) => void
  onRemoveAIRecommendation?: (activityId: string) => void
}

function DraggableActivityCard({
  activity,
  isRecommendation,
  onAddActivity,
  onRemoveAIRecommendation,
}: DraggableActivityCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ACTIVITY",
    item: activity,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const handleShowDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDetails((prev) => !prev)
  }

  const handleAddToTrip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddActivity && isRecommendation) {
      onAddActivity(activity)
      if (onRemoveAIRecommendation) {
        onRemoveAIRecommendation(activity.id)
      }
    }
  }

  const getRecommendationDetails = () => {
    switch (activity.title) {
      case "Hadimba Temple Visit":
        return (
          <>
            <p className="text-sm mt-2">
              <strong>Why visit:</strong> Hadimba Temple is a unique ancient cave temple dedicated to Hadimba Devi, a
              character from the Indian epic Mahabharata. It's surrounded by a beautiful cedar forest, offering a serene
              and spiritual experience.
            </p>
            <p className="text-sm mt-2">
              <Clock className="inline h-4 w-4 mr-1" />
              <strong>Best time to visit:</strong> Early morning (6-8 AM) for a peaceful atmosphere and to avoid crowds.
              The temple is particularly beautiful during sunrise.
            </p>
            <p className="text-sm mt-2">
              <Hotel className="inline h-4 w-4 mr-1" />
              <strong>Nearby stay:</strong> The Himalayan, a luxury resort just 1.5 km away, offers stunning views of
              the Himalayas and easy access to the temple.
            </p>
          </>
        )
      case "Solang Valley Adventure":
        return (
          <>
            <p className="text-sm mt-2">
              <strong>Why visit:</strong> Solang Valley is a hub for adventure sports in Manali. It offers a range of
              activities including paragliding, zorbing, and skiing (in winter), making it perfect for thrill-seekers
              and nature lovers alike.
            </p>
            <p className="text-sm mt-2">
              <Clock className="inline h-4 w-4 mr-1" />
              <strong>Best time to visit:</strong> Mid-morning to early afternoon (10 AM - 2 PM) for optimal weather
              conditions for paragliding and other activities. Visit in winter (December-February) for skiing.
            </p>
            <p className="text-sm mt-2">
              <Hotel className="inline h-4 w-4 mr-1" />
              <strong>Nearby stay:</strong> Solang Valley Resort, located right in the valley, provides easy access to
              all activities and breathtaking views of the surrounding mountains.
            </p>
          </>
        )
      default:
        return <p className="text-sm mt-2">{activity.description}</p>
    }
  }

  return (
    <div ref={drag} className={`transition-opacity ${isDragging ? "opacity-50" : "opacity-100"} cursor-move`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="flex items-start gap-3">
            <img
              src={activity.image || "/placeholder.svg"}
              alt={activity.title}
              className="h-16 w-16 rounded-md object-cover"
            />
            <div className="flex-1">
              <h3 className="font-medium">{activity.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {activity.location}
              </p>
              <p className="mt-1 text-sm">₹{activity.cost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: {activity.duration}h</p>
            </div>
          </div>
          {isRecommendation && (
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={handleShowDetails}>
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
              <Button variant="default" size="sm" onClick={handleAddToTrip}>
                Add to Trip
              </Button>
            </div>
          )}
          {showDetails && getRecommendationDetails()}
        </CardContent>
      </Card>
    </div>
  )
}

