'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/Shared/ui/alert-dialog"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  cancelText?: string
  confirmText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  cancelText = "Cancel",
  confirmText = "Confirm",
  variant = 'default',
  isLoading = false
}: ConfirmationDialogProps) {
  const getConfirmButtonClasses = () => {
    if (variant === 'destructive') {
      return 'bg-red-600 hover:bg-red-700 text-white';
    }
    return 'bg-primary hover:bg-primary/90';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={getConfirmButtonClasses()}
            disabled={isLoading}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 