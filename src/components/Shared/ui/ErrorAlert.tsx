import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md">
      <AlertCircle className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );
} 