import { X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Activity } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface ActivityDetailsPanelProps {
  activity: Activity
  onClose: () => void
}

export function ActivityDetailsPanel({ activity, onClose }: ActivityDetailsPanelProps) {
  const [mainImageIndex, setMainImageIndex] = useState(0)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="border-l bg-background flex flex-col h-full fixed right-0 top-0 w-[800px] shadow-lg z-[100] animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-muted/50">
          <div>
            <h3 className="text-2xl font-semibold">Explore {activity.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{activity.cityName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-5 gap-6">
            {/* Left Column - Hero Image */}
            <div className="col-span-3 p-6">
              {/* Hero Image */}
              <div className="rounded-lg overflow-hidden shadow-lg mb-6">
                <img
                  src={activity.imageList[mainImageIndex] || "/placeholder.svg"}
                  alt={activity.name}
                  className="w-full h-[400px] object-cover"
                />
              </div>

              {/* Image Gallery if more than one image */}
              {activity.imageList.length > 1 && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {activity.imageList.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImageIndex(index)}
                      className={`relative rounded-lg overflow-hidden ${
                        mainImageIndex === index ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${activity.name} ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="col-span-2 border-l p-6 bg-muted/10 space-y-6">
              {/* Location */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">LOCATION</h4>
                <p className="font-medium">{activity.cityName}</p>
              </div>

              <Separator />

              {/* Cost */}
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">COST</h4>
                <p className="font-medium">
                  {activity.currency} {activity.price.toLocaleString()}
                </p>
              </div>

              {activity.fromDate && (
                <>
                  <Separator />
                  {/* Date and Time */}
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground">DATE</h4>
                    <p className="font-medium">
                      {new Date(activity.fromDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {activity.toDate && (
                      <p className="text-muted-foreground mt-1">
                        to {new Date(activity.toDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
} 