"use client";

import { ArrowRight, Loader2, LogOut, User, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
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
import api from '@/lib/axios';

// Featured destinations for the hero section
const featuredDestinations = [
  {
    image: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop",
    title: "Scenic Mountains"
  },
  {
    image: "https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?q=80&w=2006&auto=format&fit=crop",
    title: "Coastal Paradise"
  },
  {
    image: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?q=80&w=2070&auto=format&fit=crop",
    title: "Urban Adventure"
  }
];

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
      toast.error("Please enter a group ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get(`/joinGroup?groupId=${groupId.trim()}`);

      if (response.data.status === "Group does not exist") {
        toast.error("Group not found");
        return;
      }

      toast.success("Successfully joined group");
      router.push(`/planner?group=${groupId.trim()}`);
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatNow = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/createGroup");

      if (response.status !== 200) {
        throw new Error("Failed to create group");
      }

      const groupId = response.data.groupId;
      if (!groupId) {
        throw new Error("No group ID received");
      }

      router.push(`/chat?group=${groupId}`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to start chat session");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Search params changed:", {
      params: Object.fromEntries(searchParams.entries()),
      isAIChatOpen
    });
    if (searchParams.get("chat") === "ai") {
      console.log("Setting AI chat open from URL param");
      setIsAIChatOpen(true);
    } else {
      console.log("Setting AI chat closed from URL param");
      setIsAIChatOpen(false);
    }
  }, [searchParams]);

  const handleSignOut = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Sign out from backend first
      await api.get('/signOut');

      // Then sign out from Firebase
      await signOut(auth);

      // Redirect to login page
      router.push('/');
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
    <div className="min-h-screen relative">
      <div
        className="absolute inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: 'url("/hero-bg.png")' }}
      />

      <Toaster richColors position="top-center" />

      {/* Header with user profile */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold font-montserrat text-white">
            <span className="text-white">Tobey</span>
            <span className="text-[#FF7E5F]">.</span>
          </h1>

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

      {/* Hero Section */}
      <div className="relative pt-32 pb-12">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-6 text-transparent">
            Welcome back, {user?.displayName?.split(' ')[0]}!
          </h2>
          <p className="text-lg text-center text-transparent mb-12">
            Ready to plan your next adventure?
          </p>
        </div>
      </div>

      {/* Invisible spacer */}
      <div className="h-[6vh]" />

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative">
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-0 -translate-x-[calc(100%+2rem)] top-0 hidden xl:block">
            <RecentGroups />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF9F87]/10 to-[#FF7E5F]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#FF7E5F]" />
                  Join a Group
                </CardTitle>
                <CardDescription>
                  Enter the group code shared by your travel companions
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter group code"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                    className="border-gray-200 focus:border-[#FF7E5F] transition-colors"
                  />
                  <Button
                    onClick={handleJoinGroup}
                    disabled={isLoading || !groupId.trim()}
                    className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white"
                  >
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

            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF9F87]/10 to-[#FF7E5F]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#FF7E5F]" />
                  Create a New Group
                </CardTitle>
                <CardDescription>
                  Chat with our AI assistant to create a personalized travel plan
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button
                  onClick={handleChatNow}
                  className="w-full bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating group...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Chat Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
