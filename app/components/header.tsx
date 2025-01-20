import { Settings, Home, Share2, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/types"

interface HeaderProps {
  plan: Plan
  onUpdateBudget: (amount: number) => void
  onHome: () => void
  onShare: () => void
  onClearAllNodes: () => void
}

export function Header({ plan, onUpdateBudget, onHome, onShare, onClearAllNodes }: HeaderProps) {
  const agent = plan.participants.find((p) => p.role === "agent")

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
        <h1 className="text-xl font-semibold">{plan.title}</h1>
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
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {agent && (
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={agent.avatar} />
              <AvatarFallback>{agent.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{agent.name}</p>
              <p className="text-xs text-muted-foreground">Travel Agent</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onHome}>
          <Home className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShare}>
          <Share2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClearAllNodes}>
          <Trash2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}

