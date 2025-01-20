export interface Activity {
  id: string
  title: string
  location: string
  description: string
  duration: number
  image: string
  cost: number
  type?: "user_added" | "ai_recommendation"
  startTime?: Date
}

export interface ChatMessage {
  id: string
  content: string
  sender: {
    id: string
    role: "ai" | "customer"
    name?: string
  }
  timestamp: Date
}

export interface Plan {
  id: string
  title: string
  budget: number
  spent: number
  activityIds: string[]
  activities?: Activity[]
  participants: string[]
}

