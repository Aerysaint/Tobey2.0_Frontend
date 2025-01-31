"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, ArrowLeft, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types";
import { TypingAnimation } from "@/app/components/typing-animation";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/auth-context";
import { toast } from "sonner";
import api from '@/lib/axios';
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showInput, setShowInput] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState("Loading...");
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const groupId = searchParams.get('group');

    // Auto-scroll to the latest message
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
                if (scrollContainer) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }
            }
        }, 100);
    };

    // Subscribe to messages from Firestore
    useEffect(() => {
        if (!groupId) {
            toast.error("No group ID provided");
            router.push('/home');
            return;
        }

        const sessionDoc = doc(db, 'sessions', groupId);
        const messagesCollection = collection(sessionDoc, 'first chat');
        
        const unsubscribe = onSnapshot(messagesCollection, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    content: data.parts[0].text,
                    sender: { 
                        id: data.role === 'model' ? 'ai' : 'user',
                        name: data.role === 'model' ? 'AI Assistant' : 'You',
                        role: data.role === 'model' ? 'ai' : 'customer'
                    }
                } as ChatMessage;
            });
            
            setMessages(newMessages);
            setIsTyping(false);
            scrollToBottom();
            setTimeout(() => {
                setIsLoading(false);
            }, 500);
        });

        return () => unsubscribe();
    }, [groupId, router]);

    // Update typing animation based on last message
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            setIsTyping(lastMessage.sender.role === 'customer');
        }
    }, [messages]);

    // Add new effect to fetch status
    useEffect(() => {
        if (!groupId) return;

        const sessionDoc = doc(db, 'sessions', groupId);
        const unsubscribe = onSnapshot(sessionDoc, (doc) => {
            if (doc.exists()) {
                const status = doc.data().status || "Loading...";
                setLoadingStatus('Loading...');
                
                // Redirect if status is not "Loading conversation..."
                if (status !== "Chatting") {
                    setLoadingStatus('Chat finished sending to planner...');
                    router.push(`/planner?group=${groupId}`);
                }
            }
        });

        return () => unsubscribe();
    }, [groupId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !groupId) return;

        const tempMessage: ChatMessage = {
            id: Date.now().toString(),
            content: input.trim(),
            sender: { 
                id: 'user',
                name: 'You',
                role: 'customer'
            }
        };

        setInput("");
        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();

        try {
            const encodedMessage = encodeURIComponent(input.trim());
            const response = await api.get(
                `/addInitialMessage?sessionid=${groupId}&message=${encodedMessage}`
            );

            if (response.status !== 200) {
                throw new Error("Failed to send message");
            }

            // Trigger AI response
            const aiResponse = await api.get(
                `/updateNextInitial?sessionid=${groupId}`
            );
            if (aiResponse.status !== 200) {
                throw new Error("Failed to trigger AI response");
            }
            if (aiResponse.data.status === 'chat finished') {
                setLoadingStatus('Chat finished sending to planner...');
                router.push(`/planner?group=${groupId}`);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            toast.error("Failed to send message");
            setIsTyping(false);
        }
    };

    // Modified loading state
    if (isLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{loadingStatus}</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b p-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/home')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold">AI Travel Assistant</h2>
                </div>
            </div>

            {/* Scrollable Message Area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
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
                                    {message.sender.role === "ai" ? (
                                        <ReactMarkdown 
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            components={{
                                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({children}) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
                                                ol: ({children}) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
                                                li: ({children}) => <li className="mb-1">{children}</li>,
                                                h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                h2: ({children}) => <h2 className="text-md font-bold mb-2">{children}</h2>,
                                                h3: ({children}) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                                                code: ({children}) => (
                                                    <code className="bg-muted-foreground/20 rounded px-1 py-0.5">{children}</code>
                                                ),
                                                pre: ({children}) => (
                                                    <pre className="bg-muted-foreground/20 rounded p-2 mb-2 overflow-x-auto">
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
                                            {message.content}
                                        </ReactMarkdown>
                                    ) : (
                                        message.content
                                    )}
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
            </div>

            {/* Fixed Input Area */}
            {showInput ? (
                <form onSubmit={handleSubmit} className="border-t p-4 shrink-0">
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
                <div className="border-t p-4 flex justify-center items-center shrink-0">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    );
} 