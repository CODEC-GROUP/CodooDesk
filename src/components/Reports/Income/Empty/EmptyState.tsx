import { DollarSign, PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/Shared/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export default function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <TrendingUp className="h-10 w-10 text-primary" />
        </div>
        
        <h3 className="mt-4 text-lg font-semibold">No Income Records</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Start tracking your business income. Record your sales and other revenue sources to generate comprehensive income reports.
        </p>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.location.href = '/pos'}>
            <DollarSign className="h-4 w-4" />
            Make a Sale
          </Button>
          <Button className="gap-2" onClick={onAddClick}>
            <PlusCircle className="h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>
    </div>
  );
}
