export interface Activity {
  id: string
  title: string
  description: string
  location: string
  duration: number
  cost: number
  image: string
  startTime: Date
}

export interface Plan {
  id: string
  title: string
  budget: number
  spent: number
  activityIds: string[]
  activities: Activity[]
  participants: string[]
}

export interface ChatMessage {
  role: string
  name: string
  content: string
}

export interface UserData {
  uid: string
  displayName: string
  email: string
  photoURL: string
  groups: {
    [groupId: string]: {
      joinedAt: number
      role: 'member' | 'admin'
    }
  }
  createdAt: number
  lastLoginAt: number
}

export interface Group {
  id: string
  name: string
  plan?: any
  members: { [uid: string]: { joinedAt: number; displayName: string } }
  createdBy: string
  createdAt: number
}