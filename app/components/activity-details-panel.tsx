import { X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Activity } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface ActivityDetailsPanelProps {
  activity: Activity
  onClose: () => void
}

export function ActivityDetailsPanel({ activity, onClose }: ActivityDetailsPanelProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="border-l bg-background flex flex-col h-full fixed right-0 top-0 w-[800px] shadow-lg z-50 animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-muted/50">
          <div>
            <h3 className="text-2xl font-semibold">Explore {activity.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{activity.location}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-5 gap-6">
            {/* Left Column - Hero Image and Main Info */}
            <div className="col-span-3 p-6">
              {/* Hero Image */}
              <div className="rounded-lg overflow-hidden shadow-lg mb-6">
                <img
                  src={activity.image || "/placeholder.svg"}
                  alt={activity.title}
                  className="w-full h-[400px] object-cover"
                />
              </div>

              {/* Overview */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-3">Overview</h4>
                  <p className="text-muted-foreground leading-relaxed">{activity.description}</p>
                </div>

                <Separator />

                {/* Rating and Reviews */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-primary/10 rounded-full px-3 py-1">
                    <Star className="h-5 w-5 fill-primary text-primary mr-1.5" />
                    <span className="font-medium">4.7</span>
                  </div>
                  <span className="text-muted-foreground">(194254 Reviews)</span>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="col-span-2 border-l p-6 bg-muted/10 space-y-6">
              {/* Location */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">LOCATION</h4>
                <p className="font-medium">{activity.location}</p>
              </div>

              <Separator />

              {/* Duration */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">DURATION</h4>
                <p className="font-medium">{activity.duration} hours</p>
              </div>

              <Separator />

              {/* Cost */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">COST</h4>
                <p className="font-medium">₹{activity.cost.toLocaleString()}</p>
              </div>

              {activity.startTime && (
                <>
                  <Separator />
                  {/* Date and Time */}
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">DATE & TIME</h4>
                    <p className="font-medium">
                      {new Date(activity.startTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {new Date(activity.startTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })} - {new Date(new Date(activity.startTime).getTime() + activity.duration * 60 * 60 * 1000).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </p>
                  </div>
                </>
              )}

              {/* Website Button */}
              <Button className="w-full mt-8" size="lg">
                Visit Website
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
} 