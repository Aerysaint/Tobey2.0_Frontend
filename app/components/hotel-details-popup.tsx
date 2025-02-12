import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import api from '@/lib/axios'
import Image from "next/image"
import { Star } from "lucide-react"

interface HotelDetails {
  HotelName: string
  Description: string
  HotelFacilities: string[]
  Attractions: Record<string, string>
  Images: string[]
  Address: string
  CountryName: string
  PhoneNumber: string
  Map: string
  HotelRating: number
  CityName: string
  CheckInTime: string
  CheckOutTime: string
}

interface HotelDetailsPopupProps {
  hotelCode: string
  groupId: string
  onClose: () => void
}

export function HotelDetailsPopup({ hotelCode, groupId, onClose }: HotelDetailsPopupProps) {
  const [details, setDetails] = useState<HotelDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const [aiDescription, setAiDescription] = useState<string>("")
  const [generatingDescription, setGeneratingDescription] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/getHotelDetails?hotelCode=${hotelCode}`)
        setDetails(response.data)
        console.log(response.data)
      } catch (error) {
        console.error("Error fetching hotel details:", error)
        toast.error("Failed to fetch hotel details")
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [hotelCode])

  const generateAIDescription = async () => {
    setGeneratingDescription(true)
    try {
      const response = await api.get(`/getHotelLLMDescription?hotelCode=${hotelCode}&groupId=${groupId}`)
      setAiDescription(response.data)
    } catch (error) {
      console.error("Error generating AI description:", error)
      toast.error("Failed to generate AI description")
    } finally {
      setGeneratingDescription(false)
    }
  }

  if (loading || !details) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="py-4 text-center">Loading hotel details...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {details.HotelName}
            {details.HotelRating && (
              <div className="flex">
                {[...Array(details.HotelRating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="ai-description">AI Description</TabsTrigger>
            {details.HotelFacilities?.length > 0 && (
              <TabsTrigger value="facilities">Facilities</TabsTrigger>
            )}
            {Object.keys(details.Attractions || {}).length > 0 && (
              <TabsTrigger value="attractions">Nearby Attractions</TabsTrigger>
            )}
            {details.Images?.length > 0 && (
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="h-[60vh]">
            <TabsContent value="details" className="mt-0">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {details.Description && (
                    <div dangerouslySetInnerHTML={{ __html: details.Description }} />
                  )}
                  <div className="space-y-2">
                    {details.Address && <p><strong>Address:</strong> {details.Address}</p>}
                    {details.CityName && <p><strong>City:</strong> {details.CityName}</p>}
                    {details.CountryName && <p><strong>Country:</strong> {details.CountryName}</p>}
                    {details.PhoneNumber && <p><strong>Phone:</strong> {details.PhoneNumber}</p>}
                    {details.CheckInTime && <p><strong>Check-in:</strong> {details.CheckInTime}</p>}
                    {details.CheckOutTime && <p><strong>Check-out:</strong> {details.CheckOutTime}</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-description" className="mt-0">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {!aiDescription ? (
                    <div className="text-center">
                      <Button 
                        onClick={generateAIDescription}
                        disabled={generatingDescription}
                      >
                        {generatingDescription ? "Generating..." : "Generate AI Description"}
                      </Button>
                    </div>
                  ) : (
                    <div className="prose">
                      <p>{aiDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="facilities" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <ul className="grid grid-cols-2 gap-2">
                    {details.HotelFacilities?.map((facility, index) => (
                      <li key={index} className="text-sm">{facility}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attractions" className="mt-0">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {Object.entries(details.Attractions || {}).map(([key, value]) => (
                    <div key={key}>
                      <h4 className="font-medium mb-2">{key}</h4>
                      <div dangerouslySetInnerHTML={{ __html: value }} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="mt-0">
              <div className="grid grid-cols-2 gap-4">
                {details.Images?.map((image, index) => (
                  <div key={index} className="relative aspect-video">
                    <Image
                      src={image}
                      alt={`${details.HotelName} - Image ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 