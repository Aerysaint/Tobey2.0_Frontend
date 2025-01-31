import { Settings, Home, Share2, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/types"
import { useState, useEffect } from "react"
import { toast, Toaster } from "sonner"
import { Input } from "@/components/ui/input"

interface HeaderProps {
  budget: number
  spent: number
  onUpdateBudget: (amount: number) => void
  onHome: () => void
  onShare: () => void
  onToggleGroupChats: () => void
}

export function Header({
  budget,
  spent,
  onUpdateBudget,
  onHome,
  onShare,
  onToggleGroupChats,
}: HeaderProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [tempBudget, setTempBudget] = useState(budget.toString())

  // Update tempBudget when budget prop changes
  useEffect(() => {
    setTempBudget(budget.toString());
  }, [budget]);

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newBudget = parseFloat(tempBudget)
    if (isNaN(newBudget) || newBudget < 0) {
      toast.error("Please enter a valid budget amount")
      return
    }
    onUpdateBudget(newBudget)
    setIsEditingBudget(false)
  }

  return (
    <header className="flex items-center border-b px-6 py-3">
      {/* Left section */}
      <div className="flex items-center space-x-4 w-1/3">
        <Button variant="ghost" size="icon" onClick={onHome}>
          <Home className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Plan Title</h1>
      </div>

      {/* Center section */}
      <div className="flex items-center justify-center space-x-2 w-1/3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleGroupChats}
          className="hover:bg-muted flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Group Chat
        </Button>
        <Button variant="ghost" size="icon" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Right section */}
      <div className="flex items-center justify-end w-1/3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Budget:</span>
            {isEditingBudget ? (
              <form onSubmit={handleBudgetSubmit} className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-24"
                  autoFocus
                  onBlur={() => setIsEditingBudget(false)}
                />
              </form>
            ) : (
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setIsEditingBudget(true)}
              >
                ₹{budget.toLocaleString()}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Spent:</span>
            <span className="text-sm">₹{spent.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Remaining:</span>
            <span className="text-sm">₹{(budget - spent).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

