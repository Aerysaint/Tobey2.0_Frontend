import { X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Activity } from "@/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { db } from "../../lib/firebase" // Make sure this import exists
import { doc, onSnapshot } from "firebase/firestore"
import api from "@/lib/axios"  // Add this import at the top
import { toast } from "sonner"
import ReactMarkdown from 'react-markdown'

interface ActivityDetailsPanelProps {
  activity: Activity
  groupId: string // Added groupId prop
  onClose: () => void
}

export function ActivityDetailsPanel({ activity, groupId, onClose }: ActivityDetailsPanelProps) {
  console.log("ActivityDetailsPanel", activity, groupId)
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [llmDescription, setLlmDescription] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Subscribe to Firestore updates for LLM description
  useEffect(() => {
    if (!activity.fromDate && groupId && activity?.id) {
      const unsubscribe = onSnapshot(
        doc(db, "sessions", groupId, "activities", activity.id),
        (doc) => {
          setLlmDescription(doc.data()?.llmDescription || "")
        }
      )
      return () => unsubscribe()
    }
    else{
      const unsubscribe = onSnapshot(
        doc(db, "sessions", groupId, "itinerary", activity.itineraryId),
        (doc) => {
          setLlmDescription(doc.data()?.llmDescription || "")
        }
      )
      return () => unsubscribe()
    }
    return () => {}
  }, [activity?.id, groupId, activity?.fromDate])

  const handleGenerateDescription = async () => {
    try {
      setIsGenerating(true)
      await api.get(`/getLLMDescription`, {
        params: {
          activityid: activity.id ? activity.id : activity.itineraryId,
          groupid: groupId
        }
      })
    } catch (error) {
      console.error("Failed to generate description:", error)
      toast?.error("Failed to generate description")
    } finally {
      setIsGenerating(false)
    }
  }

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

              <Separator />
              {activity.fromDate && (
                <>
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
                  <Separator />
                </>
              )}
              {/* LLM Description - Now always shown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-muted-foreground">AI DESCRIPTION</h4>
                  <Button
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating}
                  >
                    {llmDescription ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 min-h-[100px]">
                  {isGenerating ? (
                    <p className="text-muted-foreground">Generating description...</p>
                  ) : llmDescription ? (
                    <ReactMarkdown 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
                        ol: ({children}) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-md font-bold mb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                        code: ({children}) => (
                          <code className="bg-muted-foreground/20 rounded px-1 py-0.5">{children}</code>
                        ),
                        pre: ({children}) => (
                          <pre className="bg-muted-foreground/20 rounded p-2 mb-2 overflow-x-auto">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {llmDescription}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">No AI description available yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
} 