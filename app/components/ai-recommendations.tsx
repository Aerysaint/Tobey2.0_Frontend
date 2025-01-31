import { Activity } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Clock } from 'lucide-react'

interface AIRecommendationsProps {
  recommendations: Activity[]
}

export function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h2 className="mb-2 text-sm font-semibold">AI RECOMMENDATIONS</h2>
      <div className="space-y-2">
        {recommendations.map((activity) => (
          <Card key={activity.id}>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">{activity.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {activity.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {activity.duration} hours
                </span>
                <span className="font-medium">${activity.price.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

