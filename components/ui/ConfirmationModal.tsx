
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './card';
import { Button } from './button';
import { AlertCircle, Loader2 } from '../Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  isProcessing?: boolean;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isProcessing = false, 
  confirmText = 'Confirm', 
  variant = 'default' 
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const isDestructive = variant === 'destructive';
  const buttonClass = isDestructive 
    ? 'bg-red-600 hover:bg-red-700 text-white' 
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const iconContainerClass = isDestructive ? 'bg-red-100' : 'bg-yellow-100';
  const iconClass = isDestructive ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
        <Card className="shadow-2xl border-none animate-in fade-in-0 zoom-in-95">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${iconContainerClass} flex items-center justify-center flex-shrink-0`}>
              <AlertCircle className={`w-6 h-6 ${iconClass}`} />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{message}</p>
          </CardContent>
          <CardFooter className="bg-slate-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="button"
              className={buttonClass}
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};