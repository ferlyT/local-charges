import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface rounded-xl border border-secondary/20 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-secondary/10">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            {isDestructive && <AlertTriangle size={20} className="text-rose-500" />}
            {title}
          </h2>
          <button 
            onClick={onCancel}
            className="p-1.5 text-secondary hover:text-primary hover:bg-neutral rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-primary/90 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="p-5 border-t border-secondary/10 bg-neutral/30 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary px-5 py-2"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] ${
              isDestructive 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                : 'btn-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
