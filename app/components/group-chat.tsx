import { useState, useEffect, useRef } from "react"
import { Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { database } from "../../firebaseConfig"
import { ref, push, onValue, off } from "firebase/database"

interface Message {
  id: string
  text: string
  timestamp: number
}

interface GroupChatProps {
  groupId: string
  groupName: string
}

export function GroupChat({ groupId, groupName }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
      timestamp: Date.now()
    })

    setNewMessage("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Group Chat</h2>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex flex-col"
            >
              <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                <p>{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

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