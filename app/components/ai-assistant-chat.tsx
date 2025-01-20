"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, Activity } from "@/types";
import { TypingAnimation } from "./typing-animation";
import sampleItinerary from "@/data/sample-itinerary.json";

interface Event {
  id: string;
  activityId: string;
  start: Date;
  end: Date;
}

interface AIAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, activities: Activity[], events: Event[]) => void;
}

export function AIAssistantChat({ isOpen, onClose, onCreateGroup }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize messages when the chat opens
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: "1",
          content: "Hello! I'm your AI travel assistant. What kind of trip are you planning?",
          sender: { id: "ai", name: "AI Assistant", role: "ai" },
          timestamp: new Date(),
        },
      ]);
      setShowInput(true);
    }
  }, [isOpen]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const simulateAIMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content,
          sender: { id: "ai", name: "AI Assistant", role: "ai" },
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: input,
        sender: { id: "user", name: "You", role: "customer" },
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Simulate AI response
      if (messages.length < 4) {
        simulateAIMessage("That sounds interesting! Can you tell me more about your preferences?");
      } else {
        simulateAIMessage(
          "Great! I think I have enough information to create a group for your trip. Let me set that up for you.",
        );
        setTimeout(() => {
          createGroupWithItinerary();
        }, 2000);
      }
    }
  };

  const createGroupWithItinerary = () => {
    setShowInput(false);

    // Get destination from chat context
    const destination = messages.find(m => m.sender.id === "user")?.content || "New Trip";
    const itinerary = sampleItinerary["Manali Adventure"]; // We'll use Manali as default for now

    const activities: Activity[] = itinerary.map((item) => ({
      id: item.activityId,
      title: item.title,
      location: item.location,
      description: item.description,
      duration: (new Date(item.end).getTime() - new Date(item.start).getTime()) / (1000 * 60 * 60),
      image: "/placeholder.svg?height=400&width=400",
      cost: item.cost,
    }));

    const events: Event[] = itinerary.map((item) => ({
      id: item.id,
      activityId: item.activityId,
      start: new Date(item.start),
      end: new Date(item.end),
    }));

    simulateAIMessage(
      `Perfect! I've created a personalized travel group for your ${destination} trip. You'll be redirected to your planner in a moment.`
    );

    // Wait for the message to be shown before creating group
    setTimeout(() => {
      onCreateGroup(destination, activities, events);
    }, 2000);
  };

  const handleClose = () => {
    setMessages([]);
    setShowInput(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed inset-4 z-50 flex flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">AI Travel Assistant</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.sender.role === "customer" ? "flex-row-reverse" : ""
                }`}
            >
              <Avatar className="h-8 w-8">
                {message.sender.role === "ai" ? (
                  <Bot className="h-5 w-5" />
                ) : (
                  <div className="h-full w-full rounded-full bg-primary" />
                )}
              </Avatar>
              <div
                className={`rounded-lg p-3 ${message.sender.role === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                  }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <Bot className="h-5 w-5" />
              </Avatar>
              <TypingAnimation />
            </div>
          )}
        </div>
      </ScrollArea>

      {showInput ? (
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t p-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </Card>
  );
}

