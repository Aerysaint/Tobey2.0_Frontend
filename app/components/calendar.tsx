"use client"

import { useDrop, useDrag } from "react-dnd"
import { addDays, format, startOfWeek, isSameDay, addHours, subDays, isWithinInterval, isAfter, isBefore, isEqual, differenceInMinutes, startOfDay, addDays as addDaysDateFns } from "date-fns"
import type { Activity, Plan } from "@/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, ChevronLeft, ChevronRight, CalendarIcon, Clock, Info, MapPin } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ActivityDetailsPanel } from "./activity-details-panel"
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import api from '@/lib/axios';
import { format as formatDate, addMinutes } from "date-fns";

interface CalendarProps {
  plan: Plan
  groupId: string
  activities: Activity[]
  getDayBudget: (day: Date) => number
}

export function Calendar({ plan, groupId, activities, getDayBudget }: CalendarProps) {
  const [startDate, setStartDate] = useState(startOfWeek(new Date()))
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const quarterHours = [0, 15, 30, 45] // 15-minute intervals
  const colorMapRef = useRef(new Map<string, string>())

  // Subscribe to Firestore changes
  useEffect(() => {
    if (!groupId) return;

    const itineraryRef = collection(db, 'sessions', groupId, 'itinerary');
    const unsubscribe = onSnapshot(query(itineraryRef), (snapshot) => {
      const updatedActivities: Activity[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        updatedActivities.push({
          id: data.id, // Original activity ID
          itineraryId: doc.id, // Firestore document ID
          name: data.Name,
          cityName: data.CityName,
          price: data.Price,
          currency: data.Currency,
          imageList: data.ImageList || [],
          fromDate: data.FromDate,
          toDate: data.ToDate
        });
      });

      //setActivities(updatedActivities);
    });

    return () => unsubscribe();
  }, [groupId]);

  // Update color map
  useEffect(() => {
    activities.forEach(activity => {
      if (!colorMapRef.current.has(activity.id)) {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20 + 60);
        const lightness = Math.floor(Math.random() * 15 + 20);
        colorMapRef.current.set(activity.id, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
      }
    });
  }, [activities]);

  const handleAddActivity = async (activity: Activity, startTime: Date) => {
    try {
      const fromDate = formatDate(startTime, "yyyy-MM-dd'T'HH:mm:ss");
      const toDate = formatDate(addMinutes(startTime, 30), "yyyy-MM-dd'T'HH:mm:ss");

      console.log(groupId);

      const response = await api.get('/addActivityToItinerary', {
        params: {
          groupid: groupId,
          activityid: activity.id,
          fromdate: fromDate,
          todate: toDate
        }
      });

      if (response.data === -1) {
          toast.error("Failed to add activity to itinerary", {
          description: "The activity may overlap with existing activities"
        });
        return;
      }

      toast.success("Activity added to calendar");
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Failed to add activity to calendar");
    }
  };

  const handleRemoveActivity = async (activityId: string) => {
    try {
      console.log("activities", activities);
      console.log("activityId", activityId);
      const activity = activities.find(a => a.itineraryId === activityId);
      if (!activity) {
        throw new Error("Activity not found");
      }

      console.log("groupId", groupId);
      console.log("activityId", activity.itineraryId);
      await api.get('/removeActivityFromItinerary', {
        params: {
          groupid: groupId,
          activityid: activity.itineraryId
        }
      });

      toast.success("Activity removed from calendar");
    } catch (error) {
      console.error("Error removing activity:", error);
      toast.error("Failed to remove activity from calendar");
    }
  };

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
            {/* Time labels - now showing quarter hours */}
            <div className="sticky left-0 z-40 bg-background">
              {hours.map((hour) =>
                quarterHours.map((minute) => (
                  <div
                    key={`${hour}:${minute}`}
                    className="h-4 pr-2 text-right text-sm text-muted-foreground"
                  >
                    {minute === 0 && `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`}
                  </div>
                ))
              )}
            </div>

            {/* Calendar grid */}
            {days.map((day) => (
              <div key={day.toISOString()}>
                {hours.map((hour) =>
                  quarterHours.map((minute) => (
                    <CalendarCell
                      key={`${day.toISOString()}-${hour}-${minute}`}
                      day={day}
                      hour={hour}
                      minute={minute}
                      activities={activities}
                      onAddActivity={handleAddActivity}
                      onRemoveActivity={handleRemoveActivity}
                      activityColors={colorMapRef.current}
                      groupId={groupId}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

interface DraggableActivityProps {
  activity: Activity
  backgroundColor: string
  onRemove: () => void
  visibleDuration: number
  isStartOfVisible: boolean
  onResize: (direction: 'top' | 'bottom', newDate: Date) => Promise<void>
}

function DraggableActivity({ 
  activity, 
  backgroundColor, 
  onRemove, 
  visibleDuration, 
  isStartOfVisible,
  onResize 
}: DraggableActivityProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "CALENDAR_ACTIVITY",
    item: { ...activity, source: 'calendar' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isResizing,
  }), [activity, isResizing])

  // Calculate if we should show full content based on visible duration
  // 4 cells (1 hour) is minimum for full content
  const showFullContent = visibleDuration >= 60;

  const handleResizeMouseDown = (direction: 'top' | 'bottom') => (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const startY = e.clientY;
    const cellHeight = 16; // Height of each 15-minute cell

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      const cellsDelta = Math.round(deltaY / cellHeight);
      
      const originalDate = new Date(direction === 'top' ? activity.fromDate : activity.toDate);
      const newDate = addMinutes(originalDate, cellsDelta * 15);
      
      // Update the visual position immediately
      const resizeHandle = moveEvent.target as HTMLElement;
      resizeHandle.style.cursor = 'ns-resize';
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const deltaY = upEvent.clientY - startY;
      const cellsDelta = Math.round(deltaY / cellHeight);
      const originalDate = new Date(direction === 'top' ? activity.fromDate : activity.toDate);
      const newDate = addMinutes(originalDate, cellsDelta * 15);

      await onResize(direction, newDate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only show details if we're not dragging or resizing
    if (!isDragging && !isResizing) {
      e.stopPropagation();
      setShowDetails(true);
    }
  };

  return (
    <>
      <div
        ref={drag as any}
        className={`group absolute inset-x-1 rounded-md overflow-hidden ${isDragging ? 'opacity-50' : ''}`}
        style={{
          top: 0,
          height: `${(visibleDuration / 15) * 16}px`,
          zIndex: 10,
          backgroundColor,
          cursor: 'move'
        }}
        onClick={handleClick}
      >
        {/* Resize handles */}
        <div
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize -translate-y-1 z-20"
          onMouseDown={handleResizeMouseDown('top')}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize translate-y-1 z-20"
          onMouseDown={handleResizeMouseDown('bottom')}
        />

        {/* Activity content */}
        {isStartOfVisible && (
          <div className="relative h-full p-2 text-white overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6 rounded-full p-0 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3 w-3" />
            </Button>

            {showFullContent ? (
              // Full content for activities 1 hour or longer
              <div className="flex items-start gap-2 h-full">
                <img
                  src={activity.imageList[0] || "/placeholder.svg"}
                  alt={activity.name}
                  className="h-12 w-12 rounded object-cover flex-none"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{activity.name}</h4>
                  <p className="text-xs text-white/90 truncate">
                    <MapPin className="inline h-3 w-3 mr-1" />
                    {activity.cityName}
                  </p>
                  <p className="text-xs text-white/75">
                    {activity.currency} {activity.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/75 mt-1">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {activity.fromDate && format(new Date(activity.fromDate), "h:mm a")} - 
                    {activity.toDate && format(new Date(activity.toDate), "h:mm a")}
                  </p>
                </div>
              </div>
            ) : (
              // Compact content for smaller activities
              <div className="flex items-center h-full">
                <h4 className="font-medium text-sm truncate">
                  {activity.name}
                </h4>
              </div>
            )}
          </div>
        )}
        {!isStartOfVisible && (
          <div className="h-full bg-black/20" />
        )}
      </div>

      {/* Activity Details Panel */}
      {showDetails && (
        <ActivityDetailsPanel
          activity={activity}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  )
}

interface CalendarCellProps {
  day: Date
  hour: number
  minute: number
  activities: Activity[]
  onAddActivity: (activity: Activity, startTime: Date) => Promise<void>
  onRemoveActivity: (activityId: string) => Promise<void>
  activityColors: Map<string, string>
  groupId: string
}

function CalendarCell({
  day,
  hour,
  minute,
  activities,
  onAddActivity,
  onRemoveActivity,
  activityColors,
  groupId,
}: CalendarCellProps) {
  const [showDetailsForActivity, setShowDetailsForActivity] = useState<string | null>(null)
  const lastToastTime = useRef<number>(0) // Track last toast time

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ["ACTIVITY", "CALENDAR_ACTIVITY"],
      canDrop: (item: Activity & { source?: string }) => {
        const originalDuration = item.fromDate && item.toDate 
          ? differenceInMinutes(new Date(item.toDate), new Date(item.fromDate))
          : 30;

        const newActivityStart = new Date(day)
        newActivityStart.setHours(hour, minute, 0, 0)
        
        // Allow activities to span into next day
        const newActivityEnd = addMinutes(newActivityStart, originalDuration)

        // Check overlaps only with activities on the same day as the start time
        return !activities.some(existingActivity => {
          if (!existingActivity.fromDate) return false
          if (item.source === 'calendar' && existingActivity.itineraryId === item.itineraryId) return false

          const existingStart = new Date(existingActivity.fromDate)
          const existingEnd = new Date(existingActivity.toDate)

          // Only check overlaps on the day where the activity starts
          return isSameDay(existingStart, newActivityStart) &&
            (isAfter(newActivityStart, existingStart) && isBefore(newActivityStart, existingEnd) ||
            isAfter(newActivityEnd, existingStart) && isBefore(newActivityEnd, existingEnd) ||
            isBefore(newActivityStart, existingStart) && isAfter(newActivityEnd, existingEnd) ||
            isEqual(newActivityStart, existingStart))
        });
      },
      drop: async (item: Activity & { source?: string }) => {
        const now = Date.now();
        const originalDuration = item.fromDate && item.toDate 
          ? differenceInMinutes(new Date(item.toDate), new Date(item.fromDate))
          : 30;

        const start = new Date(day)
        start.setHours(hour, minute, 0, 0)
        const end = addMinutes(start, originalDuration) // This can be on next day

        // Check overlaps (same as canDrop but with toast)
        const hasOverlap = activities.some(existingActivity => {
          if (!existingActivity.fromDate) return false
          if (item.source === 'calendar' && existingActivity.itineraryId === item.itineraryId) return false

          const existingStart = new Date(existingActivity.fromDate)
          const existingEnd = new Date(existingActivity.toDate)

          // Only check overlaps on the day where the activity starts
          return isSameDay(existingStart, start) &&
            (isAfter(start, existingStart) && isBefore(start, existingEnd) ||
            isAfter(end, existingStart) && isBefore(end, existingEnd) ||
            isBefore(start, existingStart) && isAfter(end, existingEnd) ||
            isEqual(start, existingStart))
        })

        if (hasOverlap) {
          if (now - lastToastTime.current > 2000) {
            toast.warning("Time slot occupied", {
              description: "This time slot overlaps with an existing activity",
            })
            lastToastTime.current = now
          }
          return
        }

        // Proceed with drop
        try {
          if (item.source === 'calendar') {
            await api.get('/updateActivityInItinerary', {
              params: {
                groupid: groupId,
                activityid: item.itineraryId,
                fromdate: formatDate(start, "yyyy-MM-dd'T'HH:mm:ss"),
                todate: formatDate(end, "yyyy-MM-dd'T'HH:mm:ss")
              }
            });
          } else {
            await onAddActivity(item, start)
          }
          toast.success("Activity updated successfully")
        } catch (error) {
          console.error("Error updating activity:", error)
          toast.error("Failed to update activity")
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [day, hour, minute, activities, groupId, onAddActivity]
  )

  const cellActivities = activities.filter(activity => {
    if (!activity.fromDate || !activity.toDate) return false

    const activityStart = new Date(activity.fromDate)
    const activityEnd = new Date(activity.toDate)
    const cellTime = new Date(day)
    cellTime.setHours(hour, minute, 0, 0)
    
    // Check if activity spans into this day
    const dayStart = startOfDay(day)
    const dayEnd = addDaysDateFns(dayStart, 1)
    
    return isWithinInterval(cellTime, { start: activityStart, end: activityEnd }) ||
           isWithinInterval(activityStart, { start: dayStart, end: dayEnd }) ||
           isWithinInterval(activityEnd, { start: dayStart, end: dayEnd })
  })

  const handleResize = async (activity: Activity, direction: 'top' | 'bottom', newDate: Date) => {
    try {
      const fromDate = direction === 'top' ? newDate : new Date(activity.fromDate);
      const toDate = direction === 'bottom' ? newDate : new Date(activity.toDate);

      // Validate the new times
      if (fromDate >= toDate) {
        toast.error("Invalid time range");
        return;
      }

      // Check for overlaps
      const hasOverlap = activities.some(existingActivity => {
        if (!existingActivity.fromDate || existingActivity.itineraryId === activity.itineraryId) return false;

        const existingStart = new Date(existingActivity.fromDate);
        const existingEnd = new Date(existingActivity.toDate);

        return (
          (fromDate < existingEnd && toDate > existingStart) ||
          (fromDate < existingStart && toDate > existingEnd)
        );
      });

      if (hasOverlap) {
        toast.error("Cannot resize: overlaps with another activity");
        return;
      }

      await api.get('/updateActivityInItinerary', {
        params: {
          groupid: groupId,
          activityid: activity.itineraryId,
          fromdate: formatDate(fromDate, "yyyy-MM-dd'T'HH:mm:ss"),
          todate: formatDate(toDate, "yyyy-MM-dd'T'HH:mm:ss")
        }
      });

      toast.success("Activity updated successfully");
    } catch (error) {
      console.error("Error resizing activity:", error);
      toast.error("Failed to update activity");
    }
  };

  return (
    <>
      <div
        ref={drop as any}
        className={`h-4 border-t p-1 relative transition-colors ${
          isOver && canDrop ? "bg-primary/20" : isOver && !canDrop ? "bg-destructive/20" : ""
        } ${minute === 0 ? 'border-t-2' : 'border-t-[0.5px] border-muted'}`}
      >
        {cellActivities.map(activity => {
          if (!activity.fromDate || !activity.toDate) return null

          const activityStart = new Date(activity.fromDate)
          const activityEnd = new Date(activity.toDate)
          const dayStart = startOfDay(day)
          const dayEnd = addDaysDateFns(dayStart, 1)
          
          // Calculate visible portion for this day
          const visibleStart = activityStart < dayStart ? dayStart : activityStart
          const visibleEnd = activityEnd > dayEnd ? dayEnd : activityEnd
          const visibleDuration = differenceInMinutes(visibleEnd, visibleStart)
          
          // Calculate position if this is the start of the visible portion
          const isStartOfVisible = isEqual(visibleStart, activityStart) || 
            isBefore(visibleStart, activityEnd)

          // Only render if this cell matches the visible start time
          if (hour !== visibleStart.getHours() || minute !== visibleStart.getMinutes()) return null

          const backgroundColor = activityColors.get(activity.id)

          return (
            <DraggableActivity
              key={activity.itineraryId}
              activity={activity}
              backgroundColor={backgroundColor || ''}
              onRemove={() => activity.itineraryId && onRemoveActivity(activity.itineraryId)}
              visibleDuration={visibleDuration}
              isStartOfVisible={isStartOfVisible}
              onResize={(direction, newDate) => handleResize(activity, direction, newDate)}
            />
          )
        })}
      </div>

      {showDetailsForActivity && (
        <ActivityDetailsPanel
          activity={activities.find(a => a.id === showDetailsForActivity)!}
          onClose={() => setShowDetailsForActivity(null)}
        />
      )}
    </>
  )
}

