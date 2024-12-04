'use client'

import { useState } from "react"
import { ProductList } from "@/components/Products/List/ProductList"
import { AddProduct } from "@/components/Products/Form/AddProduct"
import { DashboardLayout } from "@/components/Shared/Layout/DashboardLayout"
import type { ProductAttributes } from "@/models/Product"

export default function ProductsPage() {
  const [view, setView] = useState<"list" | "add" | "details">("list");
  const [selectedProduct, setSelectedProduct] = useState<ProductAttributes | null>(null);

  // Handle when a product is clicked
  const handleProductClick = (product: ProductAttributes) => {
    setView("details");
    setSelectedProduct(product);
  };

  // Handle adding a new product
  const handleAddProduct = () => {
    setView("add");
  };

  // Handle going back to the product list
  const handleBack = () => {
    setView("list");
    setSelectedProduct(null); // Reset selected product on back
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        {/* Render the product list */}
        {view === "list" && (
          <ProductList onProductClick={(product: ProductAttributes) => handleProductClick(product)} onAddProduct={handleAddProduct} />
        )}

        {/* Render the add product form */}
        {view === "add" && (
          <AddProduct onBack={handleBack} />
        )}

        {/* Conditionally render ProductDetails when it's implemented */}
        {view === "details" && selectedProduct && (
          <div>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description}</p>
            <p>{selectedProduct.purchasePrice}</p>
            {/* Add more details as needed */}
            <button onClick={handleBack}>Back to Products</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
