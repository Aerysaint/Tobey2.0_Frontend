"use client"

import { useReducer, useCallback, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Calendar } from "../components/calendar"
import { Sidebar } from "../components/sidebar"
import { GroupChatsPage } from "../components/group-chats-page"
import { ChatPanel } from "../components/chat-panel"
import { Header } from "../components/header"
import type { Plan, Activity, ChatMessage } from "@/types"
import { GroupSelection } from "../components/group-selection"
import { AIAssistantChat } from "../components/ai-assistant-chat"
import { toast, Toaster } from "sonner"
import { groupsApi, type Group } from "@/services/groupsApi"
import { GroupChatPanel } from "../components/group-chat-panel"
import { useAuth } from "@/app/contexts/auth-context"
import { Loader2 } from "lucide-react"

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

export default function PlannerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [group, setGroup] = useState<Group | null>(null)
  const [plan, dispatch] = useReducer(planReducer, defaultPlan)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showCalendar, setShowCalendar] = useState(true)
  const [travelChatMessages, setTravelChatMessages] = useState<ChatMessage[]>([])
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  // Check authentication and group access
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        router.replace("/")
        return
      }

      const groupId = searchParams.get("group")
      if (!groupId) {
        router.replace("/home")
        return
      }

      try {
        const groupData = await groupsApi.getGroup(groupId)
        if (!groupData) {
          toast.error("Group not found")
          router.replace("/home")
          return
        }

        // Check if user is a member
        if (!groupData.members || !groupData.members[user.uid]) {
          toast.error("You don't have access to this group")
          router.replace("/home")
          return
        }

        setGroup(groupData)
        setCurrentGroup(groupData)
      } catch (error) {
        console.error("Error checking group access:", error)
        toast.error("Failed to load group")
        router.replace("/home")
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, router, searchParams])

  // Handle AI chat from URL
  useEffect(() => {
    const isAIChat = searchParams.get("chat") === "ai"
    if (isAIChat && !currentGroup) {
      setIsAIChatOpen(true)
    }
  }, [searchParams, currentGroup])

  // Set up real-time listener for current group
  useEffect(() => {
    const groupId = currentGroup?.id
    if (!groupId) return

    const unsubscribe = groupsApi.subscribeToGroup(groupId, (updatedGroup) => {
      setCurrentGroup(prev => {
        if (JSON.stringify(prev) === JSON.stringify(updatedGroup)) return prev
        return updatedGroup
      })
    })

    return () => {
      unsubscribe()
    }
  }, [currentGroup?.id])

  const handleCreateGroup = useCallback(async (groupName: string) => {
    if (!user) {
      toast.error("Please sign in to create a group")
      return
    }

    try {
      const groupId = await groupsApi.createGroup(groupName, user.uid, user.displayName || "Anonymous")
      const group = await groupsApi.getGroup(groupId)
      if (group) {
        setCurrentGroup(group)
        toast.success("Group created successfully!")
      }
    } catch (error) {
      console.error("Error creating group:", error)
      toast.error("Failed to create group. Please try again.")
    }
  }, [user])

  const handleUpdateBudget = useCallback(
    async (amount: number) => {
      if (!currentGroup) {
        dispatch({ type: "UPDATE_BUDGET", amount })
        return
      }

      const updatedGroup = {
        ...currentGroup,
        plan: {
          ...currentGroup.plan,
          budget: amount,
        },
      }

      try {
        await groupsApi.updateGroup(updatedGroup)
        setCurrentGroup(updatedGroup)
        toast.success("Budget Updated", {
          description: `Budget has been set to ₹${amount}`,
        })
      } catch (error) {
        console.error("Error updating budget:", error)
        toast.error("Failed to update budget")
      }
    },
    [currentGroup, dispatch],
  )

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  const handleAddActivity = async (activity: Activity, startTime: Date) => {
    if (!currentGroup) return

    const existingActivity = await groupsApi.getActivity(activity.id)
    if (!existingActivity) {
      toast.error("Activity not found")
      return
    }

    const activityWithStartTime = { ...existingActivity, startTime }

    const updatedGroup = {
      ...currentGroup,
      plan: {
        ...currentGroup.plan,
        activityIds: [...(currentGroup.plan.activityIds || []), activity.id],
        activities: [...(currentGroup.plan.activities || []), activityWithStartTime],
        spent: (currentGroup.plan.spent || 0) + (existingActivity.cost || 0),
      },
    }

    try {
      await groupsApi.updateGroup(updatedGroup)
      setCurrentGroup(updatedGroup)
      toast.success("Activity added to calendar")
    } catch (error) {
      console.error("Error adding activity:", error)
      toast.error("Failed to add activity")
    }
  }

  const handleRemoveActivity = useCallback(
    async (activityId: string) => {
      if (!currentGroup) {
        toast.error("No group selected")
        return
      }

      try {
        const activity = await groupsApi.getActivity(activityId)
        if (!activity) {
          toast.error("Activity not found")
          return
        }

        const updatedGroup = {
          ...currentGroup,
          plan: {
            ...currentGroup.plan,
            activityIds: currentGroup.plan.activityIds.filter((id: string) => id !== activityId),
            activities: currentGroup.plan.activities.filter((a: Activity) => a.id !== activityId),
            spent: Math.max(0, currentGroup.plan.spent - (activity.cost || 0))
          }
        }

        await groupsApi.updateGroup(updatedGroup)
        setCurrentGroup(updatedGroup)
        toast.success("Activity removed from calendar")
      } catch (error) {
        console.error("Error removing activity:", error)
        toast.error("Failed to remove activity")
      }
    },
    [currentGroup]
  )

  const handleToggleGroupChats = useCallback(() => {
    setShowGroupChat((prev) => !prev)
  }, [])

  const handleOpenCalendar = useCallback((groupId: string) => {
    setShowCalendar(true)
    setShowGroupChat(false)
  }, [])

  const handleClearAllNodes = useCallback(async () => {
    if (!currentGroup) {
      toast.error("No group selected")
      return
    }

    try {
      const updatedGroup = {
        ...currentGroup,
        plan: {
          ...currentGroup.plan,
          activityIds: [],
          activities: [],
          spent: 0
        }
      }

      await groupsApi.updateGroup(updatedGroup)
      setCurrentGroup(updatedGroup)
      toast.success("All activities cleared", {
        description: "Your plan has been reset."
      })
    } catch (error) {
      console.error("Error clearing activities:", error)
      toast.error("Failed to clear activities")
    }
  }, [currentGroup])

  if (isLoading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Toaster richColors position="top-center" />
        <Header
          plan={currentGroup?.plan || defaultPlan}
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
              }).catch(() => {
                toast.error("Failed to Copy", {
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
          onClearAllNodes={handleClearAllNodes}
          onToggleGroupChats={handleToggleGroupChats}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            plan={currentGroup?.plan || defaultPlan}
            onToggleGroupChats={handleToggleGroupChats}
            onAddActivity={handleAddActivity}
            currentGroupId={currentGroup?.id || ""}
          />
          <div className="flex-1 overflow-hidden">
            <Calendar
              plan={currentGroup?.plan || defaultPlan}
              onAddActivity={handleAddActivity}
              onRemoveActivity={handleRemoveActivity}
            />
          </div>
          {showGroupChat && currentGroup && (
            <GroupChatPanel
              groupId={currentGroup.id}
              groupName={currentGroup.name}
              onClose={() => setShowGroupChat(false)}
            />
          )}
          <AIAssistantChat
            isOpen={isAIChatOpen}
            onClose={() => {
              setIsAIChatOpen(false)
              if (!currentGroup) {
                router.push("/home")
              }
            }}
            onCreateGroup={handleCreateGroup}
          />
        </div>
      </div>
    </DndProvider>
  )
}

