import { database } from "../firebaseConfig"
import { ref, set } from "firebase/database"
import data from "../db.json"

async function migrateData() {
  try {
    // Migrate activities
    console.log("Migrating activities...")
    const activitiesRef = ref(database, 'activities')
    await set(activitiesRef, data.activities.reduce((acc, activity) => {
      acc[activity.id] = activity
      return acc
    }, {} as Record<string, any>))
    console.log("Activities migrated successfully!")

    // Migrate groups
    console.log("Migrating groups...")
    const groupsRef = ref(database, 'groups')
    await set(groupsRef, data.groups.reduce((acc, group) => {
      acc[group.id] = group
      return acc
    }, {} as Record<string, any>))
    console.log("Groups migrated successfully!")

    console.log("Migration completed successfully!")
  } catch (error) {
    console.error("Error during migration:", error)
  }
}

// Run the migration
migrateData() 