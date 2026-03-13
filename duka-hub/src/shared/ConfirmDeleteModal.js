import React from 'react';
import { RiDeleteBin6Line } from 'react-icons/ri';

const ConfirmDeleteModal = ({
  open,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={() => (loading ? null : onCancel?.())}
      />
      <div className="relative w-[94vw] max-w-[540px] bg-white rounded-[38px] border border-gray-200 shadow-2xl overflow-hidden">
        <div className="p-10 text-center">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <span className="absolute -top-1 left-6 text-red-300 text-sm animate-pulse">+</span>
            <span className="absolute top-5 -left-1 text-red-300 text-sm animate-pulse">+</span>
            <span className="absolute top-2 right-0 text-red-300 text-sm animate-pulse">+</span>
            <span className="absolute top-8 right-4 text-red-300 text-sm animate-pulse">+</span>
            <RiDeleteBin6Line className="text-red-600 animate-bounce" size={62} />
          </div>

          <div className="mt-6 text-xl font-extrabold text-gray-900">{title || 'Delete?'}</div>
          <div className="mt-2 text-sm text-gray-600">
            {description || 'This will be permanently deleted and cannot be recovered.'}
          </div>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => onCancel?.()}
              className={loading ? 'h-12 rounded-2xl border-2 border-red-200 text-red-400 font-semibold cursor-not-allowed' : 'h-12 rounded-2xl border-2 border-red-400 text-red-600 font-semibold hover:bg-red-50'}
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm?.()}
              className={loading ? 'h-12 rounded-2xl bg-red-600/70 text-white font-semibold flex items-center justify-center gap-2 cursor-not-allowed' : 'h-12 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 flex items-center justify-center gap-2'}
            >
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" /> : null}
              {loading ? 'Deleting...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;

