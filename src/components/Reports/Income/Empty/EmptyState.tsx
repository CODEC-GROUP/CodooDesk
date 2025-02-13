import { DollarSign, PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/Shared/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export default function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50">
      <div className="relative mb-8 group">
        <div className="w-24 h-24 rounded-full bg-green-50/50 flex items-center justify-center border-2 border-green-100">
          <TrendingUp className="w-12 h-12 text-green-600" />
          <DollarSign className="w-8 h-8 text-green-600 bg-green-100 p-1.5 rounded-full border-2 border-green-200 absolute -bottom-2 -right-2" />
        </div>
      </div>
      <h3 className="text-3xl font-semibold tracking-tight mb-3 text-gray-900">
        No Income Records
      </h3>
      <p className="text-muted-foreground mb-8 text-center max-w-md text-lg leading-relaxed">
        Start tracking your business income. Record your sales and revenue streams to generate detailed financial reports.
      </p>
      <Button 
        onClick={onAddClick}
        variant="default"
        size="lg"
        className="rounded-full px-8 py-6 text-lg gap-2 shadow-lg hover:shadow-md transition-shadow"
      >
        <PlusCircle className="w-6 h-6" />
        Add Income
      </Button>
    </div>
  );
}
