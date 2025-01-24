"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { database } from "@/lib/firebase"
import { ref, push, onValue, off, get } from "firebase/database"
import { useAuth } from "@/app/contexts/auth-context"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Message {
  id: string
  text: string
  sender: {
    id: string
    name: string
  }
  mentions?: string[] // Array of user IDs that were mentioned
  timestamp: number
}

interface GroupMember {
  displayName: string
  joinedAt: number
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
  const [members, setMembers] = useState<Record<string, GroupMember>>({})
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  // Load group members
  useEffect(() => {
    const membersRef = ref(database, `groups/${groupId}/members`)
    onValue(membersRef, (snapshot) => {
      if (snapshot.exists()) {
        setMembers(snapshot.val())
      }
    })
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

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart || 0
    setNewMessage(value)
    setCursorPosition(position)

    // Check if we should show mentions
    const lastAtSymbol = value.lastIndexOf('@', position)
    if (lastAtSymbol !== -1) {
      const nextSpace = value.indexOf(' ', lastAtSymbol)
      const searchEnd = nextSpace === -1 ? value.length : nextSpace
      const search = value.slice(lastAtSymbol + 1, searchEnd)

      if (position > lastAtSymbol) {
        setMentionSearch(search)
        setShowMentions(true)
        return
      }
    }

    setShowMentions(false)
  }

  const handleMentionSelect = (userId: string, displayName: string) => {
    const firstName = getFirstName(displayName);
    const lastAtSymbol = newMessage.lastIndexOf('@', cursorPosition)
    if (lastAtSymbol === -1) return

    const nextSpace = newMessage.indexOf(' ', lastAtSymbol)
    const beforeMention = newMessage.slice(0, lastAtSymbol)
    const afterMention = nextSpace === -1 ? '' : newMessage.slice(nextSpace)

    const newValue = `${beforeMention}@${firstName}${afterMention}`
    setNewMessage(newValue)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    // Extract mentions from message
    const mentions: string[] = []
    const mentionRegex = /@([a-zA-Z0-9_]+)/g
    let match
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      const mentionedName = match[1]
      const mentionedUserId = Object.entries(members).find(
        ([_, member]) => getFirstName(member.displayName) === mentionedName
      )?.[0]
      if (mentionedUserId) {
        mentions.push(mentionedUserId)
      }
    }

    const messagesRef = ref(database, `chats/${groupId}/messages`)
    await push(messagesRef, {
      text: newMessage,
      sender: {
        id: user.uid,
        name: getFirstName(user.displayName || "Anonymous")
      },
      mentions,
      timestamp: Date.now()
    })

    setNewMessage("")
  }

  const formatMessageText = (text: string) => {
    return text.split(' ').map((word, i) => {
      if (word.startsWith('@')) {
        // Extract the username without the @ symbol
        const mentionedName = word.slice(1);
        // Check if this mention corresponds to a valid user
        const isValidMention = Object.values(members).some(
          member => getFirstName(member.displayName) === mentionedName
        );

        return isValidMention ? (
          <span key={i} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded px-1">
            {word}
          </span>
        ) : (
          word + ' '
        );
      }
      return word + ' ';
    });
  };

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
            <p className="text-xs text-muted-foreground">Group Chat</p>
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
              className={`flex flex-col max-w-[80%] ${message.sender.id === user?.uid ? "ml-auto items-end" : ""}`}
            >
              <div
                className={`rounded-lg p-3 ${message.sender.id === user?.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                  }`}
              >
                <p className="text-sm font-medium mb-1">{message.sender.name}</p>
                <p className="text-sm">{formatMessageText(message.text)}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type a message... (Use @ to mention)"
              value={newMessage}
              onChange={handleInputChange}
            />
            {showMentions && (
              <div className="absolute bottom-full mb-1 w-full bg-popover border rounded-md shadow-md">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {Object.entries(members)
                        .filter(([_, member]) =>
                          getFirstName(member.displayName).toLowerCase().includes(mentionSearch.toLowerCase())
                        )
                        .map(([userId, member]) => (
                          <CommandItem
                            key={userId}
                            onSelect={() => handleMentionSelect(userId, member.displayName)}
                          >
                            {getFirstName(member.displayName)}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
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