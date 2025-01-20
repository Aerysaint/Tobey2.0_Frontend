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

interface Event {
  id: string;
  activityId: string;
  start: Date;
  end: Date;
}

const defaultPlan: Plan = {
  id: "1",
  title: "Manali Plan",
  budget: 420000,
  spent: 12800,
  activities: [
    {
      id: "1",
      title: "Ferris Wheel Experience",
      location: "City Center",
      description: "Enjoy breathtaking views of the city from 200 feet high",
      duration: 1,
      image: "/placeholder.svg?height=400&width=400",
      cost: 2000,
    },
    {
      id: "2",
      title: "Solang Valley Adventure",
      location: "Solang Valley",
      description: "Paragliding and zip-lining adventure",
      duration: 3,
      image: "/placeholder.svg?height=400&width=400",
      cost: 5000,
    },
    {
      id: "3",
      title: "Hadimba Temple Visit",
      location: "Old Manali",
      description: "Ancient temple surrounded by cedar forest",
      duration: 2,
      image: "/placeholder.svg?height=400&width=400",
      cost: 1000,
    },
    {
      id: "4",
      title: "Mall Road Shopping",
      location: "Mall Road",
      description: "Shopping and local cuisine experience",
      duration: 4,
      image: "/placeholder.svg?height=400&width=400",
      cost: 3000,
    },
  ],
  events: [],
  participants: [
    {
      id: "1",
      name: "Tejash Prasad",
      role: "agent",
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      name: "John Doe",
      role: "customer",
      avatar: "/placeholder.svg",
    },
  ],
}

type Action =
  | { type: "ADD_EVENT"; event: Event }
  | { type: "REMOVE_EVENT"; eventId: string }
  | { type: "UPDATE_SPENT"; amount: number }
  | { type: "UPDATE_BUDGET"; amount: number }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "REMOVE_ACTIVITY"; activityId: string }

function planReducer(state: Plan, action: Action): Plan {
  switch (action.type) {
    case "ADD_EVENT": {
      const newSpent = state.spent + (state.activities.find((a) => a.id === action.event.activityId)?.cost || 0)
      if (newSpent > state.budget) {
        alert("Warning: This activity will exceed your budget!")
        return state
      }
      return {
        ...state,
        events: [...state.events, action.event],
        spent: newSpent,
      }
    }
    case "REMOVE_EVENT": {
      const eventToRemove = state.events.find((e) => e.id === action.eventId)
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.eventId),
        spent:
          state.spent -
          (eventToRemove ? state.activities.find((a) => a.id === eventToRemove.activityId)?.cost || 0 : 0),
      }
    }
    case "UPDATE_SPENT":
      return { ...state, spent: action.amount }
    case "UPDATE_BUDGET":
      return { ...state, budget: action.amount }
    case "ADD_ACTIVITY":
      return { ...state, activities: [...state.activities, action.activity] }
    case "REMOVE_ACTIVITY":
      return { ...state, activities: state.activities.filter((a) => a.id !== action.activityId) }
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
  const [aiRecommendations, setAiRecommendations] = useState<Activity[]>([])
  const [travelChatMessages, setTravelChatMessages] = useState<ChatMessage[]>([])
  const [groups, setGroups] = useState<{ id: string; name: string; plan: Plan }[]>([])
  const [currentGroup, setCurrentGroup] = useState<string | null>(null)
  const [showGroupSelection, setShowGroupSelection] = useState(true)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get("chat") === "ai") {
      setIsAIChatOpen(true)
      setShowGroupSelection(false)
    }
  }, [searchParams])

  const handleAddEvent = useCallback(
    (event: Event) => {
      if (currentGroup) {
        setGroups((prevGroups) =>
          prevGroups.map((group) => {
            if (group.id === currentGroup) {
              return {
                ...group,
                plan: {
                  ...group.plan,
                  events: [...group.plan.events, event],
                  spent: group.plan.spent + (group.plan.activities.find((a) => a.id === event.activityId)?.cost || 0),
                },
              }
            }
            return group
          }),
        )
      }
    },
    [currentGroup],
  )

  const handleRemoveEvent = useCallback(
    (eventId: string) => {
      if (currentGroup) {
        setGroups((prevGroups) =>
          prevGroups.map((group) => {
            if (group.id === currentGroup) {
              const eventToRemove = group.plan.events.find((e) => e.id === eventId)
              return {
                ...group,
                plan: {
                  ...group.plan,
                  events: group.plan.events.filter((e) => e.id !== eventId),
                  spent:
                    group.plan.spent -
                    (eventToRemove
                      ? group.plan.activities.find((a) => a.id === eventToRemove.activityId)?.cost || 0
                      : 0),
                },
              }
            }
            return group
          }),
        )
      }
    },
    [currentGroup],
  )

  const handleUpdateBudget = useCallback(
    (amount: number) => {
      if (currentGroup) {
        setGroups((prevGroups) =>
          prevGroups.map((group) => {
            if (group.id === currentGroup) {
              return {
                ...group,
                plan: {
                  ...group.plan,
                  budget: amount,
                },
              }
            }
            return group
          }),
        )
      } else {
        dispatch({ type: "UPDATE_BUDGET", amount })
      }
    },
    [currentGroup, dispatch],
  )

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev)
  }, [])

  const handleAIRecommendation = useCallback((activities: Activity[]) => {
    setAiRecommendations((prev) => {
      const newRecommendations = activities.filter(
        (activity) => !prev.some((prevActivity) => prevActivity.id === activity.id),
      )
      return [...prev, ...newRecommendations]
    })
  }, [])

  const handleRemoveAIRecommendation = useCallback((activityId: string) => {
    setAiRecommendations((prev) => prev.filter((activity) => activity.id !== activityId))
  }, [])

  const handleAddActivity = useCallback(
    (activity: Activity) => {
      dispatch({ type: "ADD_ACTIVITY", activity })
      handleRemoveAIRecommendation(activity.id)
    },
    [dispatch, handleRemoveAIRecommendation],
  )

  const handleAIRequest = useCallback(
    (request: string) => {
      setTimeout(() => {
        const newActivity: Activity = {
          id: `ai-rec-${Date.now()}`,
          title: `AI Recommendation: ${request}`,
          location: "AI Suggested Location",
          description: `Based on your request: "${request}"`,
          duration: Math.floor(Math.random() * 4) + 1,
          image: "/placeholder.svg?height=400&width=400",
          cost: Math.floor(Math.random() * 5000) + 1000,
        }
        handleAIRecommendation([newActivity])
      }, 1000)
    },
    [handleAIRecommendation],
  )

  const handleToggleGroupChats = useCallback(() => {
    setShowGroupChats((prev) => !prev)
    setShowCalendar(false)
    setShowGroupSelection(false)
  }, [])

  const handleOpenCalendar = useCallback((groupId: string) => {
    setCurrentGroup(groupId)
    setShowCalendar(true)
    setShowGroupChats(false)
  }, [])

  const handleJoinGroup = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId)
      if (group) {
        setCurrentGroup(groupId)
        setShowGroupSelection(false)
        setShowCalendar(true)
      } else {
        alert("Group not found")
      }
    },
    [groups],
  )

  const handleCreateGroup = useCallback((groupName: string, activities: Activity[] = [], events: Event[] = []) => {
    const newGroup = {
      id: Date.now().toString(),
      name: groupName,
      plan: {
        ...defaultPlan,
        id: Date.now().toString(),
        title: groupName,
        activities: activities.length > 0 ? activities : defaultPlan.activities,
        events: events,
        spent: events.reduce(
          (total, event) => total + (activities.find((a) => a.id === event.activityId)?.cost || 0),
          0,
        ),
      },
    }
    setGroups((prev) => [...prev, newGroup])
    setCurrentGroup(newGroup.id)
    setShowGroupSelection(false)
    setShowCalendar(true)
    setIsAIChatOpen(false)

    // Update URL to reflect we're in planner mode
    router.push(`/planner?group=${newGroup.id}`)
  }, [router])

  const handleClearAllNodes = useCallback(() => {
    if (currentGroup) {
      setGroups((prevGroups) =>
        prevGroups.map((group) => {
          if (group.id === currentGroup) {
            return {
              ...group,
              plan: {
                ...group.plan,
                events: [],
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
        {!showGroupSelection && (
          <Header
            plan={currentGroup ? groups.find((g) => g.id === currentGroup)?.plan || defaultPlan : defaultPlan}
            onUpdateBudget={handleUpdateBudget}
            onHome={() => {
              setShowGroupSelection(true)
              setCurrentGroup(null)
            }}
            onShare={() => {
              if (currentGroup) {
                alert(`Share this group ID: ${currentGroup}`)
              } else {
                alert("Please join or create a group first")
              }
            }}
            onClearAllNodes={handleClearAllNodes}
          />
        )}
        <div className="flex flex-1 overflow-hidden">
          {showGroupSelection ? (
            <GroupSelection onJoinGroup={handleJoinGroup} onCreateGroup={handleCreateGroup} />
          ) : (
            <>
              <Sidebar
                plan={currentGroup ? groups.find((g) => g.id === currentGroup)?.plan || defaultPlan : defaultPlan}
                onToggleChat={handleToggleChat}
                onToggleGroupChats={handleToggleGroupChats}
                aiRecommendations={aiRecommendations}
                onAddActivity={handleAddActivity}
                onRemoveAIRecommendation={handleRemoveAIRecommendation}
                onAIRequest={handleAIRequest}
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
                ) : showCalendar && currentGroup ? (
                  <div className="flex-1 overflow-hidden">
                    <Calendar
                      plan={groups.find((g) => g.id === currentGroup)?.plan || defaultPlan}
                      onAddEvent={handleAddEvent}
                      onRemoveEvent={handleRemoveEvent}
                    />
                  </div>
                ) : null}
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
            </>
          )}
          <AIAssistantChat
            isOpen={isAIChatOpen}
            onClose={() => {
              setIsAIChatOpen(false)
              setShowGroupSelection(true)
              router.push("/", undefined, { shallow: true })
            }}
            onCreateGroup={handleCreateGroup}
          />
        </div>
      </div>
    </DndProvider>
  )
}

