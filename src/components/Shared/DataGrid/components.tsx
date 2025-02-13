import React from 'react';

export interface Column {
  field: string;
  headerName: string;
  width?: number;
  renderCell?: (value: any) => React.ReactNode;
}

export function LoadingSpinner() {
  return <div className="animate-spin">Loading...</div>;
}

export function ErrorAlert({ message }: { message: string }) {
  return <div className="text-red-500">{message}</div>;
}

export function Pagination({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>{page} of {totalPages}</span>
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
} 