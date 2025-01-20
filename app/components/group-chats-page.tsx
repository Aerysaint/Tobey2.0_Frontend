'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, ArrowLeft, Calendar } from 'lucide-react'
import { ChatWindow } from './chat-window'

interface Plan {
  participants: {id: string; name: string}[]
}

interface GroupChatsPageProps {
  groups: { id: string; name: string; plan: Plan }[]
  onBack: () => void
  onOpenCalendar: (groupId: string) => void
  onSelectGroup: (groupId: string) => void
}

export function GroupChatsPage({ groups, onBack, onOpenCalendar, onSelectGroup }: GroupChatsPageProps) {
  const [selectedChat, setSelectedChat] = useState<{ id: string; name: string } | null>(null)

  const handleChatSelect = (group: { id: string; name: string }) => {
    setSelectedChat(group)
    onSelectGroup(group.id)
  }

  const handleBackToChats = () => {
    setSelectedChat(null)
  }

  if (selectedChat) {
    return (
      <ChatWindow
        chat={selectedChat}
        onBack={handleBackToChats}
        onOpenCalendar={() => onOpenCalendar(selectedChat.id)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Group Chats</h1>
        <div className="w-8" /> {/* Spacer for alignment */}
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {groups.map((group) => (
            <Card key={group.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex items-center p-4">
                <div className="mr-4 cursor-pointer" onClick={() => handleChatSelect(group)}>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => handleChatSelect(group)}>
                  <h3 className="font-medium">{group.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {group.plan.participants.length} participants
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={() => onOpenCalendar(group.id)}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Input placeholder="Search chats..." />
      </div>
    </div>
  )
}

