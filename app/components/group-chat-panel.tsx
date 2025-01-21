"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { database } from "@/lib/firebase"
import { ref, push, onValue, off, get } from "firebase/database"
import { uniqueNamesGenerator, Config, adjectives, colors, animals } from 'unique-names-generator'

interface Message {
  id: string
  text: string
  sender: string
  timestamp: number
}

interface GroupChatPanelProps {
  groupId: string
  groupName: string
  onClose: () => void
}

const customConfig: Config = {
  dictionaries: [adjectives, colors, animals],
  separator: ' ',
  style: 'capital'
}

export function GroupChatPanel({ groupId, groupName, onClose }: GroupChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [width, setWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [userName, setUserName] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  // Generate or retrieve username
  useEffect(() => {
    const storedName = localStorage.getItem(`chat_username_${groupId}`)
    if (storedName) {
      setUserName(storedName)
    } else {
      const randomName = uniqueNamesGenerator(customConfig)
      localStorage.setItem(`chat_username_${groupId}`, randomName)
      setUserName(randomName)
    }
  }, [groupId])

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = Math.max(320, Math.min(800, e.clientX - (resizeRef.current?.getBoundingClientRect().left || 0)))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Load and subscribe to messages
  useEffect(() => {
    const messagesRef = ref(database, `chats/${groupId}/messages`)

    onValue(messagesRef, (snapshot) => {
      const messages: Message[] = []
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        })
      })
      setMessages(messages.sort((a, b) => a.timestamp - b.timestamp))

      // Scroll to bottom when new messages arrive
      if (scrollAreaRef.current) {
        setTimeout(() => {
          scrollAreaRef.current!.scrollTop = scrollAreaRef.current!.scrollHeight
        }, 0)
      }
    })

    return () => off(messagesRef)
  }, [groupId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messagesRef = ref(database, `chats/${groupId}/messages`)
    await push(messagesRef, {
      text: newMessage,
      sender: userName,
      timestamp: Date.now()
    })

    setNewMessage("")
  }

  return (
    <div
      className="border-l bg-background flex flex-col h-full relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-primary/10 group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 -translate-x-1/2 rounded flex items-center justify-center bg-background border shadow-sm opacity-0 group-hover:opacity-100">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{groupName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{groupName}</h3>
            <p className="text-xs text-muted-foreground">You are {userName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col max-w-[80%] ${message.sender === userName ? "ml-auto items-end" : ""}`}
            >
              <div
                className={`rounded-lg p-3 ${message.sender === userName
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                  }`}
              >
                <p className="text-sm font-medium mb-1">{message.sender}</p>
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
} 