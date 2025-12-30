import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-2xl',
    lg: 'sm:max-w-4xl',
    xl: 'sm:max-w-6xl',
  };

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal container - handles scroll for desktop */}
      <div className="fixed inset-0 flex sm:items-center sm:justify-center sm:p-4 overflow-hidden">
        {/* Modal - full screen on mobile, centered on desktop */}
        <div className={`
          relative bg-white shadow-2xl w-full flex flex-col
          h-full sm:h-auto sm:max-h-[90vh]
          sm:rounded-2xl ${sizes[size]}
          animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300
        `}>
          {/* Header - fixed at top */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate pr-4">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-xl transition-colors flex-shrink-0 border-2 border-transparent hover:border-red-200"
              title="Chiudi"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content - only this scrolls */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirm Dialog Modal for delete confirmations
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Conferma",
  message = "Sei sicuro di voler procedere?",
  confirmText = "Conferma",
  cancelText = "Annulla",
  variant = "danger" // "danger" | "warning" | "info"
}) => {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: "🗑️",
      confirmClass: "bg-red-600 hover:bg-red-700 text-white",
      iconBg: "bg-red-100",
    },
    warning: {
      icon: "⚠️",
      confirmClass: "bg-orange-600 hover:bg-orange-700 text-white",
      iconBg: "bg-orange-100",
    },
    info: {
      icon: "ℹ️",
      confirmClass: "bg-primary-600 hover:bg-primary-700 text-white",
      iconBg: "bg-primary-100",
    },
  };

  const v = variants[variant] || variants.info;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${v.iconBg} flex items-center justify-center`}>
              <span className="text-4xl">{v.icon}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-base text-gray-600 mb-6">{message}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-base"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-colors text-base ${v.confirmClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
