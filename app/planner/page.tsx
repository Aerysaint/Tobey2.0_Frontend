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
  participants: [],
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
  const [currentGroup, setCurrentGroup] = useState<string | null>(null)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  // Load groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      const fetchedGroups = await groupsApi.getGroups()
      setGroups(fetchedGroups)
    }
    loadGroups()
  }, [])

  const handleCreateGroup = useCallback(async (groupName: string) => {
    try {
      const newGroup = await groupsApi.createGroup(groupName)
      setGroups((prev) => [...prev, newGroup])
      setCurrentGroup(newGroup.id)
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
          setCurrentGroup(groupId)
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
      if (currentGroup) {
        const group = groups.find((g) => g.id === currentGroup)
        if (group) {
          const updatedGroup = {
            ...group,
            plan: {
              ...group.plan,
              budget: amount,
            },
          }
          try {
            await groupsApi.updateGroup(updatedGroup)
            setGroups((prevGroups) =>
              prevGroups.map((g) => (g.id === currentGroup ? updatedGroup : g))
            )
            toast.success("Budget Updated", {
              description: `Budget has been set to ₹${amount}`,
            })
          } catch (error) {
            console.error("Error updating budget:", error)
            toast.error("Failed to update budget")
          }
        }
      } else {
        dispatch({ type: "UPDATE_BUDGET", amount })
      }
    },
    [currentGroup, groups],
  )

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  const handleAddActivity = useCallback(
    async (activity: Activity, startTime?: Date) => {
      if (!currentGroup) {
        toast.error("No group selected")
        return
      }

      try {
        const group = groups.find((g) => g.id === currentGroup)
        if (!group) {
          toast.error("Group not found")
          return
        }

        const activityWithStartTime = startTime ? { ...activity, startTime } : activity
        const updatedGroup = {
          ...group,
          plan: {
            ...group.plan,
            activityIds: [...group.plan.activityIds, activity.id],
            spent: group.plan.spent + activity.cost
          }
        }

        const savedGroup = await groupsApi.updateGroup(updatedGroup)
        setGroups((prevGroups) =>
          prevGroups.map((g) => (g.id === currentGroup ? savedGroup : g))
        )
        toast.success("Activity added to calendar")
      } catch (error) {
        console.error("Error adding activity:", error)
        toast.error("Failed to add activity")
      }
    },
    [currentGroup, groups]
  )

  const handleRemoveActivity = useCallback(
    async (activityId: string) => {
      if (!currentGroup) {
        toast.error("No group selected")
        return
      }

      try {
        const group = groups.find((g) => g.id === currentGroup)
        if (!group) {
          toast.error("Group not found")
          return
        }

        // Get the activity to calculate cost reduction
        const activity = await groupsApi.getActivity(activityId)
        if (!activity) {
          toast.error("Activity not found")
          return
        }

        const updatedGroup = {
          ...group,
          plan: {
            ...group.plan,
            activityIds: group.plan.activityIds.filter(id => id !== activityId),
            spent: Math.max(0, group.plan.spent - activity.cost)
          }
        }

        const savedGroup = await groupsApi.updateGroup(updatedGroup)
        setGroups((prevGroups) =>
          prevGroups.map((g) => (g.id === currentGroup ? savedGroup : g))
        )
        toast.success("Activity removed from calendar")
      } catch (error) {
        console.error("Error removing activity:", error)
        toast.error("Failed to remove activity")
      }
    },
    [currentGroup, groups]
  )

  const handleToggleGroupChats = useCallback(() => {
    setShowGroupChats((prev) => !prev)
    setShowCalendar(false)
  }, [])

  const handleOpenCalendar = useCallback((groupId: string) => {
    setCurrentGroup(groupId)
    setShowCalendar(true)
    setShowGroupChats(false)
  }, [])

  const handleClearAllNodes = useCallback(() => {
    if (currentGroup) {
      setGroups((prevGroups) =>
        prevGroups.map((group) => {
          if (group.id === currentGroup) {
            return {
              ...group,
              plan: {
                ...group.plan,
                spent: 0,
              },
            }
          }
          return group
        }),
      )
    }
  }, [currentGroup])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen overflow-hidden">
        <Toaster richColors position="top-center" />
        <Header
          plan={currentGroup ? groups.find((g) => g.id === currentGroup)?.plan || defaultPlan : defaultPlan}
          onUpdateBudget={handleUpdateBudget}
          onHome={() => router.push("/")}
          onShare={() => {
            if (currentGroup) {
              const groupId = currentGroup
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
            plan={currentGroup ? groups.find((g) => g.id === currentGroup)?.plan || defaultPlan : defaultPlan}
            onToggleGroupChats={handleToggleGroupChats}
            onAddActivity={handleAddActivity}
            currentGroupId={currentGroup}
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
                  setCurrentGroup(groupId)
                  setShowCalendar(true)
                  setShowGroupChats(false)
                }}
              />
            ) : (
              <div className="flex-1 overflow-hidden">
                <Calendar
                  plan={groups.find((g) => g.id === currentGroup)?.plan || defaultPlan}
                  onAddActivity={handleAddActivity}
                  onRemoveActivity={handleRemoveActivity}
                />
              </div>
            )}
          </div>
          {isChatOpen && (
            <ChatPanel
              plan={currentGroup ? groups.find((g) => g.id === currentGroup)?.plan || defaultPlan : defaultPlan}
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

