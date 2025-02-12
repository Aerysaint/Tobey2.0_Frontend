"use client"

import { useReducer, useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Calendar } from "../components/calendar"
import { Sidebar } from "../components/sidebar"
import { Header } from "../components/header"
import type { Plan, Activity, ChatMessage } from "@/types"
import { AIAssistantChat } from "../components/ai-assistant-chat"
import { toast, Toaster } from "sonner"
import { Group } from "@/types"
import { GroupChatPanel } from "../components/group-chat-panel"
import { useAuth } from "@/app/contexts/auth-context"
import { Loader2 } from "lucide-react"
import api from '@/lib/axios'
import { doc, onSnapshot, collection, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addDays, startOfDay, isSameDay } from "date-fns"
import { ActivityDetailsPanel } from "../components/activity-details-panel"
import { Button } from "@/components/ui/button"
import { HotelSelectionPopup } from "../components/hotel-selection-popup"

const defaultPlan: Plan = {
  id: "default",
  title: "New Trip",
  budget: 0,
  spent: 0,
  activityIds: [],
  activities: [],
  participants: []
}

type Action =
  | { type: "UPDATE_SPENT"; amount: number }
  | { type: "UPDATE_BUDGET"; amount: number }
  | { type: "ADD_ACTIVITY_ID"; activityId: string }
  | { type: "REMOVE_ACTIVITY_ID"; activityId: string }

function planReducer(state: Plan, action: Action): Plan {
  switch (action.type) {
    case "UPDATE_SPENT":
      return { ...state, spent: action.amount }
    case "UPDATE_BUDGET":
      return { ...state, budget: action.amount }
    case "ADD_ACTIVITY_ID":
      return {
        ...state,
        activityIds: [...state.activityIds, action.activityId],
      }
    case "REMOVE_ACTIVITY_ID":
      return {
        ...state,
        activityIds: state.activityIds.filter(id => id !== action.activityId),
      }
    default:
      return state
  }
}

// Add travel video IDs - using YouTube's demo video
const travelVideoIds = [
  "M7lc1UVf-VE"  // YouTube official demo video
];

export default function PlannerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState<string>("")
  const [group, setGroup] = useState<Group | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [plan, dispatch] = useReducer(planReducer, defaultPlan)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showCalendar, setShowCalendar] = useState(true)
  const [travelChatMessages, setTravelChatMessages] = useState<ChatMessage[]>([])
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [budget, setBudget] = useState<number>(0)
  const [spent, setSpent] = useState<number>(0)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [videoId, setVideoId] = useState("");
  const [groupName, setGroupName] = useState<string>("New Trip")
  const [showHotelPopup, setShowHotelPopup] = useState(false)
  const [localActivities, setLocalActivities] = useState<Activity[]>([])
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false)

  // Check session and access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const sessionResponse = await api.get("/authenticateSession");
        if (!sessionResponse.data.session) {
          console.log("No valid session found, redirecting to home");
          router.replace("/home");
          return;
        }

        const groupId = searchParams.get("group");
        const isAIChat = searchParams.get("chat") === "ai";

        // For AI chat without group, set loading false immediately
        if (!groupId && isAIChat) {
          setIsLoading(false);
          return;
        }

        // Allow access without group ID if AI chat is requested
        if (!groupId && !isAIChat) {
          router.replace("/home");
          return;
        }

        if (groupId) {
          try {
            // Set up status listener
            const unsubscribe = onSnapshot(doc(db, 'sessions', groupId), (doc) => {
              if (doc.exists()) {
                const status = doc.data().status || "";
                setLoadingStatus(status);
                
                // Redirect to chat if status is 'Chatting'
                if (status === "Chatting") {
                  router.replace(`/chat?group=${groupId}`);
                  return;
                }
                
                // Only set loading to false when status is 'Done'
                setIsLoading(status !== "Done");
              }
            });

            const groupResponse = await api.get(`/getGroupName?groupId=${groupId}`);
            
            const groupData = {
              id: groupId,
              name: groupResponse.data.name
            };

            setGroup(groupData);
            setCurrentGroup(groupData);
            setGroupName(groupResponse.data.name);

            // Return cleanup function
            return () => unsubscribe();
          } catch (error) {
            console.error("Planner: Error checking group access:", error);
            toast.error("Failed to load group");
            router.replace("/home");
          }
        }
      } catch (error) {
        console.error("Error checking access:", error);
        toast.error("Failed to verify access");
        router.replace("/home");
      }
    };

    checkAccess();
  }, [router, searchParams]);

  // Handle AI chat from URL
  useEffect(() => {
    const isAIChat = searchParams.get("chat") === "ai";
    console.log("Planner: Checking AI chat state:", { isAIChat, isLoading });
    if (isAIChat) {
      console.log("Planner: Opening AI chat");
      setIsAIChatOpen(true);
    }
  }, [searchParams]);

  // Subscribe to budget changes in Firestore
  useEffect(() => {
    if (!currentGroup?.id) return;

    const groupDoc = doc(db, 'sessions', currentGroup.id);

    const unsubscribe = onSnapshot(groupDoc, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setBudget(data.budget || 0);
      } else {
        setBudget(0);
      }
    });

    return () => unsubscribe();
  }, [currentGroup?.id]);

  // Modify the activities subscription effect to respect optimistic updates
  useEffect(() => {
    if (!currentGroup?.id) return;

    const itineraryRef = collection(db, 'sessions', currentGroup.id, 'itinerary');

    const unsubscribe = onSnapshot(query(itineraryRef), (snapshot) => {
      // Skip updates if we're in the middle of an optimistic update
      if (isOptimisticUpdate) {
        setIsOptimisticUpdate(false);
        return;
      }

      const updatedActivities: Activity[] = [];
      let totalSpent = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const activity = {
          id: data.id,
          itineraryId: doc.id,
          name: data.Name,
          cityName: data.CityName,
          price: data.Price,
          currency: data.Currency,
          imageList: data.ImageList || [],
          fromDate: data.FromDate,
          toDate: data.ToDate
        };
        updatedActivities.push(activity);
        totalSpent += data.Price || 0;
      });

      setActivities(updatedActivities);
      setLocalActivities(updatedActivities);
      setSpent(totalSpent);
    });

    return () => unsubscribe();
  }, [currentGroup?.id, isOptimisticUpdate]);

  // Add function to handle optimistic updates
  const handleActivityUpdate = useCallback(async (updatedActivity: Activity) => {
    // Optimistically update local state
    setIsOptimisticUpdate(true);
    setLocalActivities(prevActivities => 
      prevActivities.map(activity => 
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    );

    // Send update to server
    try {
      await api.post(`/updateActivity`, {
        groupId: currentGroup?.id,
        activity: updatedActivity
      });
    } catch (error) {
      console.error("Failed to update activity:", error);
      // Revert optimistic update on error
      setLocalActivities(activities);
      toast.error("Failed to update activity");
    }
  }, [currentGroup?.id, activities]);

  // Calculate per day costs
  const getDayBudget = useCallback((day: Date) => {
    return activities.reduce((total, activity) => {
      if (!activity.fromDate) return total;
      const activityStart = new Date(activity.fromDate);
      return isSameDay(activityStart, day) ? total + (activity.price || 0) : total;
    }, 0);
  }, [activities]);

  const handleUpdateBudget = useCallback(
    async (amount: number) => {
      if (!currentGroup) {
        toast.error("No group selected");
        return;
      }

      try {
        await api.get('/updateBudget', {
          params: {
            groupid: currentGroup.id,
            budget: amount
          }
        });

        toast.success("Budget Updated", {
          description: `Budget has been set to ₹${amount}`,
        });
      } catch (error) {
        console.error("Error updating budget:", error);
        toast.error("Failed to update budget");
      }
    },
    [currentGroup]
  );

  const handleToggleGroupChats = useCallback(() => {
    setShowGroupChat((prev) => !prev)
  }, [])

  // Select random video on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * travelVideoIds.length);
    setVideoId(travelVideoIds[randomIndex]);
  }, []);

  // Add this function to handle regeneration
  const handleRegenerateItinerary = useCallback(async () => {
    if (!currentGroup?.id) {
      toast.error("No group selected");
      return;
    }
    setShowHotelPopup(true);
  }, [currentGroup]);

  // Modified loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xl font-medium">{loadingStatus}</p>
            <p className="text-muted-foreground">Watch this travel video while we create your perfect itinerary</p>
          </div>

          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
              title="Travel Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              onError={() => {
                // If current video fails, try the next one
                const currentIndex = travelVideoIds.indexOf(videoId);
                const nextIndex = (currentIndex + 1) % travelVideoIds.length;
                setVideoId(travelVideoIds[nextIndex]);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Toaster richColors position="top-center" />
        <Header
          title={groupName}
          budget={budget}
          spent={spent}
          onUpdateBudget={handleUpdateBudget}
          onHome={() => router.push("/home")}
          onShare={() => {
            if (currentGroup) {
              const groupId = currentGroup.id
              const shareableLink = `${window.location.origin}/planner?group=${groupId}`

              navigator.clipboard.writeText(groupId).then(() => {
                toast.success("Group ID Copied!", {
                  description: (
                    <div className="mt-2 flex flex-col gap-2 break-all text-sm">
                      <div>
                        <span className="font-medium">Group ID:</span> {groupId}
                      </div>
                      <div>
                        <span className="font-medium">Shareable Link:</span> {shareableLink}
                      </div>
                    </div>
                  ),
                  duration: 5000,
                })
              })
            } else {
              toast.error("No Group Selected", {
                description: "Please join or create a group first.",
              })
            }
          }}
          onToggleGroupChats={handleToggleGroupChats}
          onRegenerateItinerary={handleRegenerateItinerary}
        />
        <div className="flex flex-1 overflow-hidden">
          {(currentGroup || !searchParams.get("chat")) && (
            <>
              <Sidebar
                plan={currentGroup?.plan || defaultPlan}
                onToggleGroupChats={handleToggleGroupChats}
                currentGroupId={currentGroup?.id || ""}
              />
              <div className="flex-1 overflow-hidden">
                <Calendar
                  groupId={currentGroup?.id || ""}
                  activities={localActivities}
                  setActivities={setLocalActivities}
                  getDayBudget={getDayBudget}
                  onActivityUpdate={handleActivityUpdate}
                />
              </div>
            </>
          )}
          {showGroupChat && currentGroup && (
            <GroupChatPanel
              groupId={currentGroup.id}
              groupName={currentGroup.name}
              onClose={() => setShowGroupChat(false)}
            />
          )}
        </div>
        {selectedActivity && (
          <ActivityDetailsPanel
            activity={selectedActivity}
            groupId={currentGroup?.id || ""}
            onClose={() => setSelectedActivity(null)}
          />
        )}
        {showHotelPopup && currentGroup && (
          <HotelSelectionPopup
            groupId={currentGroup.id}
            onClose={() => setShowHotelPopup(false)}
          />
        )}
      </div>
    </DndProvider>
  )
}

