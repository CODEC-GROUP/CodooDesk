import { ProductAttributes } from "@/models/Product";

export interface Product extends ProductAttributes {
  id: string;  // Make id required instead of optional
  category?: {
    id: string;
    name: string;
  };
  shop?: {
    id: string;
    name: string;
  };
}
