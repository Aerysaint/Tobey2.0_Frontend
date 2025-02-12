import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import api from '@/lib/axios'

interface Hotel {
  HotelCode: string
  HotelName: string
  Images: string[]
  Address?: string
  Map?: string
}

interface CityHotels {
  [cityName: string]: Hotel[]
}

interface HotelSelectionPopupProps {
  groupId: string
  onClose: () => void
}

export function HotelSelectionPopup({ groupId, onClose }: HotelSelectionPopupProps) {
  const [cities, setCities] = useState<CityHotels>({})
  const [selectedHotels, setSelectedHotels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get(`/getCities?groupid=${groupId}`)
        // Initialize selectedHotels with "-1" for each city
        const initialSelections = Object.keys(response.data).reduce((acc, city) => ({
          ...acc,
          [city]: "-1"
        }), {})
        setSelectedHotels(initialSelections)
        setCities(response.data)
      } catch (error) {
        console.error("Error fetching cities:", error)
        toast.error("Failed to fetch cities")
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [groupId])

  const handleSubmit = async () => {
    // Check if all cities have selected hotels
    const allCitiesSelected = Object.keys(cities).every(
      (city) => selectedHotels[city]
    )

    if (!allCitiesSelected) {
      toast.error("Please select hotels for all cities")
      return
    }

    try {
      console.log(selectedHotels)
      console.log({
        hotels: selectedHotels
      });
      await api.post("/regenerateItinerary", {
        hotels: selectedHotels,
        groupId: groupId
      })
      toast.success("Itinerary regeneration started")
      onClose()
    } catch (error) {
      console.error("Error regenerating itinerary:", error)
      toast.error("Failed to regenerate itinerary")
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Hotels for Each City</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-1">
          {loading ? (
            <div className="py-4 text-center">Loading cities...</div>
          ) : (
            <div className="space-y-4 py-4">
              {Object.entries(cities).map(([cityName, hotels]) => (
                <div key={cityName} className="space-y-2">
                  <h3 className="font-medium">{cityName}</h3>
                  <Select
                    value={selectedHotels[cityName]}
                    onValueChange={(value) =>
                      setSelectedHotels((prev) => ({
                        ...prev,
                        [cityName]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a hotel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Choose for me</SelectItem>
                      {hotels.map((hotel) => (
                        <SelectItem key={hotel.HotelCode} value={hotel.HotelCode}>
                          {hotel.HotelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 