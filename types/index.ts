export interface Activity {
  id: string
  title: string
  location: string
  description: string
  duration: number
  image: string
  cost: number
}

export interface ChatMessage {
  id: string
  content: string
  sender: {
    id: string
    name: string
    role: 'agent' | 'customer' | 'ai'
    avatar?: string
  }
  timestamp: Date
}

export interface CalendarEvent {
  id: string
  activityId: string
  start: Date
  end: Date
}

export interface Plan {
  id: string
  title: string
  budget: number
  spent: number
  activities: Activity[]
  events: CalendarEvent[]
  participants: {
    id: string
    name: string
    role: 'agent' | 'customer'
    avatar?: string
  }[]
}

