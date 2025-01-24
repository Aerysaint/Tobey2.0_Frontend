"use client"

import { useDrop } from "react-dnd"
import { addDays, format, startOfWeek, isSameDay, addHours, subDays, isWithinInterval, isAfter, isBefore, isEqual } from "date-fns"
import type { Activity, Plan } from "@/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, ChevronLeft, ChevronRight, CalendarIcon, Clock, Info } from "lucide-react"
import { useState, useRef } from "react"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ActivityDetailsPanel } from "./activity-details-panel"

interface CalendarProps {
  plan: Plan
  onAddActivity: (activity: Activity, startTime: Date) => void
  onRemoveActivity: (activityId: string) => void
}

export function Calendar({ plan, onAddActivity, onRemoveActivity }: CalendarProps) {
  const [startDate, setStartDate] = useState(startOfWeek(new Date()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const colorMapRef = useRef(new Map<string, string>())

    // Update color map with new activities only
    ; (plan.activities || []).forEach(activity => {
      if (!colorMapRef.current.has(activity.id)) {
        const hue = Math.floor(Math.random() * 360)
        const saturation = Math.floor(Math.random() * 20 + 60)
        const lightness = Math.floor(Math.random() * 15 + 20)
        colorMapRef.current.set(activity.id, `hsl(${hue}, ${saturation}%, ${lightness}%)`)
      }
    })

  const getDayBudget = (day: Date) => {
    return (plan.activities || []).reduce((total, activity) => {
      const activityStart = new Date(activity.startTime || 0)
      return isSameDay(activityStart, day) ? total + (activity.cost || 0) : total
    }, 0)
  }

  const handlePrevWeek = () => {
    setStartDate((prevDate) => subDays(prevDate, 7))
  }

  const handleNextWeek = () => {
    setStartDate((prevDate) => addDays(prevDate, 7))
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(startOfWeek(date))
    }
  }

  return (
    <div className="flex-1 overflow-hidden p-6">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handlePrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarPicker mode="single" selected={startDate} onSelect={handleDateSelect} initialFocus />
          </PopoverContent>
        </Popover>
        <Button onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid Container */}
      <div className="relative h-[calc(100vh-200px)]">
        {/* Fixed Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-4">
            <div className="h-20" /> {/* Header spacer */}
            {days.map((day) => (
              <div key={day.toISOString()} className="text-center p-2">
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className="text-2xl">{format(day, "d")}</div>
                <div className="text-xs text-muted-foreground">₹{getDayBudget(day).toLocaleString()} spent</div>
              </div>
            ))}
          </div>
          {/* Add a shadow border at the bottom of the header */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="h-full">
          <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-4">
            {/* Time labels */}
            <div className="sticky left-0 z-40 bg-background">
              {hours.map((hour) => (
                <div key={hour} className="h-16 pr-2 text-right text-sm text-muted-foreground">
                  {hour % 12 || 12} {hour < 12 ? "AM" : "PM"}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {days.map((day) => (
              <div key={day.toISOString()}>
                {hours.map((hour) => (
                  <CalendarCell
                    key={`${day.toISOString()}-${hour}`}
                    day={day}
                    hour={hour}
                    plan={plan}
                    onAddActivity={onAddActivity}
                    onRemoveActivity={onRemoveActivity}
                    activityColors={colorMapRef.current}
                  />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

interface CalendarCellProps {
  day: Date
  hour: number
  plan: Plan
  onAddActivity: (activity: Activity, startTime: Date) => void
  onRemoveActivity: (activityId: string) => void
  activityColors: Map<string, string>
}

function CalendarCell({
  day,
  hour,
  plan,
  onAddActivity,
  onRemoveActivity,
  activityColors,
}: CalendarCellProps) {
  const [showDetailsForActivity, setShowDetailsForActivity] = useState<string | null>(null)
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "ACTIVITY",
      canDrop: (item: Activity) => {
        // Create the start time for the new activity
        const newActivityStart = new Date(day)
        newActivityStart.setHours(hour, 0, 0, 0)
        const newActivityEnd = addHours(newActivityStart, item.duration)

        // Check if activity extends beyond midnight
        const endHour = hour + item.duration
        if (endHour > 24) {
          return false
        }

        // Check for overlaps with existing activities
        const hasOverlap = (plan.activities || []).some(existingActivity => {
          if (!existingActivity.startTime) return false

          const existingStart = new Date(existingActivity.startTime)
          const existingEnd = addHours(existingStart, existingActivity.duration)

          // Check if the new activity overlaps with this existing activity
          return (
            isSameDay(existingStart, newActivityStart) &&
            (
              // New activity starts during existing activity
              (isAfter(newActivityStart, existingStart) && isBefore(newActivityStart, existingEnd)) ||
              // New activity ends during existing activity
              (isAfter(newActivityEnd, existingStart) && isBefore(newActivityEnd, existingEnd)) ||
              // New activity completely contains existing activity
              (isBefore(newActivityStart, existingStart) && isAfter(newActivityEnd, existingEnd)) ||
              // New activity starts exactly at the same time
              isEqual(newActivityStart, existingStart)
            )
          )
        })

        return !hasOverlap
      },
      drop: (item: Activity) => {
        const start = new Date(day)
        start.setHours(hour)
        start.setMinutes(0)
        start.setSeconds(0)
        start.setMilliseconds(0)

        // Check duration again here to show error message
        const endHour = hour + item.duration
        if (endHour > 24) {
          toast.error("Activity Duration Error", {
            description: `This activity is ${item.duration} hours long and would extend beyond the calendar day when started at ${format(start, 'h:mm a')}`,
          })
          return
        }

        // Check overlaps again here to show error message
        const newActivityStart = new Date(day)
        newActivityStart.setHours(hour, 0, 0, 0)
        const newActivityEnd = addHours(newActivityStart, item.duration)

        const hasOverlap = (plan.activities || []).some(existingActivity => {
          if (!existingActivity.startTime) return false

          const existingStart = new Date(existingActivity.startTime)
          const existingEnd = addHours(existingStart, existingActivity.duration)

          return (
            isSameDay(existingStart, newActivityStart) &&
            (
              (isAfter(newActivityStart, existingStart) && isBefore(newActivityStart, existingEnd)) ||
              (isAfter(newActivityEnd, existingStart) && isBefore(newActivityEnd, existingEnd)) ||
              (isBefore(newActivityStart, existingStart) && isAfter(newActivityEnd, existingEnd)) ||
              isEqual(newActivityStart, existingStart)
            )
          )
        })

        if (hasOverlap) {
          toast.error("Activity Overlap", {
            description: "This time slot overlaps with an existing activity",
          })
          return
        }

        onAddActivity(item, start)

        toast.success("Activity Added", {
          description: `${item.title} has been added to your itinerary on ${format(start, "MMMM do")} at ${format(start, "h:mm a")}.`,
          duration: 3000,
        })
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [day, hour, onAddActivity, plan.activities]
  )

  const cellActivities = (plan.activities || []).filter(activity => {
    if (!activity.startTime) return false

    const activityStart = new Date(activity.startTime)
    const activityEnd = addHours(activityStart, activity.duration)
    const cellStart = new Date(day)
    cellStart.setHours(hour, 0, 0, 0)
    const cellEnd = new Date(day)
    cellEnd.setHours(hour + 1, 0, 0, 0)

    return isWithinInterval(cellStart, { start: activityStart, end: activityEnd })
  })

  return (
    <>
      <div
        ref={drop as any}
        className={`h-16 border-t p-1 relative transition-colors ${isOver && canDrop ? "bg-primary/20" :
          isOver && !canDrop ? "bg-destructive/20" : ""
          }`}
      >
        {cellActivities.map(activity => {
          if (!activity.startTime) return null

          const activityStart = new Date(activity.startTime)
          const activityStartHour = activityStart.getHours()

          if (hour !== activityStartHour) return null

          const heightInCells = activity.duration
          const backgroundColor = activityColors.get(activity.id)

          return (
            <div
              key={activity.id}
              className="group absolute inset-x-1 rounded-md overflow-hidden"
              style={{
                top: 0,
                height: `${heightInCells * 64}px`,
                zIndex: 10,
                backgroundColor
              }}
            >
              <div className="relative h-full p-2 text-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 rounded-full p-0 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                  onClick={() => onRemoveActivity(activity.id)}
                >
                  <X className="h-3 w-3" />
                </Button>

                <div className="flex items-start gap-2">
                  <img
                    src={activity.image || "/placeholder.svg"}
                    alt={activity.title}
                    className="h-12 w-12 rounded object-cover flex-none"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                    <p className="text-xs text-white/90 truncate">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {activity.duration}h
                    </p>
                    {activity.description && (
                      <p className="text-xs text-white/75 line-clamp-2 mt-1">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="absolute bottom-0 left-0 right-0 h-8 rounded-none bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40 text-xs font-medium"
                  onClick={() => setShowDetailsForActivity(activity.id)}
                >
                  <Info className="h-3 w-3 mr-1.5" />
                  Show Details
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {showDetailsForActivity && (
        <ActivityDetailsPanel
          activity={plan.activities.find(a => a.id === showDetailsForActivity)!}
          onClose={() => setShowDetailsForActivity(null)}
        />
      )}
    </>
  )
}

