import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './button';

interface ErrorAlertProps {
  message: string;
  title?: string;
  retry?: () => void;
}

export function ErrorAlert({ message, title, retry }: ErrorAlertProps) {
  return (
    <div className="p-4 bg-red-50 text-red-700 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5" />
        <span className="font-semibold">{title || 'Error'}</span>
      </div>
      <p className="ml-7 mb-3">{message}</p>
      {retry && (
        <div className="ml-7">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retry}
            className="text-red-700 hover:text-red-800"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}