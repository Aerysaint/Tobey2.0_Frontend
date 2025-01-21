import { Settings, Home, Share2, Trash2, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/types"

interface HeaderProps {
  plan: Plan
  onUpdateBudget: (amount: number) => void
  onHome: () => void
  onShare: () => void
  onClearAllNodes: () => void
  onToggleGroupChats: () => void
}

export function Header({ plan, onUpdateBudget, onHome, onShare, onClearAllNodes, onToggleGroupChats }: HeaderProps) {
  const handleBudgetUpdate = () => {
    const newBudget = prompt("Enter new budget:", plan.budget.toString())
    if (newBudget) {
      const updatedBudget = Number(newBudget)
      if (!isNaN(updatedBudget)) {
        onUpdateBudget(updatedBudget)
      } else {
        alert("Please enter a valid number for the budget.")
      }
    }
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={onHome}>
          <Home className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{plan.title}</h1>
      </div>

      <div className="flex items-center space-x-2">
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

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>BUDGET</span>
          <span className="font-medium text-foreground">₹{plan.budget.toLocaleString()}</span>
          <Button variant="outline" size="sm" onClick={handleBudgetUpdate}>
            Update Budget
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>SPENT</span>
          <span className="font-medium text-foreground">₹{plan.spent.toLocaleString()}</span>
          <Button variant="ghost" size="icon" onClick={onClearAllNodes}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

