import React from 'react';
import { X } from 'lucide-react';

export let toastTimeout;

const Toast = ({ message, type, subtitle, onClose, action, actionLabel }) => {
  if (!message) return null;
  const types = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    pipeline: 'bg-white text-gray-900 border-gray-200 shadow-xl',
    lost: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`fixed bottom-4 right-4 z-[9999] flex items-start p-4 rounded-xl border shadow-lg toast-slide-in ${types[type] || types.info}`}>
      <div className="flex-1 mr-3">
        <span className="font-medium block">{message}</span>
        {subtitle && <span className="text-xs opacity-70 mt-0.5 block">{subtitle}</span>}
      </div>
      {action && (
        <button onClick={() => { action(); onClose(); }}
          className="px-3 py-1 bg-[#C4A265] text-white text-xs rounded-lg font-medium mr-2 hover:bg-[#b89355] flex-shrink-0">
          {actionLabel || 'Ação'}
        </button>
      )}
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full flex-shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
};

export default Toast;
