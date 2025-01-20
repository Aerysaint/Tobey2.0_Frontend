"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AIAssistantChat } from "./components/ai-assistant-chat";
import { groupsApi } from "./services/groupsApi";
import { toast, Toaster } from "sonner";

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [groupId, setGroupId] = useState("");

  const handleJoinGroup = async () => {
    if (groupId.trim()) {
      const group = await groupsApi.getGroup(groupId.trim());
      if (group) {
        router.push(`/planner?group=${groupId}`);
      } else {
        toast.error("Group Not Found", {
          description: "Please check the group ID and try again.",
        });
      }
    } else {
      toast.error("Invalid Input", {
        description: "Please enter a group ID",
      });
    }
  };

  const handleChatNow = () => {
    setIsAIChatOpen(true);
    router.push("/planner?chat=ai");
  };

  useEffect(() => {
    if (searchParams.get("chat") === "ai") {
      setIsAIChatOpen(true);
    } else {
      setIsAIChatOpen(false);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      <Toaster richColors position="top-center" />
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Travel Planner</h1>
            <span className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-md">BETA</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Plan your perfect trip with AI-powered recommendations and real-time collaboration
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Join a Group</CardTitle>
              <CardDescription>
                Enter a group ID to join an existing trip plan and collaborate with others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter group ID..."
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinGroup();
                    }
                  }}
                />
                <Button onClick={handleJoinGroup}>
                  Join
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Ask AI Assistant</CardTitle>
              <CardDescription>
                Get personalized travel recommendations and create your perfect itinerary with AI assistance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full sm:w-auto" size="lg" onClick={handleChatNow}>
                Chat now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-lg font-medium mb-4">How does it work?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">1. Join a group</h3>
              <p>Enter the group ID shared by your travel companions.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">2. Get AI recommendations</h3>
              <p>Receive personalized suggestions for activities, accommodations, and more.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">3. Plan and collaborate</h3>
              <p>Fine-tune your itinerary and share it with your travel companions.</p>
            </div>
          </div>
        </div>
      </div>

      <AIAssistantChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        onCreateGroup={(groupName, activities, events) => {
          router.push("/planner?chat=ai");
        }}
      />
    </div>
  );
}

