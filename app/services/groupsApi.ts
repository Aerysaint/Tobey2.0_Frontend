import type { Plan, Activity } from "@/types"
import { database } from "@/lib/firebase"
import { ref, get, set, push, remove, onValue, off } from "firebase/database"

interface Group {
  id: string
  name: string
  plan: Plan
}

interface ScheduledActivity extends Activity {
  startTime?: string // Store as ISO string for Firebase
}

export const groupsApi = {
  // Group methods
  async getGroups(): Promise<Group[]> {
    const groupsRef = ref(database, 'groups')
    const snapshot = await get(groupsRef)
    if (!snapshot.exists()) return []

    const groups: Group[] = []
    snapshot.forEach((childSnapshot) => {
      groups.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      })
    })
    return groups
  },

  async getGroup(id: string): Promise<Group | null> {
    try {
      const groupRef = ref(database, `groups/${id}`)
      const snapshot = await get(groupRef)
      if (!snapshot.exists()) return null
      return {
        id: snapshot.key!,
        ...snapshot.val()
      }
    } catch (error) {
      console.error("Error fetching group:", error)
      return null
    }
  },

  async createGroup(groupName: string): Promise<Group> {
    const groupsRef = ref(database, 'groups')
    const newGroupRef = push(groupsRef)
    const newGroup = {
      id: newGroupRef.key!,
      name: groupName,
      plan: {
        id: newGroupRef.key!,
        title: groupName,
        budget: 0,
        spent: 0,
        activityIds: [],
        activities: [],
        participants: [],
      },
    }

    await set(newGroupRef, newGroup)
    return newGroup
  },

  async updateGroup(group: Group): Promise<Group> {
    // Convert Date objects to ISO strings for Firebase storage
    const processedGroup = {
      ...group,
      plan: {
        ...group.plan,
        activities: group.plan.activities?.map(activity => ({
          ...activity,
          startTime: activity.startTime ? new Date(activity.startTime).toISOString() : undefined
        }))
      }
    }
    const groupRef = ref(database, `groups/${group.id}`)
    await set(groupRef, processedGroup)
    return group // Return original group with Date objects
  },

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    const activitiesRef = ref(database, 'activities')
    const snapshot = await get(activitiesRef)
    if (!snapshot.exists()) return []

    const activities: Activity[] = []
    snapshot.forEach((childSnapshot) => {
      activities.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      })
    })
    return activities
  },

  async getActivity(id: string): Promise<Activity | null> {
    try {
      const activityRef = ref(database, `activities/${id}`)
      const snapshot = await get(activityRef)
      if (!snapshot.exists()) return null
      return {
        id: snapshot.key!,
        ...snapshot.val()
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
      return null
    }
  },

  async createActivity(activity: Omit<Activity, "id">): Promise<Activity> {
    const activitiesRef = ref(database, 'activities')
    const newActivityRef = push(activitiesRef)
    const newActivity = {
      ...activity,
      id: newActivityRef.key!,
    }

    await set(newActivityRef, newActivity)
    return newActivity
  },

  async addActivityToGroup(groupId: string, activity: Activity): Promise<Group> {
    const group = await this.getGroup(groupId)
    if (!group) throw new Error("Group not found")

    // First, create or get the activity
    let existingActivity = await this.getActivity(activity.id)
    if (!existingActivity) {
      existingActivity = await this.createActivity(activity)
    }

    // Then update the group with the activity ID
    const updatedGroup = {
      ...group,
      plan: {
        ...group.plan,
        activityIds: [...group.plan.activityIds, existingActivity.id],
      },
    }

    return this.updateGroup(updatedGroup)
  },

  async removeActivityFromGroup(groupId: string, activityId: string): Promise<Group> {
    const group = await this.getGroup(groupId)
    if (!group) throw new Error("Group not found")

    const updatedGroup = {
      ...group,
      plan: {
        ...group.plan,
        activityIds: group.plan.activityIds.filter(id => id !== activityId),
      },
    }

    return this.updateGroup(updatedGroup)
  },

  async searchActivities(query: string, groupId: string): Promise<Activity[]> {
    const [group, allActivities] = await Promise.all([
      this.getGroup(groupId),
      this.getActivities(),
    ])

    if (!group) return []

    // Get activities that belong to the group
    const groupActivities = allActivities.filter(activity =>
      group.plan.activityIds.includes(activity.id)
    )

    // Search through the group's activities
    const searchTerm = query.toLowerCase()
    return groupActivities.filter(
      activity =>
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.location.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm)
    )
  },

  // Real-time subscription methods
  subscribeToGroup(groupId: string, onUpdate: (group: Group) => void): () => void {
    const groupRef = ref(database, `groups/${groupId}`)

    // Set up real-time listener
    onValue(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const groupData = snapshot.val()
        const group: Group = {
          id: snapshot.key!,
          ...groupData,
          plan: {
            ...groupData.plan,
            // Convert ISO strings back to Date objects for activities
            activities: groupData.plan.activities?.map((activity: ScheduledActivity) => ({
              ...activity,
              startTime: activity.startTime ? new Date(activity.startTime) : undefined
            }))
          }
        }
        onUpdate(group)
      }
    })

    // Return cleanup function
    return () => off(groupRef)
  },

  subscribeToActivities(callback: (activities: Activity[]) => void): () => void {
    const activitiesRef = ref(database, 'activities')
    onValue(activitiesRef, (snapshot) => {
      const activities: Activity[] = []
      snapshot.forEach((childSnapshot) => {
        activities.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        })
      })
      callback(activities)
    })

    // Return unsubscribe function
    return () => off(activitiesRef)
  }
} 