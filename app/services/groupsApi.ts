import type { Plan, Activity } from "@/types"

const API_URL = "http://localhost:3001"

interface Group {
  id: string
  name: string
  plan: Plan
}

export const groupsApi = {
  // Group methods
  async getGroups(): Promise<Group[]> {
    const response = await fetch(`${API_URL}/groups`)
    return response.json()
  },

  async getGroup(id: string): Promise<Group | null> {
    try {
      const response = await fetch(`${API_URL}/groups/${id}`)
      if (!response.ok) {
        return null
      }
      return response.json()
    } catch (error) {
      console.error("Error fetching group:", error)
      return null
    }
  },

  async createGroup(groupName: string): Promise<Group> {
    const newGroup = {
      id: Date.now().toString(),
      name: groupName,
      plan: {
        id: Date.now().toString(),
        title: groupName,
        budget: 0,
        spent: 0,
        activityIds: [],
        participants: [],
      },
    }

    const response = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newGroup),
    })

    return response.json()
  },

  async updateGroup(group: Group): Promise<Group> {
    const response = await fetch(`${API_URL}/groups/${group.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(group),
    })

    return response.json()
  },

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    const response = await fetch(`${API_URL}/activities`)
    return response.json()
  },

  async getActivity(id: string): Promise<Activity | null> {
    try {
      const response = await fetch(`${API_URL}/activities/${id}`)
      if (!response.ok) {
        return null
      }
      return response.json()
    } catch (error) {
      console.error("Error fetching activity:", error)
      return null
    }
  },

  async createActivity(activity: Omit<Activity, "id">): Promise<Activity> {
    const newActivity = {
      ...activity,
      id: `activity-${Date.now()}`,
    }

    const response = await fetch(`${API_URL}/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newActivity),
    })

    return response.json()
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
} 