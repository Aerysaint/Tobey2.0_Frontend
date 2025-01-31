export interface Activity {
  id: string;          // Document ID from getAllActivities
  itineraryId?: string; // ID from firestore itinerary collection
  name: string;        // Previously title
  cityName: string;    // Previously location
  price: number;       // Previously cost
  currency: string;    // New field
  imageList: string[]; // New field replacing single image
  fromDate?: string;   // For calendar activities
  toDate?: string;     // For calendar activities
  llmDescription?: string;
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
  plan: Plan
  members: { [uid: string]: { joinedAt: number; displayName: string } }
  createdBy: string
  createdAt: number
}