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
import { groupsApi } from "../services/groupsApi"

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
  const [plan, dispatch] = useReducer(planReducer, defaultPlan)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showGroupChats, setShowGroupChats] = useState(false)
  const [showCalendar, setShowCalendar] = useState(true)
  const [travelChatMessages, setTravelChatMessages] = useState<ChatMessage[]>([])
  const [groups, setGroups] = useState<{ id: string; name: string; plan: Plan }[]>([])
  const [currentGroup, setCurrentGroup] = useState<{ id: string; name: string; plan: Plan } | null>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  // Load groups on mount and set up real-time listeners
  useEffect(() => {
    const loadGroups = async () => {
      const fetchedGroups = await groupsApi.getGroups()
      setGroups(fetchedGroups)
    }
    loadGroups()
  }, []) // Only run once on mount

  // Set up real-time listener for current group
  useEffect(() => {
    const groupId = currentGroup?.id
    if (!groupId) return

    const unsubscribe = groupsApi.subscribeToGroup(groupId, (updatedGroup) => {
      setCurrentGroup(prev => {
        // Only update if the data has actually changed
        if (JSON.stringify(prev) === JSON.stringify(updatedGroup)) return prev
        return updatedGroup
      })
      setGroups(prevGroups => {
        const newGroups = prevGroups.map(g =>
          g.id === updatedGroup.id ? updatedGroup : g
        )
        // Only update if the data has actually changed
        if (JSON.stringify(prevGroups) === JSON.stringify(newGroups)) return prevGroups
        return newGroups
      })
    })

    return () => {
      unsubscribe()
    }
  }, [currentGroup?.id]) // Only re-run if the group ID changes

  const handleCreateGroup = useCallback(async (groupName: string) => {
    try {
      const newGroup = await groupsApi.createGroup(groupName)
      setGroups((prev) => [...prev, newGroup])
      setCurrentGroup(newGroup)
      setShowCalendar(true)
      setIsAIChatOpen(false)
      router.push(`/planner?group=${newGroup.id}`)
    } catch (error) {
      console.error("Error creating group:", error)
      toast.error("Failed to create group. Please try again.")
    }
  }, [router])

  // Handle group joining from URL
  useEffect(() => {
    const groupId = searchParams.get("group")
    const isAIChat = searchParams.get("chat") === "ai"

    if (groupId && !currentGroup) {
      const checkGroup = async () => {
        const group = await groupsApi.getGroup(groupId)
        if (group) {
          setCurrentGroup(group)
          setIsAIChatOpen(false)
          toast.success("Group Joined", {
            description: `You've joined the group: ${group.name}`,
          })
        } else {
          toast.error("Group Not Found", {
            description: "Please check the group ID and try again.",
          })
          setTimeout(() => {
            router.replace("/")
          }, 1500)
        }
      }
      checkGroup()
    } else if (isAIChat && !currentGroup) {
      setIsAIChatOpen(true)
    }
  }, [searchParams, router, currentGroup])

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
        // Get the activity to calculate cost reduction
        const activity = await groupsApi.getActivity(activityId)
        if (!activity) {
          toast.error("Activity not found")
          return
        }

        const updatedGroup = {
          ...currentGroup,
          plan: {
            ...currentGroup.plan,
            activityIds: currentGroup.plan.activityIds.filter(id => id !== activityId),
            activities: currentGroup.plan.activities.filter(a => a.id !== activityId),
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
    setShowGroupChats((prev) => !prev)
    setShowCalendar(false)
  }, [])

  const handleOpenCalendar = useCallback((groupId: string) => {
    setCurrentGroup(groups.find((g) => g.id === groupId) || null)
    setShowCalendar(true)
    setShowGroupChats(false)
  }, [groups])

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Toaster richColors position="top-center" />
        <Header
          plan={currentGroup?.plan || defaultPlan}
          onUpdateBudget={handleUpdateBudget}
          onHome={() => router.push("/")}
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
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            plan={currentGroup?.plan || defaultPlan}
            onToggleGroupChats={handleToggleGroupChats}
            onAddActivity={handleAddActivity}
            currentGroupId={currentGroup?.id || ""}
          />
          <div className="flex-1 overflow-hidden">
            {showGroupChats ? (
              <GroupChatsPage
                groups={groups}
                onBack={() => {
                  setShowGroupChats(false)
                  setShowCalendar(true)
                }}
                onOpenCalendar={handleOpenCalendar}
                onSelectGroup={(groupId) => {
                  setCurrentGroup(groups.find((g) => g.id === groupId) || null)
                  setShowCalendar(true)
                  setShowGroupChats(false)
                }}
              />
            ) : (
              <div className="flex-1 overflow-hidden">
                <Calendar
                  plan={currentGroup?.plan || defaultPlan}
                  onAddActivity={handleAddActivity}
                  onRemoveActivity={handleRemoveActivity}
                />
              </div>
            )}
          </div>
          {isChatOpen && (
            <ChatPanel
              plan={currentGroup?.plan || defaultPlan}
              isOpen={isChatOpen}
              onToggle={handleToggleChat}
              messages={travelChatMessages}
              setMessages={setTravelChatMessages}
            />
          )}
          <AIAssistantChat
            isOpen={isAIChatOpen}
            onClose={() => {
              setIsAIChatOpen(false)
              if (!currentGroup) {
                router.push("/")
              }
            }}
            onCreateGroup={(groupName) => {
              handleCreateGroup(groupName)
              setIsAIChatOpen(false)  // Close AI chat after group creation
            }}
          />
        </div>
      </div>
    </DndProvider>
  )
}

