
import React, { useState, useCallback } from 'react';
import { ConfirmationModal as ModalComponent } from '../components/ui/ConfirmationModal';

type ConfirmationOptions = {
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
};

type ConfirmationState = ConfirmationOptions & {
  isOpen: boolean;
  proceed: ((value: boolean | PromiseLike<boolean>) => void) | null;
};

const initialState: ConfirmationState = {
  isOpen: false,
  title: '',
  message: '',
  proceed: null,
  confirmText: 'Confirm',
  variant: 'default'
};

export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>(initialState);

  const prompt = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        proceed: resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.proceed?.(true);
    setState(initialState);
  }, [state]);

  const handleClose = useCallback(() => {
    state.proceed?.(false);
    setState(initialState);
  }, [state]);

  const ConfirmationModal = ({ isProcessing }: { isProcessing?: boolean }) => (
    React.createElement(ModalComponent, {
      isOpen: state.isOpen,
      onClose: handleClose,
      onConfirm: handleConfirm,
      title: state.title,
      message: state.message,
      isProcessing: isProcessing,
      confirmText: state.confirmText,
      variant: state.variant,
    })
  );

  return { prompt, ConfirmationModal };
};