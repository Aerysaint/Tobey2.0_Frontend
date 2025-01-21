"use client"

import { useDrop } from "react-dnd"
import { addDays, format, startOfWeek, isSameDay, addHours, subDays, isWithinInterval, isAfter, isBefore, isEqual } from "date-fns"
import type { Activity, Plan } from "@/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CalendarProps {
  plan: Plan
  onAddActivity: (activity: Activity, startTime: Date) => void
  onRemoveActivity: (activityId: string) => void
}

export function Calendar({ plan, onAddActivity, onRemoveActivity }: CalendarProps) {
  const [startDate, setStartDate] = useState(startOfWeek(new Date()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)

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
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="relative">
          <div className="sticky top-0 z-10 bg-background">
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
          </div>
          <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-4">
            {/* Time labels */}
            <div className="sticky left-0 z-10 bg-background">
              {hours.map((hour) => (
                <div key={hour} className="h-16 pr-2 text-right text-sm text-muted-foreground">
                  {hour % 12 || 12} {hour < 12 ? "AM" : "PM"}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {days.map((day) => (
              <div key={day.toISOString()} className="relative">
                {hours.map((hour) => (
                  <CalendarCell
                    key={`${day.toISOString()}-${hour}`}
                    day={day}
                    hour={hour}
                    plan={plan}
                    onAddActivity={onAddActivity}
                    onRemoveActivity={onRemoveActivity}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function CalendarCell({
  day,
  hour,
  plan,
  onAddActivity,
  onRemoveActivity,
}: {
  day: Date
  hour: number
  plan: Plan
  onAddActivity: (activity: Activity, startTime: Date) => void
  onRemoveActivity: (activityId: string) => void
}) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "ACTIVITY",
      canDrop: (item: Activity) => {
        // Create the start time for the new activity
        const newActivityStart = new Date(day)
        newActivityStart.setHours(hour, 0, 0, 0)
        const newActivityEnd = addHours(newActivityStart, item.duration)

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
    <div
      ref={drop}
      className={`h-16 border-t p-1 relative transition-colors ${isOver && canDrop ? "bg-primary/20" :
        isOver && !canDrop ? "bg-destructive/20" : ""
        }`}
    >
      {cellActivities.map((activity) => {
        if (!activity.startTime) return null

        const activityStart = new Date(activity.startTime)
        const activityStartHour = activityStart.getHours()

        if (hour !== activityStartHour) return null

        const heightInCells = activity.duration

        return (
          <div
            key={activity.id}
            className="group absolute rounded-md bg-primary p-1 text-xs text-primary-foreground overflow-hidden"
            style={{
              top: 0,
              height: `${heightInCells * 64}px`,
              left: "4px",
              right: "4px",
              zIndex: 10
            }}
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{activity.title}</div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 hidden h-4 w-4 rounded-full p-0 group-hover:flex"
              onClick={() => onRemoveActivity(activity.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

