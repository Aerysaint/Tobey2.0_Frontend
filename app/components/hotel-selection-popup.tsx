import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import api from '@/lib/axios'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check } from "lucide-react"
import { HotelDetailsPopup } from "./hotel-details-popup"
import { Skeleton } from "@/components/ui/skeleton"

interface Hotel {
  HotelCode: string
  HotelName: string
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
  const [activeCity, setActiveCity] = useState<string>("")
  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filterHotels = (hotels: Hotel[]) => {
    if (!searchQuery) return hotels;
    
    return hotels.filter(hotel => 
      hotel.HotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.Address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get(`/getCities?groupid=${groupId}`)
        const initialSelections = Object.keys(response.data).reduce((acc, city) => ({
          ...acc,
          [city]: "-1"
        }), {})
        setSelectedHotels(initialSelections)
        setCities(response.data)
        if (Object.keys(response.data).length > 0) {
          setActiveCity(Object.keys(response.data)[0])
        }
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
    const allCitiesSelected = Object.keys(cities).every(
      (city) => selectedHotels[city]
    )

    if (!allCitiesSelected) {
      toast.error("Please select hotels for all cities")
      return
    }

    try {
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
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select Hotels for Each City</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-4 overflow-x-auto">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
              
              <div className="px-4 pt-4">
                <Skeleton className="w-full h-10 mb-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[125px] w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <Tabs value={activeCity} onValueChange={setActiveCity} className="w-full">
                <TabsList className="w-full justify-start mb-4 overflow-x-auto">
                  {Object.keys(cities).map((cityName) => (
                    <TabsTrigger key={cityName} value={cityName} className="min-w-fit">
                      {cityName}
                      {selectedHotels[cityName] !== "-1" && (
                        <Check className="ml-2 h-4 w-4 text-green-500" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(cities).map(([cityName, hotels]) => (
                  <TabsContent key={cityName} value={cityName} className="mt-0">
                    <div className="px-4 pt-4">
                      <input
                        type="text"
                        placeholder="Search hotels..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 border rounded-md mb-4"
                      />
                    </div>
                    <ScrollArea className="h-[50vh]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {/* "Choose for me" card */}
                        <Card 
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            selectedHotels[cityName] === "-1" ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedHotels(prev => ({
                            ...prev,
                            [cityName]: "-1"
                          }))}
                        >
                          <CardContent className="p-4">
                            <h3 className="text-xl font-semibold">Choose for me</h3>
                            <p className="text-muted-foreground mt-2">Let AI choose the best hotel</p>
                          </CardContent>
                        </Card>

                        {/* Filter hotels before mapping */}
                        {filterHotels(hotels).map((hotel) => (
                          <Card 
                            key={hotel.HotelCode}
                            className={`transition-all hover:shadow-lg ${
                              selectedHotels[cityName] === hotel.HotelCode ? 'ring-2 ring-primary' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <h3 className="text-lg font-medium">{hotel.HotelName}</h3>
                              {hotel.Address && (
                                <p className="text-sm text-muted-foreground mt-1">{hotel.Address}</p>
                              )}
                            </CardContent>
                            <CardFooter className="flex justify-between p-4 pt-0">
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedHotelForDetails(hotel.HotelCode)}
                              >
                                Show Details
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => setSelectedHotels(prev => ({
                                  ...prev,
                                  [cityName]: hotel.HotelCode
                                }))}
                              >
                                Select Hotel
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex justify-end space-x-2 mt-4 border-t pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedHotelForDetails && (
        <HotelDetailsPopup
          hotelCode={selectedHotelForDetails}
          groupId={groupId}
          onClose={() => setSelectedHotelForDetails(null)}
        />
      )}
    </>
  )
}