import React, { useEffect } from "react";

export default function LockedDialog({ open, reason, until, onClose }) {
  // Hook luôn được gọi — chỉ gắn listener khi open=true để tránh lỗi hooks
  useEffect(() => {
    if (!open) return; // chỉ chạy khi mở
    const fn = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* lớp mờ nền */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* hộp thông báo */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-red-700">
              ⚠️ Tài khoản bị khóa
            </h2>
            <button
              className="px-2 py-1 rounded hover:bg-gray-100"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-2">
            <p className="text-sm text-gray-700">
              {reason || "Tài khoản của bạn hiện đang bị khóa."}
            </p>
            {until && (
              <p className="text-xs text-gray-600">
                Mở khóa dự kiến: <b>{until}</b>
              </p>
            )}
          </div>

          <div className="p-5 border-t flex justify-end">
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              onClick={onClose}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
