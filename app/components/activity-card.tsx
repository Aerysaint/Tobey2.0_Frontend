"use client"

import { useState } from "react"
import { MapPin, Clock, Plus, Trash } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Activity } from "@/types"
import { useDrag } from "react-dnd"

interface ActivityCardProps {
  activity: Activity
  onAdd?: () => void
  onRemove?: () => void
}

export function ActivityCard({ activity, onAdd, onRemove }: ActivityCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const [{ isDragging }, dragRef] = useDrag({
    type: "ACTIVITY",
    item: activity,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div ref={dragRef} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card className="hover:bg-muted/50 transition-colors cursor-move">
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
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Duration: {activity.duration}h
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
            {onAdd && (
              <Button
                variant="default"
                size="sm"
                className="flex-none"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
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
          {showDetails && (
            <p className="text-sm text-muted-foreground">
              {activity.description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 