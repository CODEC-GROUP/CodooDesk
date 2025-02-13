import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Column, ErrorAlert, Pagination } from "./components";

interface DataGridProps<T> {
  data: T[];
  columns: Column[];
  loading?: boolean;
  error?: Error;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
}

export function DataGrid<T>({ 
  data,
  columns,
  loading,
  error,
  onRowClick,
  pagination 
}: DataGridProps<T>) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error.message} />;

  return (
    <div className="w-full">
      <table className="min-w-full divide-y divide-gray-200">
        {/* Table implementation */}
      </table>
      {pagination && (
        <Pagination 
          page={pagination.currentPage}
          totalPages={Math.ceil(pagination.totalItems / pagination.pageSize)}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
} 