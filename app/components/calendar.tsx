"use client"

import { useDrop } from "react-dnd"
import { addDays, format, startOfWeek, isSameDay, addHours, subDays, isWithinInterval } from "date-fns"
import type { Activity, Plan, Event } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CalendarProps {
  plan: Plan
  onAddEvent: (event: Event) => void
  onRemoveEvent: (eventId: string) => void
}

export function Calendar({ plan, onAddEvent, onRemoveEvent }: CalendarProps) {
  const [startDate, setStartDate] = useState(startOfWeek(new Date()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getDayBudget = (day: Date) => {
    return plan.events
      .filter((event) => isSameDay(new Date(event.start), day))
      .reduce((total, event) => {
        const activity = plan.activities.find((a) => a.id === event.activityId)
        return total + (activity?.cost || 0)
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
                    onAddEvent={onAddEvent}
                    onRemoveEvent={onRemoveEvent}
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
  onAddEvent,
  onRemoveEvent,
}: {
  day: Date
  hour: number
  plan: Plan
  onAddEvent: (event: Event) => void
  onRemoveEvent: (eventId: string) => void
}) {
  const { toast } = useToast()

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "ACTIVITY",
      drop: (item: Activity) => {
        const start = new Date(day)
        start.setHours(hour)
        const end = addHours(start, item.duration)

        const newEvent: Event = {
          id: Math.random().toString(),
          activityId: item.id,
          start,
          end,
        }

        onAddEvent(newEvent)

        toast({
          title: "Activity Added",
          description: `${item.title} has been added to your itinerary on ${format(start, "MMMM do")} at ${format(start, "h:mm a")}.`,
          duration: 3000,
        })
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [day, hour, onAddEvent],
  )

  const cellEvents = plan.events.filter((event) => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    const cellStart = new Date(day).setHours(hour)
    const cellEnd = new Date(day).setHours(hour + 1)
    return (
      isWithinInterval(new Date(cellStart), { start: eventStart, end: eventEnd }) ||
      isWithinInterval(new Date(cellEnd), { start: eventStart, end: eventEnd })
    )
  })

  return (
    <div ref={drop} className={`h-16 border-t p-1 transition-colors ${isOver ? "bg-primary/20" : ""}`}>
      {cellEvents.map((event) => {
        const activity = plan.activities.find((a) => a.id === event.activityId)
        if (!activity) return null

        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        const cellStart = new Date(day).setHours(hour)
        const cellEnd = new Date(day).setHours(hour + 1)

        const startOffset = Math.max(0, (eventStart.getTime() - cellStart) / (60 * 60 * 1000))
        const duration = Math.min(
          1,
          (eventEnd.getTime() - Math.max(eventStart.getTime(), cellStart)) / (60 * 60 * 1000),
        )

        return (
          <div
            key={event.id}
            className="group relative rounded-md bg-primary p-1 text-xs text-primary-foreground overflow-hidden"
            style={{
              position: "absolute",
              top: `${startOffset * 100}%`,
              height: `${duration * 100}%`,
              left: "4px",
              right: "4px",
            }}
          >
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{activity.title}</div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 hidden h-4 w-4 rounded-full p-0 group-hover:flex"
              onClick={() => onRemoveEvent(event.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

