import { ref, set } from "firebase/database"
import { database } from "../lib/firebase"

const sampleActivities = {
  "paragliding": {
    id: "paragliding",
    title: "Paragliding Adventure",
    location: "Bir Billing",
    description: "Experience the thrill of flying with stunning mountain views",
    duration: 3,
    image: "/placeholder.svg",
    cost: 2500,
    type: "adventure"
  },
  "camping": {
    id: "camping",
    title: "Riverside Camping",
    location: "Kasol",
    description: "Camp under the stars by the Parvati River",
    duration: 12,
    image: "/placeholder.svg",
    cost: 1800,
    type: "outdoor"
  },
  "temple-visit": {
    id: "temple-visit",
    title: "Hidimba Temple Visit",
    location: "Old Manali",
    description: "Ancient wooden temple surrounded by cedar forest",
    duration: 2,
    image: "/placeholder.svg",
    cost: 100,
    type: "cultural"
  },
  "hot-springs": {
    id: "hot-springs",
    title: "Hot Springs Bath",
    location: "Vashisht",
    description: "Natural hot springs with therapeutic properties",
    duration: 3,
    image: "/placeholder.svg",
    cost: 50,
    type: "wellness"
  },
  "mall-road": {
    id: "mall-road",
    title: "Mall Road Shopping",
    location: "Mall Road",
    description: "Shop for local crafts and enjoy street food",
    duration: 4,
    image: "/placeholder.svg",
    cost: 1000,
    type: "shopping"
  },
  "monastery": {
    id: "monastery",
    title: "Monastery Tour",
    location: "Manali Gompa",
    description: "Explore Buddhist culture and architecture",
    duration: 2,
    image: "/placeholder.svg",
    cost: 200,
    type: "cultural"
  },
  "solang-valley": {
    id: "solang-valley",
    title: "Solang Valley Activities",
    location: "Solang Valley",
    description: "Skiing, zorbing, and cable car rides",
    duration: 6,
    image: "/placeholder.svg",
    cost: 3000,
    type: "adventure"
  },
  "cafe-hopping": {
    id: "cafe-hopping",
    title: "Cafe Hopping Tour",
    location: "Old Manali",
    description: "Visit trendy cafes with mountain views",
    duration: 4,
    image: "/placeholder.svg",
    cost: 1500,
    type: "food"
  }
}

async function seedActivities() {
  try {
    console.log("Starting to seed activities...")
    const activitiesRef = ref(database, 'activities')
    await set(activitiesRef, sampleActivities)
    console.log("Successfully seeded activities!")
    process.exit(0)
  } catch (error) {
    console.error("Error seeding activities:", error)
    process.exit(1)
  }
}

// Run the seeding
seedActivities() 