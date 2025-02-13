import { Receipt, PlusCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/Shared/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export default function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-red-50/50 flex items-center justify-center border-2 border-red-100">
          <TrendingDown className="w-12 h-12 text-red-600" />
          <Receipt className="w-8 h-8 text-red-600 bg-red-100 p-1.5 rounded-full border-2 border-red-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        No Expense Records
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        Track business expenditures. Monitor purchases and bills to maintain clear financial oversight and generate expense reports.
      </p>
      <Button 
        onClick={onAddClick}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        <PlusCircle className="w-6 h-6" />
        Add Expense
      </Button>
    </div>
  );
}
