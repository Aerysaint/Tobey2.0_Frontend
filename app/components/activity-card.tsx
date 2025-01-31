"use client"

import { MapPin, Clock, Trash, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Activity } from "@/types"
import { useDrag } from "react-dnd"
import { useState } from "react"
import { ActivityDetailsPanel } from "./activity-details-panel"

interface ActivityCardProps {
  activity: Activity
  onRemove?: () => void
  groupId: string
}

export function ActivityCard({ activity, onRemove, groupId }: ActivityCardProps) {
  console.log("ActivityCard", activity, groupId)
  const [showDetails, setShowDetails] = useState(false)
  const [{ isDragging }, dragRef] = useDrag({
    type: "ACTIVITY",
    item: activity,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <>
      <div ref={dragRef as any} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Card className="hover:bg-muted/50 transition-colors cursor-move">
          <CardContent className="flex flex-col gap-3 p-3">
            <div className="flex items-start gap-3">
              <img
                src={activity.imageList[0] || "/placeholder.svg"}
                alt={activity.name}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium">{activity.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {activity.cityName}
                </p>
                <p className="mt-1 text-sm">
                  {activity.currency} {activity.price.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-none"
                onClick={() => setShowDetails(true)}
              >
                <Info className="h-4 w-4 mr-2" />
                Show Details
              </Button>
              {onRemove && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-none"
                  onClick={onRemove}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showDetails && (
        <ActivityDetailsPanel
          activity={activity}
          groupId={groupId}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  )
} 