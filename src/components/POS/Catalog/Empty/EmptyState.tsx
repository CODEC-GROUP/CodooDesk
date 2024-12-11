import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddProduct: () => void;
}

export default function EmptyState({ onAddProduct }: EmptyStateProps) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-10 w-10 text-primary" />
        </div>
        
        <h3 className="mt-4 text-lg font-semibold">No products available</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Start by adding products to your inventory. They will appear here for easy access during sales.
        </p>
        
        <div className="flex gap-2">
          <Link href="/products/lists">
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              Go to Products
            </Button>
          </Link>
          {/* <Button onClick={onAddProduct} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button> */}
        </div>
      </div>
    </div>
  );
}
