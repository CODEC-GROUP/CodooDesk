import { Receipt, PlusCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/Shared/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export default function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <TrendingDown className="h-10 w-10 text-primary" />
        </div>
        
        <h3 className="mt-4 text-lg font-semibold">No Expense Records</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Start tracking your business expenses. Record purchases, bills, and other costs to monitor your spending and generate expense reports.
        </p>
        
        <div className="flex gap-2">
          <Button className="gap-2" onClick={onAddClick}>
            <PlusCircle className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>
    </div>
  );
}
