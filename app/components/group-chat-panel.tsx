"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X, AtSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { useAuth } from "@/app/contexts/auth-context"
import api from '@/lib/axios'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import ReactMarkdown from 'react-markdown'

interface Message {
  user: string
  message: string
  timestamp: string
  pending?: boolean
  tempId?: string
}

interface GroupChatPanelProps {
  groupId: string
  groupName: string
  onClose: () => void
}

export function GroupChatPanel({ groupId, groupName, onClose }: GroupChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [width, setWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [showMentionPopup, setShowMentionPopup] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = window.innerWidth - e.clientX
      // Constrain width between 320px and 800px
      const constrainedWidth = Math.max(320, Math.min(800, newWidth))
      setWidth(constrainedWidth)
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

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Load and subscribe to messages from Firestore
  useEffect(() => {
    if (!groupId) return

    const messagesRef = collection(db, 'sessions', groupId, 'group chat')
    const messagesQuery = query(messagesRef, orderBy('__name__', 'asc'))

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        newMessages.push({
          user: data.user,
          message: data.message,
          timestamp: doc.id
        })
      })
      
      // Merge with pending messages, but remove any pending messages that have been confirmed
      setMessages(currentMessages => {
        const pendingMessages = currentMessages.filter(msg => {
          if (!msg.pending) return false
          // Keep pending message only if it hasn't appeared in Firestore yet
          return !newMessages.some(newMsg => 
            newMsg.user === msg.user && 
            newMsg.message === msg.message
          )
        })
        return [...newMessages, ...pendingMessages]
      })
    })

    return () => unsubscribe()
  }, [groupId])

  // Effect to handle scrolling whenever messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle input changes including @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    // Show mention popup if @ is typed and Tobey hasn't been mentioned yet
    if (value[cursorPos - 1] === '@' && !value.includes('@Tobey')) {
      setShowMentionPopup(true)
      setCursorPosition(cursorPos)
    } else if (!value.includes('@') || value[cursorPos - 1] === ' ') {
      setShowMentionPopup(false)
    }
    
    setNewMessage(value)
  }

  // Handle selecting Tobey mention
  const handleMention = () => {
    const beforeMention = newMessage.slice(0, cursorPosition - 1) // Remove the @
    const afterMention = newMessage.slice(cursorPosition)
    const updatedMessage = `${beforeMention}@Tobey${afterMention}`
    
    setNewMessage(updatedMessage)
    setShowMentionPopup(false)
    
    // Focus input and move cursor after the mention
    if (inputRef.current) {
      inputRef.current.focus()
      const newCursorPos = cursorPosition + 5 // "@Tobey" is 6 chars, but we removed 1 (@)
      setTimeout(() => {
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  // Handle key press for mention autocomplete and space
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionPopup) {
      if (e.key === 'Enter') {
        e.preventDefault() // Prevent form submission
        handleMention()
      } else if (e.key === ' ') {
        setShowMentionPopup(false)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (showMentionPopup) {
      return // Don't send if mention popup is open
    }
    if (!newMessage.trim() || !user) return

    const tempId = Date.now().toString()
    const optimisticMessage: Message = {
      user: user.displayName || 'Unknown User',
      message: newMessage,
      timestamp: new Date().toISOString(),
      pending: true,
      tempId
    }

    // Add optimistic message
    setMessages(current => [...current, optimisticMessage])
    setNewMessage("")

    try {
      await api.get('/addGroupMessage', {
        params: {
          groupid: groupId,
          message: newMessage
        }
      })
    } catch (error) {
      console.error("Error sending message:", error)
      // Remove the failed message
      setMessages(current => current.filter(msg => msg.tempId !== tempId))
    }
  }

  return (
    <div
      className="border-l bg-background flex flex-col h-full relative"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-primary/10 z-50"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{groupName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{groupName}</h3>
            <p className="text-xs text-muted-foreground">Group Chat</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.tempId || message.timestamp}
              className={`flex flex-col ${message.user === user?.displayName ? "ml-auto items-end" : ""}`}
            >
              <div
                className={`rounded-lg p-3 max-w-[600px] ${
                  message.user === user?.displayName
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                } ${message.pending ? "opacity-70" : ""}`}
              >
                <p className="text-sm font-medium mb-1">{message.user}</p>
                <div className="text-sm break-words">
                  <ReactMarkdown
                    className="prose prose-sm dark:prose-invert"
                    components={{
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
                      ol: ({children}) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
                      li: ({children}) => <li className="mb-1">{children}</li>,
                      h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-md font-bold mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                      code: ({children}) => (
                        <code className="bg-muted-foreground/20 rounded px-1 py-0.5 overflow-x-auto">
                          {children}
                        </code>
                      ),
                      pre: ({children}) => (
                        <pre className="bg-muted-foreground/20 rounded p-2 mb-2 overflow-x-auto whitespace-pre">
                          {children}
                        </pre>
                      ),
                      a: ({href, children}) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.message}
                  </ReactMarkdown>
                </div>
                {message.pending && (
                  <p className="text-xs opacity-70 mt-1">Sending...</p>
                )}
              </div>
            </div>
          ))}
          {/* Add invisible div at the bottom for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input with Mention Popup */}
      <form onSubmit={handleSendMessage} className="p-4 border-t relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            />
            {showMentionPopup && (
              <div className="absolute bottom-full mb-2 left-0 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full hover:bg-muted p-2 rounded-md"
                  onClick={handleMention}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      <AtSign className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Tobey (AI Assistant)</span>
                </button>
              </div>
            )}
          </div>
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
} 