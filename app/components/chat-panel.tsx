'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, Send, X, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plan } from '@/types'
import { TypingAnimation } from './typing-animation'

interface Activity {
  id: string;
  title: string;
  location: string;
  description: string;
  duration: number;
  image: string;
  cost: number;
}

interface ChatPanelProps {
  plan: Plan
  isOpen: boolean
  onToggle: () => void
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}

interface ChatMessage {
  role: string
  content: string
  name: string
}

export function ChatPanel({ plan, isOpen, onToggle, messages, setMessages }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [agentTyping, setAgentTyping] = useState('')
  const [waitingForSend, setWaitingForSend] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)

  const conversation: ChatMessage[] = [
    { role: 'user', name: 'John', content: "Hey, you're my travel agent for my manali trip. Looking forward to have a great session!" },
    { role: 'assistant', name: 'Travel Agent', content: "Hi John! Yes, I can see your preferences for the trip. I'll guide you through every step of the planning." },
    { role: 'user', name: 'John', content: "Thanks! I was thinking of a religious visit early in the morning. What do you think?" },
    { role: 'assistant', name: 'Travel Agent', content: "Sounds great, John! I'll add that to your itinerary. I've scheduled a visit to Hadimba Temple on the 5th at 10am." },
    { role: 'user2', name: 'Sarah', content: "Hey, I'm Sarah! I'm also part of the group going to this trip. I was thinking maybe we could move this visit at 9am so that we could have some time for something adventurous later on?" },
    { role: 'assistant', name: 'Travel Agent', content: "Yes! That's a great idea, Sarah. Check the list and tell me which activity you like the most for later?" },
    { role: 'user', name: 'John', content: "Solang Valley looks great! How about we do it at 10?" },
    { role: 'assistant', name: 'Travel Agent', content: "Sure, John! I've updated the itinerary. You'll visit Hadimba Temple at 9am and then head to Solang Valley at 10am for some adventure activities." },
  ]

  useEffect(() => {
    if (isOpen && !chatStarted) {
      setChatStarted(true)
      setCurrentStep(0)
    }
  }, [isOpen, chatStarted])

  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  useEffect(() => {
    if (chatStarted && currentStep < conversation.length) {
      const message = conversation[currentStep]
      if (message.role === 'assistant') {
        setIsTyping(true)
        const typingInterval = setInterval(() => {
          setAgentTyping(prev => {
            if (prev.length < message.content.length) {
              return message.content.slice(0, prev.length + 1)
            } else {
              clearInterval(typingInterval)
              setIsTyping(false)
              setWaitingForSend(true)
              return prev
            }
          })
        }, 50)
        return () => clearInterval(typingInterval)
      } else {
        const timer = setTimeout(() => {
          setLocalMessages(prev => [...prev, message])
          setCurrentStep(prev => prev + 1)
        }, Math.random() * 1000 + 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [chatStarted, currentStep])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [localMessages, isTyping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (waitingForSend) {
      setLocalMessages(prev => [...prev, { role: 'assistant', name: 'Travel Agent', content: agentTyping }])
      setAgentTyping('')
      setWaitingForSend(false)
      setCurrentStep(prev => prev + 1)
    } else if (input.trim()) {
      setLocalMessages(prev => [...prev, { role: 'user', name: 'You', content: input }])
      if (aiMode && input.toLowerCase().includes('adventurous activity')) {
        const aiRecommendation: Activity = {
          id: 'ai-rec-1',
          title: 'Solang Valley Adventure',
          location: 'Solang Valley',
          description: 'Solang Valley Adventure is perfect for your itinerary! It\'s near Hadimba Temple, fits within your budget, and offers thrilling activities. The 10 AM time slot is ideal for enjoying the pleasant weather and clear views. You can try paragliding, zip-lining, and more!',
          duration: 3,
          image: '/placeholder.svg?height=400&width=400',
          cost: 5000
        }
        onAIRecommendation(aiRecommendation)
        setAgentTyping("Great choice! I've added Solang Valley Adventure to your recommendations. It's perfect for an adventurous activity and complements your visit to Hadimba Temple. Would you like me to add it to your itinerary?")
        setWaitingForSend(true)
      }
      setInput('')
    }
  }

  if (!isOpen) return null

  return (
    <Card className="flex w-96 flex-col border-l">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">Group Chat</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiMode(!aiMode)}
          >
            {aiMode ? 'Normal Chat' : 'AI Chat'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {localMessages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${message.role === 'user' || message.role === 'user2' ? 'flex-row-reverse' : ''
                }`}
            >
              <Avatar className="h-8 w-8">
                {message.role === 'assistant' ? (
                  <Bot className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium mb-1">{message.name}</span>
                <div
                  className={`rounded-lg p-3 ${message.role === 'user' || message.role === 'user2'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                    }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <User className="h-5 w-5" />
              </Avatar>
              <TypingAnimation />
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder={waitingForSend ? "Click send to continue..." : "Type your message..."}
            value={waitingForSend ? agentTyping : input}
            onChange={(e) => {
              if (!waitingForSend) {
                setInput(e.target.value)
              }
            }}
            readOnly={waitingForSend}
          />
          <Button type="submit" size="icon" disabled={!waitingForSend && !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  )
}

function onAIRecommendation(aiRecommendation: Activity) {
  throw new Error('Function not implemented.');
}

