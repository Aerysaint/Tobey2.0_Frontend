import type { Plan, Activity } from "@/types"
import { database } from "@/lib/firebase"
import { ref, get, set, push, remove, onValue, off, update } from "firebase/database"
import { DataSnapshot } from "firebase/database"
import { Group } from "@/types"

interface ScheduledActivity extends Omit<Activity, 'startTime'> {
  startTime?: string;
}

export const groupsApi = {
  // Group methods
  async getGroups(): Promise<Group[]> {
    const groupsRef = ref(database, 'groups')
    const snapshot = await get(groupsRef)
    if (!snapshot.exists()) return []

    const groups: Group[] = []
    snapshot.forEach((childSnapshot: DataSnapshot) => {
      groups.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      })
    })
    return groups
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const snapshot = await get(ref(database, `groups/${groupId}`))
    return snapshot.exists() ? snapshot.val() : null
  },

  async getUserGroups(userId: string): Promise<Group[]> {
    const snapshot = await get(ref(database, "groups"))
    const groups: Group[] = []

    snapshot.forEach((child) => {
      const group = child.val() as Group
      if (group.members && group.members[userId]) {
        groups.push(group)
      }
    })

    return groups.sort((a, b) => b.createdAt - a.createdAt)
  },

  async createGroup(name: string, userId: string, userDisplayName: string): Promise<string> {
    const groupRef = push(ref(database, "groups"))
    const groupId = groupRef.key!

    const group: Group = {
      id: groupId,
      name,
      members: {
        [userId]: {
          joinedAt: Date.now(),
          displayName: userDisplayName
        }
      },
      createdBy: userId,
      createdAt: Date.now(),
      plan: {
        id: groupId,
        title: name,
        budget: 0,
        spent: 0,
        activityIds: [],
        activities: [],
        participants: []
      }
    }

    await set(groupRef, group)
    return groupId
  },

  async updateGroup(group: Group): Promise<Group> {
    // Convert Date objects to ISO strings for Firebase storage
    const processedGroup = {
      ...group,
      plan: {
        ...group.plan,
        activities: group.plan.activities?.map((activity: Activity) => ({
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
    const snapshot = await get(ref(database, 'activities'))
    const activities: Activity[] = []
    snapshot.forEach((activity: DataSnapshot) => {
      activities.push(activity.val())
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
        activityIds: group.plan.activityIds.filter((id: string) => id !== activityId),
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
    onValue(activitiesRef, (snapshot: DataSnapshot) => {
      const activities: Activity[] = []
      snapshot.forEach((childSnapshot: DataSnapshot) => {
        activities.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        })
      })
      callback(activities)
    })

    // Return unsubscribe function
    return () => off(activitiesRef)
  },

  async joinGroup(groupId: string, userId: string, userDisplayName: string): Promise<void> {
    // Add user to group
    const groupRef = ref(database, `groups/${groupId}/members/${userId}`)
    const groupSnapshot = await get(ref(database, `groups/${groupId}`))

    if (!groupSnapshot.exists()) {
      throw new Error("Group not found")
    }

    const groupData = groupSnapshot.val()

    // Add user to group members
    await set(groupRef, {
      joinedAt: Date.now(),
      displayName: userDisplayName,
      role: 'member'
    })

    // Add group to user's groups
    const userRef = ref(database, `users/${userId}/groups/${groupId}`)
    await set(userRef, {
      joinedAt: Date.now(),
      role: 'member',
      name: groupData.name
    })
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Remove user from group members
    const groupRef = ref(database, `groups/${groupId}/members/${userId}`)
    await set(groupRef, null)

    // Remove group from user's groups
    const userRef = ref(database, `users/${userId}/groups/${groupId}`)
    await set(userRef, null)
  },

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    // Check both group members and user's groups for consistency
    const [groupSnapshot, userSnapshot] = await Promise.all([
      get(ref(database, `groups/${groupId}/members/${userId}`)),
      get(ref(database, `users/${userId}/groups/${groupId}`))
    ])

    // User is considered a member if they exist in both places
    return groupSnapshot.exists() && userSnapshot.exists()
  },

  async getActivityById(activityId: string): Promise<Activity | null> {
    const snapshot = await get(ref(database, `activities/${activityId}`))
    return snapshot.exists() ? snapshot.val() : null
  }
} 