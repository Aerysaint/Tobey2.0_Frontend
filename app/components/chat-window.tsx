'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Calendar, Send } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: Date
}

interface ChatWindowProps {
  chat: {
    id: string
    name: string
  }
  onBack: () => void
  onOpenCalendar: () => void
}

export function ChatWindow({ chat, onBack, onOpenCalendar }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'John', content: 'Hey everyone, excited for our trip!', timestamp: new Date(Date.now() - 3600000) },
    { id: '2', sender: 'Sarah', content: 'Me too! Should we start planning the itinerary?', timestamp: new Date(Date.now() - 3000000) },
    { id: '3', sender: 'Mike', content: 'Definitely. I have some ideas for activities.', timestamp: new Date(Date.now() - 2400000) },
  ])
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        sender: 'You',
        content: newMessage,
        timestamp: new Date(),
      }
      setMessages([...messages, message])
      setNewMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{chat.name}</h1>
        <Button variant="ghost" size="icon" onClick={onOpenCalendar}>
          <Calendar className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <p className="font-medium">{message.sender}</p>
                <p>{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

