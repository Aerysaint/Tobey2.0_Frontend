"use client";

import { ArrowRight, Loader2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AIAssistantChat } from "../components/ai-assistant-chat";
import { groupsApi } from "@/services/groupsApi";
import { toast, Toaster } from "sonner";
import { RecentGroups } from "../components/recent-groups";
import { useAuth } from "@/app/contexts/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

  const handleJoinGroup = async () => {
    if (!groupId.trim() || !user) {
      toast.error("Please enter a group ID")
      return
    }

    setIsLoading(true)
    try {
      const group = await groupsApi.getGroup(groupId.trim())
      if (!group) {
        toast.error("Group not found")
        return
      }

      // Check if user is already a member
      if (group.members && group.members[user.uid]) {
        router.push(`/planner?group=${groupId}`)
        return
      }

      // Add user to group
      await groupsApi.joinGroup(groupId.trim(), user.uid, user.displayName || "Anonymous")
      toast.success("Successfully joined group")
      router.push(`/planner?group=${groupId}`)
    } catch (error) {
      console.error("Error joining group:", error)
      toast.error("Failed to join group")
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleSignOut = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // First, sign out from Firebase Auth
      await signOut(auth);

      // Then clear the session cookie
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sign out");
      }

      // First attempt normal navigation
      router.replace("/");

      // Set up a delayed reload as fallback
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster richColors position="top-center" />

      {/* Header with user profile */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Travel Planner</h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback>
                    {user.displayName ? user.displayName[0].toUpperCase() : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isLoading}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user.displayName}!</h2>
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-0 -translate-x-[calc(100%+2rem)] top-0 hidden xl:block">
            <RecentGroups />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle>Join a Group</CardTitle>
                <CardDescription>
                  Enter the group code shared by your travel companions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter group code"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                  />
                  <Button onClick={handleJoinGroup} disabled={isLoading || !groupId.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create a New Group</CardTitle>
                <CardDescription>
                  Chat with our AI assistant to create a personalized travel plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleChatNow} className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Chat Now
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-lg font-medium mb-4">How does it work?</h2>
            <div className="grid md:grid-cols-3 gap-8 text-muted-foreground">
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
      </main>

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
