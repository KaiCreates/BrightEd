'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { DuoDialog } from './DuoDialog';

interface DialogOptions {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'alert' | 'confirm' | 'danger';
}

interface DialogContextType {
    showAlert: (message: string, options?: DialogOptions) => void;
    showConfirm: (message: string, onConfirm: () => void, options?: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<{
        message: string;
        title: string;
        type: 'alert' | 'confirm' | 'danger';
        onConfirm: () => void;
        confirmLabel: string;
        cancelLabel: string;
    }>({
        message: '',
        title: 'Notice',
        type: 'alert',
        onConfirm: () => { },
        confirmLabel: 'OK',
        cancelLabel: 'CANCEL',
    });

    const showAlert = useCallback((message: string, options?: DialogOptions) => {
        setConfig({
            message,
            title: options?.title || 'Heads Up!',
            type: options?.type || 'alert',
            onConfirm: () => setIsOpen(false),
            confirmLabel: options?.confirmLabel || 'GOT IT!',
            cancelLabel: '',
        });
        setIsOpen(true);
    }, []);

    const showConfirm = useCallback((message: string, onConfirm: () => void, options?: DialogOptions) => {
        setConfig({
            message,
            title: options?.title || 'Are you sure?',
            type: options?.type || 'confirm',
            onConfirm: () => {
                onConfirm();
                setIsOpen(false);
            },
            confirmLabel: options?.confirmLabel || 'CONFIRM',
            cancelLabel: options?.cancelLabel || 'CANCEL',
        });
        setIsOpen(true);
    }, []);

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <DuoDialog
                isOpen={isOpen}
                title={config.title}
                message={config.message}
                type={config.type}
                onConfirm={config.onConfirm}
                onCancel={() => setIsOpen(false)}
                confirmLabel={config.confirmLabel}
                cancelLabel={config.cancelLabel}
            />
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
