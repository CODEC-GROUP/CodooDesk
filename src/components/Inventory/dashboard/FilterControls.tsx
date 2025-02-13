import React from 'react';
import { Select } from '@/components/Shared/ui/select';

interface FilterControlsProps {
  filters: {
    dateRange: string;
    category: string;
    status: string;
  };
  onFilterChange: (filters: any) => void;
}

export function FilterControls({ filters, onFilterChange }: FilterControlsProps) {
  return (
    <div className="flex gap-4">
      <select 
        value={filters.dateRange}
        onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
        className="border rounded p-2"
      >
        <option value="7days">Last 7 Days</option>
        <option value="30days">Last 30 Days</option>
        <option value="90days">Last 90 Days</option>
      </select>
      
      <select 
        value={filters.category}
        onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
        className="border rounded p-2"
      >
        <option value="all">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="home">Home</option>
      </select>

      <select 
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        className="border rounded p-2"
      >
        <option value="all">All Status</option>
        <option value="in-stock">In Stock</option>
        <option value="low-stock">Low Stock</option>
        <option value="out-of-stock">Out of Stock</option>
      </select>
    </div>
  );
} 